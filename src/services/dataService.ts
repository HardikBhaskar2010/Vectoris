/**
 * dataService.ts — Unified reactive data layer and service boundary.
 *
 * Provides a clean seam between the UI and backend/local engine capabilities.
 * Persists modifications to Supabase when authenticated, with local cache & fallback.
 * Notifies subscribers of state changes.
 */

import { useState, useEffect } from "react";
import type {
  Project,
  ProjectSector,
  ProjectDocument,
  TakeoffRunSummary,
  LineItem,
  LineItemStatus,
  ChatSession,
  ChatMessage,
  Sheet,
  LayerDef,
  Detection,
  EngineStatusInfo,
  DocumentFormat,
  ProjectPlan,
  PlanVersion,
  DecisionResolution,
  CorrectionRecord,
  EvidenceData,
} from "../data/types";
import { generateId } from "./idService";
import { INITIAL_PROJECTS } from "../data/mockProjects";
import { INITIAL_DOCUMENTS } from "../data/mockDocuments";
import { INITIAL_SESSIONS } from "../data/mockSessions";
import { INITIAL_PROJECT_PLANS } from "../data/mockProjectPlan";
import {
  INITIAL_TAKEOFF_SUMMARY,
  INITIAL_LINE_ITEMS,
  INITIAL_SHEETS,
  INITIAL_LAYERS,
  INITIAL_DETECTIONS,
} from "../data/mockTakeoff";
import { INITIAL_ENGINE_STATUS } from "../data/mockEngine";
import { projectService } from "./projectService";
import { organizationService } from "./organizationService";
import { documentService } from "./documentService";
import { takeoffService } from "./takeoffService";
import { sessionService } from "./sessionService";
import { projectPlanService, type CreateDraftParams } from "./projectPlanService";
import { agentRuntime } from "../ai/runtime/agentRuntime";
import { authService } from "./authService";
import { isSupabaseConfigured } from "./supabaseClient";
import { documentProcessingService } from "./documentProcessingService";
import { offlineSyncService, isNetworkOfflineError } from "./offlineSyncService";
import { fileDialogService, type DocumentSource, type SelectedFileMetadata } from "./fileDialogService";

const STORAGE_KEY_PREFIX = "vectoris.store.v1.";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Storage load error for", key, err);
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.warn("Storage save error for", key, err);
  }
}

class DataService {
  private projects: Project[];
  private documents: ProjectDocument[];
  private sessions: ChatSession[];
  private takeoffSummaries: Record<string, TakeoffRunSummary>;
  private lineItems: LineItem[];
  private sheets: Sheet[];
  private layers: LayerDef[];
  private detections: Record<string, Detection[]>;
  private engineStatus: EngineStatusInfo;
  private projectPlans: Record<string, ProjectPlan>;
  private listeners: Set<() => void> = new Set();
  private isSyncing = false;

  constructor() {
    this.projects = loadFromStorage<Project[]>("projects", INITIAL_PROJECTS);
    this.documents = loadFromStorage<ProjectDocument[]>("documents", INITIAL_DOCUMENTS);
    this.sessions = loadFromStorage<ChatSession[]>("sessions", INITIAL_SESSIONS);
    this.projectPlans = loadFromStorage<Record<string, ProjectPlan>>(
      "projectPlans",
      INITIAL_PROJECT_PLANS
    );
    this.takeoffSummaries = loadFromStorage<Record<string, TakeoffRunSummary>>(
      "takeoffSummaries",
      INITIAL_TAKEOFF_SUMMARY
    );
    this.lineItems = loadFromStorage<LineItem[]>("lineItems", INITIAL_LINE_ITEMS);
    this.sheets = loadFromStorage<Sheet[]>("sheets", INITIAL_SHEETS);
    this.layers = loadFromStorage<LayerDef[]>("layers", INITIAL_LAYERS);
    this.detections = loadFromStorage<Record<string, Detection[]>>("detections", INITIAL_DETECTIONS);
    this.engineStatus = loadFromStorage<EngineStatusInfo>("engineStatus", INITIAL_ENGINE_STATUS);

    if (typeof window !== "undefined") {
      (window as any).dataService = this;
    }

    this.initAuthSync();
    this.initOfflineSync();
  }

  private initOfflineSync(): void {
    offlineSyncService.registerExecutor("line_item_status", async (mut) => {
      const { lineItemId, status, reason, humanValue, correctionType } = mut.payload as {
        lineItemId: string;
        status: LineItemStatus;
        reason?: string;
        humanValue?: string;
        correctionType?: any;
      };
      if (isSupabaseConfigured() && lineItemId && !lineItemId.startsWith("li-mock") && !lineItemId.startsWith("li-")) {
        if (status === "approved") {
          const item = this.lineItems.find((i) => i.id === lineItemId);
          await takeoffService.approveLineItem({
            lineItemId,
            humanValue: humanValue || (item ? String(item.quantity) : "1"),
            correctionType: correctionType || "manual_override",
            reason,
          });
        } else if (status === "rejected") {
          await takeoffService.rejectLineItem({
            lineItemId,
            correctionType: correctionType || "false_positive",
            reason: reason || "Rejected in takeoff review",
          });
        }
      }
      return true;
    });

    offlineSyncService.registerExecutor("manual_line_item", async (mut) => {
      const { action, projectId, documents, lineItem, item } = mut.payload as any;
      if (action === "create_documents" && documents && projectId) {
        if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
          await documentService.createDocuments(projectId, documents);
        }
        return true;
      }
      const targetItem = lineItem || item;
      if (targetItem && projectId) {
        if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
          await takeoffService.createManualLineItem({
            projectId,
            name: targetItem.name,
            itemCode: targetItem.itemCode || targetItem.item_code,
            category: targetItem.category,
            quantity: targetItem.quantity || 1,
            unit: targetItem.unit || "NOS",
          });
        }
        return true;
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_type", async (mut) => {
      const { projectId, displayType, provenance } = mut.payload as any;
      if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
        await projectService.updateProjectType({ projectId, displayType, provenance });
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_plan_draft", async (mut) => {
      const { projectId, documentIds, claims, lineage } = mut.payload as any;
      if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
        await projectPlanService.createDraft({ projectId, documentIds, claims, lineage });
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_plan_accept", async (mut) => {
      const { draftVersionId, resolutions } = mut.payload as any;
      if (isSupabaseConfigured() && draftVersionId && !draftVersionId.startsWith("ppv-")) {
        await projectPlanService.acceptDraft(draftVersionId, resolutions);
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_plan_reject", async (mut) => {
      const { draftVersionId, reason } = mut.payload as any;
      if (isSupabaseConfigured() && draftVersionId && !draftVersionId.startsWith("ppv-")) {
        await projectPlanService.rejectDraft(draftVersionId, reason);
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_create", async (mut) => {
      const { tempId, payload } = mut.payload as any;
      if (isSupabaseConfigured()) {
        let activeOrgId = organizationService.getActiveOrganizationId();
        if (!activeOrgId) {
          const orgs = await organizationService.getUserOrganizations();
          if (orgs.length > 0) {
            activeOrgId = orgs[0].id;
          }
        }
        if (activeOrgId) {
          const remote = await projectService.createProject({
            organizationId: activeOrgId,
            ...payload,
          });
          this.swapTempProjectId(tempId, remote);
        }
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_update", async (mut) => {
      const { projectId, patch } = mut.payload as any;
      if (isSupabaseConfigured() && projectId && !projectId.startsWith("p-")) {
        await projectService.updateProject(projectId, patch);
      }
      return true;
    });

    offlineSyncService.registerExecutor("project_delete", async (mut) => {
      const { projectId } = mut.payload as any;
      if (isSupabaseConfigured() && projectId && !projectId.startsWith("p-")) {
        await projectService.softDeleteProject(projectId);
      }
      return true;
    });

    offlineSyncService.registerExecutor("proposal_status", async (mut) => {
      const { sessionId, messageId, status, user, reason, role } = mut.payload as any;
      if (sessionId && messageId) {
        if (status === "approved") {
          await this.approveProposal({
            sessionId,
            messageId,
            userId: user,
            userRole: role || "Editor",
            reason,
          });
        } else if (status === "rejected") {
          await this.rejectProposal({
            sessionId,
            messageId,
            userId: user,
            userRole: role || "Editor",
            reason,
          });
        }
      }
      return true;
    });
  }

  private initAuthSync(): void {
    if (!isSupabaseConfigured()) return;

    // Initial check
    authService.getSession().then((session) => {
      if (session?.user) {
        this.refreshFromSupabase();
      }
    });

    // Listen for auth state changes
    authService.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (session?.user) {
          this.refreshFromSupabase();
        }
      } else if (event === "SIGNED_OUT") {
        // Reset projects to local store cache
        this.projects = loadFromStorage<Project[]>("projects", INITIAL_PROJECTS);
        this.notify();
      }
    });
  }

  /**
   * Refreshes project and organization records from Supabase for the current user.
   */
  public async refreshFromSupabase(): Promise<void> {
    if (this.isSyncing || !isSupabaseConfigured()) return;
    this.isSyncing = true;

    try {
      let activeOrgId = organizationService.getActiveOrganizationId();

      // If no active org stored, find user's orgs
      if (!activeOrgId) {
        const orgs = await organizationService.getUserOrganizations();
        if (orgs.length > 0) {
          activeOrgId = orgs[0].id;
          organizationService.setActiveOrganizationId(activeOrgId);
        } else {
          // User has no organization yet - create a default one
          try {
            activeOrgId = await organizationService.createOrganization("Personal Workspace");
          } catch (createOrgErr) {
            console.warn("Could not auto-create default org:", createOrgErr);
          }
        }
      }

      if (activeOrgId) {
        const remoteProjects = await projectService.getProjects(activeOrgId);
        this.projects = remoteProjects || [];
        saveToStorage("projects", this.projects);

        // Fetch documents and line items for each active project
        const allRemoteDocs: ProjectDocument[] = [];
        const allRemoteLineItems: LineItem[] = [];

        for (const proj of this.projects) {
          const docs = await documentService.getDocuments(proj.id);
          allRemoteDocs.push(...docs);

          const items = await takeoffService.getLineItems(proj.id);
          allRemoteLineItems.push(...items);

          const summary = await takeoffService.getTakeoff(proj.id);
          if (summary) {
            this.takeoffSummaries[proj.id] = summary;
          }
        }

        // Preserve local unsynced documents and line items alongside remote items
        const remoteDocIds = new Set(allRemoteDocs.map((d) => d.id));
        const localUnsyncedDocs = this.documents.filter((d) => !remoteDocIds.has(d.id));
        this.documents = [...allRemoteDocs, ...localUnsyncedDocs];
        saveToStorage("documents", this.documents);

        const remoteLineItemIds = new Set(allRemoteLineItems.map((li) => li.id));
        const localUnsyncedItems = this.lineItems.filter((li) => !remoteLineItemIds.has(li.id));
        this.lineItems = [...allRemoteLineItems, ...localUnsyncedItems];
        saveToStorage("lineItems", this.lineItems);
        saveToStorage("takeoffSummaries", this.takeoffSummaries);

        // Fetch investigation sessions
        const remoteSessions = (await sessionService.getSessions()) || [];
        const remoteSessionIds = new Set(remoteSessions.map((s) => s.id));
        const localUnsyncedSessions = this.sessions.filter((s) => !remoteSessionIds.has(s.id));
        this.sessions = [...remoteSessions, ...localUnsyncedSessions];
        if (this.sessions.length === 0) {
          this.sessions = INITIAL_SESSIONS;
        }
        saveToStorage("sessions", this.sessions);

        this.notify();
      }
    } catch (err) {
      console.warn("Failed to refresh data from Supabase:", err);
    } finally {
      this.isSyncing = false;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("DataService listener error:", err);
      }
    });
  }

  // ── Projects ────────────────────────────────────────────────────────────────

  public getProjects(): Project[] {
    return [...this.projects];
  }

  public getProject(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id) || this.projects[0];
  }

  private removeProjectLocally(projectId: string, targetId: string): void {
    this.projects = this.projects.filter((p) => p.id !== projectId && p.id !== targetId);
    this.documents = this.documents.filter((d) => d.project_id !== projectId && d.project_id !== targetId);
    this.lineItems = this.lineItems.filter((li) => li.project_id !== projectId && li.project_id !== targetId);
    this.sheets = this.sheets.filter((s) => s.project_id !== projectId && s.project_id !== targetId);
    delete this.takeoffSummaries[projectId];
    delete this.takeoffSummaries[targetId];
    delete this.projectPlans[projectId];
    delete this.projectPlans[targetId];

    saveToStorage("projects", this.projects);
    saveToStorage("documents", this.documents);
    saveToStorage("lineItems", this.lineItems);
    saveToStorage("sheets", this.sheets);
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    saveToStorage("projectPlans", this.projectPlans);
    this.notify();
  }

  private swapTempProjectId(tempId: string, remote: Project): void {
    const idx = this.projects.findIndex((p) => p.id === tempId);
    if (idx !== -1) {
      this.projects[idx] = { ...remote, is_synced: true, sync_status: "synced" };
    } else {
      this.projects.unshift({ ...remote, is_synced: true, sync_status: "synced" });
    }

    // Cascade ID change to documents and line items
    this.documents.forEach((d) => {
      if (d.project_id === tempId) d.project_id = remote.id;
    });
    this.lineItems.forEach((li) => {
      if (li.project_id === tempId) li.project_id = remote.id;
    });
    this.sheets.forEach((s) => {
      if (s.project_id === tempId) s.project_id = remote.id;
    });
    if (this.takeoffSummaries[tempId]) {
      this.takeoffSummaries[remote.id] = this.takeoffSummaries[tempId];
      delete this.takeoffSummaries[tempId];
    }
    if (this.projectPlans[tempId]) {
      this.projectPlans[remote.id] = this.projectPlans[tempId];
      delete this.projectPlans[tempId];
    }

    saveToStorage("projects", this.projects);
    saveToStorage("documents", this.documents);
    saveToStorage("lineItems", this.lineItems);
    saveToStorage("sheets", this.sheets);
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    saveToStorage("projectPlans", this.projectPlans);
    this.notify();
  }

  public createProject(
    data: {
      name: string;
      description?: string;
      client?: string;
      sector?: ProjectSector;
      discipline?: string;
    },
    options?: { isSynced?: boolean; syncStatus?: "synced" | "offline_queued" | "error" }
  ): Project {
    const id = generateId("p");
    const isSynced = options?.isSynced ?? (!isSupabaseConfigured());
    const syncStatus = options?.syncStatus ?? (isSynced ? "synced" : "offline_queued");

    const newProject: Project = {
      id,
      name: data.name,
      client: data.client || "Self / Internal",
      description: data.description || "",
      sector: data.sector || "commercial",
      discipline: data.discipline || "General",
      inferred_type: null,
      user_provided_type: data.sector || null,
      verified_type: null,
      displayType: data.sector ? `${data.sector} · ${data.discipline || "General"}` : "Unclassified",
      typeProvenance: data.sector ? "user_provided" : "ai_inferred",
      status: "processing",
      progress: 0,
      sheets: 0,
      sheetType: "PDF",
      created_at: new Date().toISOString().split("T")[0],
      updated_at: "Just now",
      member_count: 1,
      members: [{ name: "Current User", initials: "CU", role: "Owner", avatarColor: "#2d4a6e" }],
      is_synced: isSynced,
      sync_status: syncStatus,
    };

    this.projects.unshift(newProject);
    saveToStorage("projects", this.projects);
    this.notify();

    // Background persistence only if configured, online, and not already queued explicitly
    if (isSupabaseConfigured() && isSynced && offlineSyncService.isOnline()) {
      this.persistProjectToSupabase(newProject, data);
    }

    return newProject;
  }

  public async createProjectAsync(data: {
    name: string;
    description?: string;
    client?: string;
    sector?: ProjectSector;
    discipline?: string;
  }): Promise<Project> {
    if (!isSupabaseConfigured()) {
      return this.createProject(data, { isSynced: true, syncStatus: "synced" });
    }

    // If workstation is offline, enqueue mutation and create local draft marked not synced
    if (!offlineSyncService.isOnline()) {
      const offlineProj = this.createProject(data, { isSynced: false, syncStatus: "offline_queued" });
      offlineSyncService.enqueue("project_create", {
        tempId: offlineProj.id,
        payload: data,
      });
      return offlineProj;
    }

    try {
      let activeOrgId = organizationService.getActiveOrganizationId();
      if (!activeOrgId) {
        const orgs = await organizationService.getUserOrganizations();
        if (orgs.length > 0) {
          activeOrgId = orgs[0].id;
          organizationService.setActiveOrganizationId(activeOrgId);
        } else {
          activeOrgId = await organizationService.createOrganization("Personal Workspace");
        }
      }

      if (!activeOrgId) {
        throw new Error("No active organization found to create project in Supabase");
      }

      const remoteProj = await projectService.createProject({
        organizationId: activeOrgId,
        name: data.name,
        description: data.description,
        client: data.client,
        sector: data.sector,
        discipline: data.discipline,
      });

      // REMOTE_SUCCESS
      const syncedProj: Project = { ...remoteProj, is_synced: true, sync_status: "synced" };
      this.projects.unshift(syncedProj);
      saveToStorage("projects", this.projects);
      this.notify();
      return syncedProj;
    } catch (err: any) {
      if (isNetworkOfflineError(err)) {
        // OFFLINE_QUEUED
        console.warn("Network unreachable, enqueuing offline project creation:", err);
        const offlineProj = this.createProject(data, { isSynced: false, syncStatus: "offline_queued" });
        offlineSyncService.enqueue("project_create", {
          tempId: offlineProj.id,
          payload: data,
        });
        return offlineProj;
      }

      // REMOTE_FAILURE: Surface explicit error without fake local fallback
      console.error("Supabase project creation failed with remote error:", err);
      throw new Error(err?.message || "Failed to create project in remote database");
    }
  }

  public async createProjectRemote(data: {
    name: string;
    description?: string;
    client?: string;
    sector?: ProjectSector;
    discipline?: string;
  }): Promise<Project> {
    return this.createProjectAsync(data);
  }

  private async persistProjectToSupabase(
    tempProject: Project,
    data: {
      name: string;
      description?: string;
      client?: string;
      sector?: ProjectSector;
      discipline?: string;
    }
  ): Promise<void> {
    try {
      let activeOrgId = organizationService.getActiveOrganizationId();
      if (!activeOrgId) {
        const orgs = await organizationService.getUserOrganizations();
        if (orgs.length > 0) {
          activeOrgId = orgs[0].id;
          organizationService.setActiveOrganizationId(activeOrgId);
        } else {
          activeOrgId = await organizationService.createOrganization("Personal Workspace");
        }
      }

      if (!activeOrgId) return;

      const remote = await projectService.createProject({
        organizationId: activeOrgId,
        name: data.name,
        description: data.description,
        client: data.client,
        sector: data.sector,
        discipline: data.discipline,
      });

      this.swapTempProjectId(tempProject.id, remote);
    } catch (err) {
      console.warn("Background project persistence to Supabase failed:", err);
    }
  }

  public async deleteProject(projectId: string): Promise<void> {
    const targetId = this.resolveProjectId(projectId);
    const isRemote =
      isSupabaseConfigured() &&
      !projectId.startsWith("p-") &&
      !projectId.startsWith("p1") &&
      !projectId.startsWith("p2");

    if (isRemote) {
      if (!offlineSyncService.isOnline()) {
        offlineSyncService.enqueue("project_delete", { projectId });
        this.removeProjectLocally(projectId, targetId);
        return;
      }

      try {
        await projectService.softDeleteProject(projectId);
        this.removeProjectLocally(projectId, targetId);
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          offlineSyncService.enqueue("project_delete", { projectId });
          this.removeProjectLocally(projectId, targetId);
          return;
        }
        console.error("Supabase project deletion failed with remote error:", err);
        throw new Error(err?.message || "Failed to delete project on remote database");
      }
    } else {
      this.removeProjectLocally(projectId, targetId);
    }
  }

  public seedSampleProject(): Project {
    const sample: Project = {
      id: generateId("p-sample"),
      name: "TITAN HYPERSCALE DATA CENTER — CAMPUS 4",
      client: "Titan Cloud Technologies · DC Engineering",
      description: "80MW Critical IT Load, 415V/240V Busway Distribution, N+1 Redundant UPS Systems, and Hot-Aisle Containment.",
      sector: "data-center",
      discipline: "Electrical HV & Infrastructure",
      inferred_type: "Data Center Infrastructure",
      user_provided_type: "Data Center Infrastructure",
      verified_type: "Data Center Infrastructure",
      displayType: "Data Center Infrastructure · Electrical HV",
      typeProvenance: "verified",
      status: "review",
      sheets: 14,
      sheetType: "DWG / PDF",
      progress: 68,
      created_at: new Date().toISOString().split("T")[0],
      updated_at: "Just now",
      member_count: 3,
      members: [
        { name: "Lead Estimator", initials: "LE", role: "Owner", avatarColor: "#2d4a6e" },
        { name: "Senior Electrical PE", initials: "SP", role: "Editor", avatarColor: "#3d5a3e" },
        { name: "BIM Coordinator", initials: "BC", role: "Viewer", avatarColor: "#4d3d5a" },
      ],
    };

    const sampleItems: LineItem[] = [
      {
        id: generateId("li-s"),
        project_id: sample.id,
        item_code: "SWG-415V-01",
        name: "Main Low Voltage Switchboard 4000A 415V Form 4b",
        description: "Main electrical distribution switchboard for Hyperscale Data Center Campus 4",
        specification: "IEC 61439-2 Form 4b Type 7 with ACB & Motorized Incomers",
        category: "Power Distribution",
        quantity: 4,
        unit: "SET",
        source_document_id: "doc-sample-1",
        source_document_name: "Titan_DataCenter_Electrical_Package.pdf",
        source_sheet: "E-101_Main_SLD.dwg",
        status: "approved",
        detection_source: "ai_detection",
        reviewed_by: "Lead Estimator",
        reviewed_at: "Earlier today",
      },
      {
        id: generateId("li-s"),
        project_id: sample.id,
        item_code: "UPS-500KVA",
        name: "Modular Online Double Conversion UPS 500kVA / 500kW",
        description: "High-efficiency double conversion UPS topology with LiFePO4 battery modules",
        specification: "High efficiency 97% double conversion with LiFePO4 battery cabinet",
        category: "Power Distribution",
        quantity: 6,
        unit: "NOS",
        source_document_id: "doc-sample-1",
        source_document_name: "Titan_DataCenter_Electrical_Package.pdf",
        source_sheet: "E-102_UPS_Topology.dwg",
        status: "proposed",
        detection_source: "ai_detection",
      },
      {
        id: generateId("li-s"),
        project_id: sample.id,
        item_code: "TR-LGT-2X4",
        name: "Cleanroom LED Troffer 2x4 50W IP54 Dimmable",
        description: "50W IP54 sealed recessed LED troffer for Server Data Hall B",
        specification: "5000K CCT 0-10V DALI 2.0 addressable with battery backup unit",
        category: "Lighting",
        quantity: 148,
        unit: "NOS",
        source_document_id: "doc-sample-1",
        source_document_name: "Titan_DataCenter_Electrical_Package.pdf",
        source_sheet: "E-201_DataHall_Lighting.dwg",
        status: "proposed",
        detection_source: "ai_detection",
      },
      {
        id: generateId("li-s"),
        project_id: sample.id,
        item_code: "CT-HDG-600",
        name: "Heavy Duty Cable Ladder 600mm x 100mm HDG",
        description: "Overhead cable management containment for primary power feeders",
        specification: "Hot dip galvanized BS EN ISO 1461 with trapeze hangers every 1.5m",
        category: "Cable Tray",
        quantity: 320,
        unit: "MTR",
        source_document_id: "doc-sample-1",
        source_document_name: "Titan_DataCenter_Electrical_Package.pdf",
        source_sheet: "E-301_CableRoute_Overhead.dwg",
        status: "proposed",
        detection_source: "ai_detection",
      },
    ];

    const sampleSheets: Sheet[] = [
      {
        id: generateId("sh-s"),
        project_id: sample.id,
        sheet_id: "E-101",
        name: "Main Low Voltage Single Line Diagram",
        type: "single_line",
        detection_count: 4,
        document_name: "E-101_Main_SLD.dwg",
        is_empty: false,
        scale: "N.T.S",
        discipline: "Electrical",
        revision: "Rev 2",
      },
      {
        id: generateId("sh-s"),
        project_id: sample.id,
        sheet_id: "E-201",
        name: "Data Hall B Lighting & Fixture Layout",
        type: "floor_plan",
        detection_count: 148,
        document_name: "E-201_DataHall_Lighting.dwg",
        is_empty: false,
        scale: "1:100",
        discipline: "Electrical",
        revision: "Rev 1",
      },
    ];

    const sampleDocs: ProjectDocument[] = [
      {
        id: generateId("doc-s"),
        project_id: sample.id,
        filename: "Titan_DataCenter_Electrical_Package.pdf",
        format: "PDF",
        size_mb: 28.4,
        sheet_count: 14,
        upload_status: "complete",
        uploaded_by: "Lead Estimator",
        uploaded_at: "Just now",
        file_path: "/drawings/Titan_DataCenter_Electrical_Package.pdf",
      },
    ];

    this.projects.unshift(sample);
    this.lineItems.push(...sampleItems);
    this.sheets.push(...sampleSheets);
    this.documents.push(...sampleDocs);

    this.takeoffSummaries[sample.id] = {
      id: generateId("tos"),
      project_id: sample.id,
      status: "complete",
      sheets_processed: 14,
      sheets_total: 14,
      line_items_proposed: 3,
      line_items_approved: 1,
      started_at: "Just now",
      completed_at: "Just now",
      model_version: "v2.4-perception",
    };

    saveToStorage("projects", this.projects);
    saveToStorage("lineItems", this.lineItems);
    saveToStorage("sheets", this.sheets);
    saveToStorage("documents", this.documents);
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    this.notify();

    return sample;
  }

  public async updateProjectType(
    projectId: string,
    displayType: string,
    provenance: "ai_inferred" | "user_provided" | "verified"
  ): Promise<void> {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    const prevVerified = project.verified_type;
    const prevUserProvided = project.user_provided_type;
    const prevInferred = project.inferred_type;
    const prevDisplay = project.displayType;
    const prevProvenance = project.typeProvenance;

    if (provenance === "verified") {
      project.verified_type = displayType;
    } else if (provenance === "user_provided") {
      project.user_provided_type = displayType;
    } else {
      project.inferred_type = displayType;
    }
    project.displayType = displayType;
    project.typeProvenance = provenance;
    project.updated_at = "Just now";

    saveToStorage("projects", this.projects);
    this.notify();

    // Async sync to Supabase with honest error recovery
    if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
      if (!offlineSyncService.isOnline()) {
        offlineSyncService.enqueue("project_type", { projectId, displayType, provenance });
        return;
      }

      try {
        await projectService.updateProjectType({ projectId, displayType, provenance });
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          offlineSyncService.enqueue("project_type", { projectId, displayType, provenance });
        } else {
          // Rollback local state on remote error
          project.verified_type = prevVerified;
          project.user_provided_type = prevUserProvided;
          project.inferred_type = prevInferred;
          project.displayType = prevDisplay;
          project.typeProvenance = prevProvenance;
          saveToStorage("projects", this.projects);
          this.notify();
          throw new Error(err?.message || "Failed to update project type");
        }
      }
    }
  }

  public async updateProject(
    projectId: string,
    patch: {
      name?: string;
      description?: string;
      client?: string;
      sector?: ProjectSector;
      discipline?: string;
    }
  ): Promise<Project> {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (patch.name !== undefined) project.name = patch.name;
    if (patch.description !== undefined) project.description = patch.description;
    if (patch.client !== undefined) project.client = patch.client;
    if (patch.sector !== undefined) {
      project.sector = patch.sector;
      project.user_provided_type = patch.sector;
      project.displayType = `${patch.sector} · ${patch.discipline || project.discipline || "General"}`;
    }
    if (patch.discipline !== undefined) project.discipline = patch.discipline;
    project.updated_at = "Just now";

    saveToStorage("projects", this.projects);
    this.notify();

    if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
      if (!offlineSyncService.isOnline()) {
        offlineSyncService.enqueue("project_update", { projectId, patch });
        return project;
      }

      try {
        const remote = await projectService.updateProject(projectId, patch);
        const idx = this.projects.findIndex((p) => p.id === projectId);
        if (idx !== -1) {
          this.projects[idx] = { ...remote, is_synced: true, sync_status: "synced" };
          saveToStorage("projects", this.projects);
          this.notify();
        }
        return this.projects[idx] || project;
      } catch (err: any) {
        if (isNetworkOfflineError(err)) {
          offlineSyncService.enqueue("project_update", { projectId, patch });
          return project;
        }
        throw new Error(err?.message || "Failed to update project in remote database");
      }
    }

    return project;
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  private resolveProjectId(projectId: string): string {
    if (projectId === "p1") return "33333333-3333-3333-3333-333333333333";
    if (projectId === "p2") return "44444444-4444-4444-4444-444444444444";
    return projectId;
  }

  public getDocuments(projectId: string): ProjectDocument[] {
    const targetId = this.resolveProjectId(projectId);
    return this.documents.filter((d) => d.project_id === projectId || d.project_id === targetId);
  }

  public getAllDocuments(): ProjectDocument[] {
    return [...this.documents];
  }

  /**
   * Adds real or selected documents into the project.
   * State is explicitly set to honest 'queued' (Awaiting processing) state.
   */
  public addDocuments(
    projectId: string,
    files: Array<{
      id?: string;
      filename: string;
      format: DocumentFormat;
      size_mb: number;
      uploaded_by?: string;
      file_path?: string;
      storage_reference?: string;
      source?: DocumentSource;
      raw_bytes?: Uint8Array;
    }>
  ): ProjectDocument[] {
    const newDocs: ProjectDocument[] = files.map((f) => {
      const docId = f.id || generateId("d");
      return {
        id: docId,
        project_id: projectId,
        filename: f.filename,
        format: f.format,
        size_mb: Number(f.size_mb.toFixed(2)),
        upload_status: "queued", // Honest state: Queued awaiting engine processing
        sheet_count: null,
        uploaded_by: f.uploaded_by || "Project Engineer",
        uploaded_at: "Just now",
        file_path: f.file_path,
        storage_reference: f.storage_reference || `projects/${projectId}/documents/${docId}/${f.filename}`,
      };
    });

    this.documents = [...newDocs, ...this.documents];
    saveToStorage("documents", this.documents);

    // Update project updated_at
    const proj = this.projects.find((p) => p.id === projectId);
    if (proj) {
      proj.updated_at = "Just now";
      saveToStorage("projects", this.projects);
    }

    this.notify();

    // Trigger real local-first document extraction, classification, and perception pipeline
    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      const origFile = files[i];

      (async () => {
        let bytes: Uint8Array | undefined = origFile.raw_bytes;
        if (!bytes && origFile.source) {
          try {
            bytes = await fileDialogService.readDocumentBytes(origFile.source);
          } catch (readErr) {
            console.warn(`Could not read source bytes for ${doc.filename}:`, readErr);
          }
        }
        await this.processDocumentAsync(projectId, doc.id, bytes);
      })().catch((err) =>
        console.warn("Document processing pipeline failed:", err)
      );
    }

    // Async sync to Supabase if configured
    if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
      documentService
        .createDocuments(
          projectId,
          newDocs.map((d) => ({
            id: d.id,
            filename: d.filename,
            format: d.format,
            size_mb: d.size_mb,
            file_path: d.file_path,
            storage_reference: d.storage_reference,
          }))
        )
        .then((remoteDocs) => {
          if (remoteDocs && remoteDocs.length > 0) {
            for (const r of remoteDocs) {
              const idx = this.documents.findIndex(
                (d) => d.id === r.id || (d.filename === r.filename && d.project_id === projectId)
              );
              if (idx !== -1) {
                this.documents[idx] = { ...this.documents[idx], ...r };
              }
            }
            saveToStorage("documents", this.documents);
            this.notify();
          }
        })
        .catch((err) => {
          console.warn("Supabase document persistence failed, queuing for offline replay:", err);
          offlineSyncService.enqueue("manual_line_item", {
            action: "create_documents",
            projectId,
            documents: newDocs,
          });
        });
    }

    return newDocs;
  }

  private documentByteCache = new Map<string, Uint8Array>();

  public cacheDocumentBytes(documentId: string, bytes: Uint8Array): void {
    this.documentByteCache.set(documentId, bytes);
  }

  public async retryDocumentProcessing(projectId: string, documentId: string): Promise<void> {
    const doc = this.documents.find((d) => d.id === documentId);
    if (!doc) return;

    doc.upload_status = "queued";
    doc.error_message = undefined;
    saveToStorage("documents", this.documents);
    this.notify();

    const cached = this.documentByteCache.get(documentId);
    await this.processDocumentAsync(projectId, documentId, cached);
  }

  /**
   * Executes the genuine local-first page extraction, sheet classification,
   * symbol perception, and takeoff derivation pipeline for a document.
   */
  public async processDocumentAsync(
    projectId: string,
    documentId: string,
    fileData?: ArrayBuffer | Uint8Array
  ): Promise<void> {
    const doc = this.documents.find((d) => d.id === documentId);
    if (!doc) return;

    let bytes = fileData;
    if (bytes instanceof Uint8Array) {
      this.cacheDocumentBytes(documentId, bytes);
    } else if (bytes instanceof ArrayBuffer) {
      this.cacheDocumentBytes(documentId, new Uint8Array(bytes));
    }

    if (!bytes && doc.file_path) {
      try {
        bytes = await fileDialogService.readDocumentBytes({
          type: "staged_doc",
          projectId,
          documentId: doc.id,
          filename: doc.filename,
        });
        if (bytes instanceof Uint8Array) {
          this.cacheDocumentBytes(documentId, bytes);
        }
      } catch (readErr) {
        console.warn(`Could not read staged bytes for document [${doc.filename}]:`, readErr);
      }
    }

    if (!bytes || (bytes instanceof Uint8Array ? bytes.length : bytes.byteLength) === 0) {
      doc.upload_status = "error";
      doc.error_message = "0-byte file: Drawing package contains no readable binary data.";
      saveToStorage("documents", this.documents);
      this.notify();
      console.warn(`Document processing aborted: 0 bytes available for [${doc.filename}]. Zero fabricated records created.`);
      return;
    }

    try {
      doc.error_message = undefined;
      const result = await documentProcessingService.processDocument(
        projectId,
        doc,
        bytes,
        (stage) => {
          doc.upload_status = stage;
          saveToStorage("documents", this.documents);
          this.notify();
        }
      );

      // Add newly derived sheets (avoiding duplicates)
      const existingSheetIds = new Set(this.sheets.map((s) => s.sheet_id));
      const freshSheets = result.sheets.filter((s) => !existingSheetIds.has(s.sheet_id));
      this.sheets = [...this.sheets, ...freshSheets];
      saveToStorage("sheets", this.sheets);

      // Add newly derived detections
      for (const sheet of result.sheets) {
        const sheetDets = result.detections.filter((d) => d.sheet_id === sheet.id);
        this.detections[sheet.id] = sheetDets;
        this.detections[sheet.sheet_id] = sheetDets;
      }
      saveToStorage("detections", this.detections);

      // Add newly derived line items
      this.lineItems = [...this.lineItems, ...result.lineItems];
      saveToStorage("lineItems", this.lineItems);

      // Update document metadata
      doc.sheet_count = result.pageCount;
      doc.upload_status = "complete";
      saveToStorage("documents", this.documents);

      // Update project takeoff summary
      const currentTakeoff = this.getTakeoff(projectId);
      const projSheets = this.getSheets(projectId);
      const projLineItems = this.getLineItems(projectId);

      this.takeoffSummaries[projectId] = {
        id: currentTakeoff?.id || generateId("tos"),
        project_id: projectId,
        status: "complete",
        sheets_processed: projSheets.length,
        sheets_total: projSheets.length,
        line_items_proposed: projLineItems.filter((i) => i.status === "proposed").length,
        line_items_approved: projLineItems.filter((i) => i.status === "approved").length,
        started_at: currentTakeoff?.started_at || "Just now",
        completed_at: "Just now",
        model_version: "v2.4-perception",
      };
      saveToStorage("takeoffSummaries", this.takeoffSummaries);

      this.notify();
    } catch (err: any) {
      console.warn(`Error processing document ${documentId}:`, err);
      doc.upload_status = "error";
      doc.error_message = err?.message || "Vectoris perception engine encountered an error while parsing drawing streams.";
      saveToStorage("documents", this.documents);
      this.notify();
    }
  }

  public removeDocument(docId: string): void {
    const doc = this.documents.find((d) => d.id === docId);
    this.documents = this.documents.filter((d) => d.id !== docId);
    if (doc) {
      this.sheets = this.sheets.filter((s) => s.document_name !== doc.filename || s.project_id !== doc.project_id);
      saveToStorage("sheets", this.sheets);
    }
    saveToStorage("documents", this.documents);
    this.notify();

    // Async soft-delete on Supabase if configured
    if (isSupabaseConfigured() && !docId.startsWith("d-")) {
      documentService
        .softDeleteDocument(docId)
        .catch((err) => console.warn("Supabase document soft-delete failed:", err));
    }
  }

  // ── Takeoff & Line Items ─────────────────────────────────────────────────────

  public getTakeoff(projectId: string): TakeoffRunSummary {
    const targetId = this.resolveProjectId(projectId);
    return (
      this.takeoffSummaries[projectId] ||
      this.takeoffSummaries[targetId] || {
        id: `tr-${projectId}`,
        project_id: projectId,
        status: "pending",
        sheets_processed: 0,
        sheets_total: 0,
        line_items_proposed: 0,
        line_items_approved: 0,
        started_at: "Not started",
        completed_at: null,
        model_version: "v2.4-native",
      }
    );
  }

  public updateTakeoffSummary(projectId: string, patch: Partial<TakeoffRunSummary>): void {
    const current = this.getTakeoff(projectId);
    this.takeoffSummaries[projectId] = { ...current, ...patch };
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    this.notify();
  }

  public getLineItems(projectId: string): LineItem[] {
    const targetId = this.resolveProjectId(projectId);
    return this.lineItems.filter((li) => li.project_id === projectId || li.project_id === targetId);
  }

  public getAllLineItems(): LineItem[] {
    return [...this.lineItems];
  }

  public addLineItem(
    projectId: string,
    item: Omit<LineItem, "id" | "project_id">
  ): LineItem {
    const newLineItem: LineItem = {
      ...item,
      id: generateId("li"),
      project_id: projectId,
    };
    this.lineItems.push(newLineItem);
    saveToStorage("lineItems", this.lineItems);

    const summary = this.takeoffSummaries[projectId];
    if (summary) {
      summary.line_items_proposed = this.lineItems.filter(
        (li) => li.project_id === projectId
      ).length;
      saveToStorage("takeoffSummaries", this.takeoffSummaries);
    }

    this.notify();

    // Async sync to Supabase if configured
    if (isSupabaseConfigured() && !projectId.startsWith("p-")) {
      takeoffService
        .createManualLineItem({
          projectId,
          name: item.name,
          itemCode: item.item_code,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
        })
        .then((remoteItem) => {
          if (remoteItem) {
            const idx = this.lineItems.findIndex((li) => li.id === newLineItem.id);
            if (idx !== -1) {
              this.lineItems[idx] = remoteItem;
              saveToStorage("lineItems", this.lineItems);
              this.notify();
            }
          }
        })
        .catch((err) => {
          console.warn("Supabase manual line item persistence failed, queuing for offline replay:", err);
          offlineSyncService.enqueue("manual_line_item", {
            action: "create_manual_line_item",
            projectId,
            item: {
              id: newLineItem.id,
              name: item.name,
              itemCode: item.item_code,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
            },
          });
        });
    }

    return newLineItem;
  }

  public updateLineItemStatus(
    id: string,
    status: LineItemStatus,
    user: string = "Project Reviewer",
    reason?: string
  ): void {
    const item = this.lineItems.find((li) => li.id === id);
    if (!item) return;

    const prev = item.status;
    item.status = status;
    item.reviewed_by = user;
    item.reviewed_at = "Just now";
    if (reason) item.rejection_reason = reason;

    const correctionType = status === "rejected" ? (reason?.toLowerCase().includes("scope") ? "scope_excluded" : "manual_override") : "manual_override";

    if (!item.correction_history) item.correction_history = [];
    item.correction_history.push({
      id: generateId("corr"),
      line_item_id: item.id,
      timestamp: "Just now",
      user,
      user_id: "u-active",
      action: `Status changed from ${prev} to ${status}`,
      previous_value: prev,
      new_value: status,
      ai_value: `${item.quantity} ${item.unit} proposed`,
      human_value: status === "approved" ? `${item.quantity} ${item.unit} verified` : "0 (rejected)",
      delta: status === "approved" ? "0" : `-${item.quantity}`,
      correction_type: correctionType,
      correction_reason: reason,
      reason,
      source: "verification",
      model_version: item.model_version || "v2.4-native",
    });

    // Bidirectional sync with any detections corresponding to this line item
    Object.keys(this.detections).forEach((sheetKey) => {
      this.detections[sheetKey].forEach((d) => {
        if (d.line_item_id === id || d.label === item.item_code || d.label === item.name) {
          d.status = status;
          d.reviewed_by = user;
        }
      });
    });
    saveToStorage("detections", this.detections);

    saveToStorage("lineItems", this.lineItems);

    // Recalculate takeoff summary approved count
    const projId = item.project_id;
    const summary = this.takeoffSummaries[projId];
    if (summary) {
      const approvedCount = this.lineItems.filter(
        (li) => li.project_id === projId && li.status === "approved"
      ).length;
      summary.line_items_approved = approvedCount;
      saveToStorage("takeoffSummaries", this.takeoffSummaries);
    }

    this.notify();

    // Async RPC sync to Supabase if configured
    if (isSupabaseConfigured() && !id.startsWith("li-mock") && !id.startsWith("li-")) {
      if (status === "approved") {
        takeoffService
          .approveLineItem({
            lineItemId: id,
            humanValue: `${item.quantity} ${item.unit}`,
            correctionType,
            reason,
          })
          .catch((err) => {
            console.warn("Supabase approve_line_item RPC failed, queuing for offline replay:", err);
            offlineSyncService.enqueue("line_item_status", {
              lineItemId: id,
              status: "approved",
              humanValue: `${item.quantity} ${item.unit}`,
              correctionType,
              reason,
            });
          });
      } else if (status === "rejected") {
        takeoffService
          .rejectLineItem({
            lineItemId: id,
            correctionType,
            reason: reason || "Rejected by user during review",
          })
          .catch((err) => {
            console.warn("Supabase reject_line_item RPC failed, queuing for offline replay:", err);
            offlineSyncService.enqueue("line_item_status", {
              lineItemId: id,
              status: "rejected",
              correctionType,
              reason: reason || "Rejected by user during review",
            });
          });
      }
    }
  }

  public correctLineItem(
    id: string,
    newQuantity: number,
    unit?: string,
    reason: string = "Manual engineering correction",
    user: string = "Lead Estimator"
  ): void {
    const item = this.lineItems.find((li) => li.id === id);
    if (!item) return;

    const prevQty = item.quantity;
    const prevUnit = item.unit;
    item.quantity = newQuantity;
    if (unit) item.unit = unit;
    item.status = "approved";
    item.reviewed_by = user;
    item.reviewed_at = "Just now";

    if (!item.correction_history) item.correction_history = [];
    item.correction_history.push({
      id: generateId("corr"),
      line_item_id: item.id,
      timestamp: "Just now",
      user,
      user_id: "u-active",
      action: `Quantity adjusted from ${prevQty} ${prevUnit} to ${newQuantity} ${unit || prevUnit}`,
      previous_value: `${prevQty} ${prevUnit}`,
      new_value: `${newQuantity} ${unit || prevUnit}`,
      ai_value: `${prevQty} ${prevUnit} (AI inferred)`,
      human_value: `${newQuantity} ${unit || prevUnit} (Verified)`,
      delta: `${newQuantity >= prevQty ? "+" : ""}${newQuantity - prevQty}`,
      correction_type: "manual_override",
      correction_reason: reason,
      reason,
      source: "verification",
      model_version: item.model_version || "v2.4-native",
    });

    saveToStorage("lineItems", this.lineItems);

    // Recalculate takeoff summary
    const projId = item.project_id;
    const summary = this.takeoffSummaries[projId];
    if (summary) {
      const approvedCount = this.lineItems.filter(
        (li) => li.project_id === projId && li.status === "approved"
      ).length;
      const proposedCount = this.lineItems.filter(
        (li) => li.project_id === projId && li.status === "proposed"
      ).length;
      summary.line_items_approved = approvedCount;
      summary.line_items_proposed = proposedCount;
      saveToStorage("takeoffSummaries", this.takeoffSummaries);
    }

    this.notify();

    if (isSupabaseConfigured() && !id.startsWith("li-mock") && !id.startsWith("li-")) {
      takeoffService
        .approveLineItem({
          lineItemId: id,
          humanValue: `${newQuantity} ${unit || prevUnit}`,
          correctionType: "manual_override",
          reason,
        })
        .catch((err) => {
          console.warn("Supabase approve_line_item RPC error, queuing offline:", err);
          offlineSyncService.enqueue("line_item_status", {
            lineItemId: id,
            status: "approved",
            humanValue: `${newQuantity} ${unit || prevUnit}`,
            correctionType: "manual_override",
            reason,
          });
        });
    }
  }

  public getSheets(projectId: string): Sheet[] {
    const targetId = this.resolveProjectId(projectId);
    return this.sheets.filter((s) => s.project_id === projectId || s.project_id === targetId);
  }

  public getLayers(): LayerDef[] {
    return [...this.layers];
  }

  public getDetections(sheetId: string): Detection[] {
    return this.detections[sheetId] || [];
  }

  public updateDetectionStatus(
    sheetId: string,
    detectionId: string,
    status: LineItemStatus,
    user: string = "Project Reviewer",
    reason?: string
  ): void {
    const sheetDets = this.detections[sheetId];
    if (!sheetDets) return;

    const det = sheetDets.find((d) => d.id === detectionId);
    if (!det) return;

    const prev = det.status;
    det.status = status;
    det.reviewed_by = user;

    // Bidirectional sync: If detection links to a LineItem, update that LineItem as well
    const linkedItem = det.line_item_id
      ? this.lineItems.find((li) => li.id === det.line_item_id)
      : this.lineItems.find((li) => li.item_code === det.label || li.name === det.label);

    if (linkedItem) {
      linkedItem.status = status;
      linkedItem.reviewed_by = user;
      linkedItem.reviewed_at = "Just now";
      if (reason) linkedItem.rejection_reason = reason;

      if (!linkedItem.correction_history) linkedItem.correction_history = [];
      linkedItem.correction_history.push({
        id: generateId("corr"),
        line_item_id: linkedItem.id,
        timestamp: "Just now",
        user,
        user_id: "u-active",
        action: `Status changed from ${prev} to ${status}`,
        previous_value: prev,
        new_value: status,
        ai_value: `${linkedItem.quantity} ${linkedItem.unit} proposed`,
        human_value: status === "approved" ? `${linkedItem.quantity} ${linkedItem.unit} verified` : "0 (rejected)",
        delta: status === "approved" ? "0" : `-${linkedItem.quantity}`,
        correction_type: status === "rejected" ? (reason?.toLowerCase().includes("scope") ? "scope_excluded" : "manual_override") : "manual_override",
        correction_reason: reason,
        reason,
        source: "verification",
        model_version: det.model_version || "v2.4-native",
      });
      saveToStorage("lineItems", this.lineItems);

      // Recalculate takeoff summary approved count
      const projId = linkedItem.project_id;
      const summary = this.takeoffSummaries[projId];
      if (summary) {
        summary.line_items_approved = this.lineItems.filter(
          (li) => li.project_id === projId && li.status === "approved"
        ).length;
        saveToStorage("takeoffSummaries", this.takeoffSummaries);
      }
    }

    saveToStorage("detections", this.detections);
    this.notify();
  }

  // ── Investigation Workshop (Sessions) ───────────────────────────────────────

  public getSessions(projectId?: string | null): ChatSession[] {
    if (projectId === undefined) return [...this.sessions];
    return this.sessions.filter((s) => (projectId === null ? s.project_id === null : s.project_id === projectId));
  }

  public getSession(id: string): ChatSession | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  public createSession(data: {
    project_id?: string | null;
    project_name?: string | null;
    title: string;
    initialMessage?: string;
  }): ChatSession {
    const sessionId = generateId("s");
    const newSession: ChatSession = {
      id: sessionId,
      project_id: data.project_id || null,
      project_name: data.project_name || null,
      title: data.title,
      last_message_preview: data.initialMessage || "New discussion started",
      message_count: data.initialMessage ? 1 : 0,
      created_by: "Project User",
      created_at: "Just now",
      updated_at: "Just now",
      messages: data.initialMessage
        ? [
            {
              id: generateId("m"),
              role: "user",
              content: data.initialMessage,
              timestamp: "Just now",
            },
          ]
        : [],
    };

    this.sessions.unshift(newSession);
    saveToStorage("sessions", this.sessions);
    this.notify();

    // Async sync to Supabase if configured
    if (isSupabaseConfigured()) {
      sessionService
        .createSession({
          project_id: data.project_id || null,
          project_name: data.project_name || null,
          title: data.title,
          initialMessage: data.initialMessage,
        })
        .then((remoteSession) => {
          if (remoteSession) {
            const idx = this.sessions.findIndex((s) => s.id === sessionId);
            if (idx !== -1) {
              this.sessions[idx] = remoteSession;
              saveToStorage("sessions", this.sessions);
              this.notify();
            }
          }
        })
        .catch((err) => console.warn("Supabase chat_session persistence failed:", err));
    }

    return newSession;
  }

  public deleteSession(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    saveToStorage("sessions", this.sessions);
    this.notify();

    if (isSupabaseConfigured() && !sessionId.startsWith("s1")) {
      sessionService
        .deleteSession(sessionId)
        .catch((err) => console.warn("Supabase delete session failed:", err));
    }
  }

  public addSessionMessage(
    sessionId: string,
    msg: {
      role: "user" | "assistant";
      content: string;
      thought_trace?: string[];
      tool_steps?: ChatMessage["tool_steps"];
      evidence?: ChatMessage["evidence"];
      action_proposal?: ChatMessage["action_proposal"];
      metric_highlights?: ChatMessage["metric_highlights"];
      referenced_sources?: ChatMessage["referenced_sources"];
    },
    autoRunAgent = true
  ): ChatMessage | undefined {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return undefined;

    const newMsg: ChatMessage = {
      id: generateId("m"),
      role: msg.role,
      content: msg.content,
      timestamp: "Just now",
      thought_trace: msg.thought_trace,
      tool_steps: msg.tool_steps,
      evidence: msg.evidence,
      action_proposal: msg.action_proposal,
      metric_highlights: msg.metric_highlights,
      referenced_sources: msg.referenced_sources,
    };

    session.messages.push(newMsg);
    session.message_count = session.messages.length;
    session.last_message_preview = msg.content.slice(0, 90) + (msg.content.length > 90 ? "…" : "");
    session.updated_at = "Just now";

    // If this is an assistant response, update the session investigation outcome metadata
    if (msg.role === "assistant") {
      if (msg.action_proposal) {
        session.investigation_status = "review_required";
        session.key_metric = `${msg.action_proposal.item_code} · ${msg.action_proposal.quantity} ${msg.action_proposal.unit || "EA"}`;
      } else if (msg.evidence) {
        session.investigation_status = "verified";
        session.key_metric = msg.metric_highlights?.[0]?.value || "Verified CAD Evidence";
      } else if (msg.metric_highlights && msg.metric_highlights.length > 0) {
        session.investigation_status = "calculated";
        session.key_metric = msg.metric_highlights[0].value;
      }

      if (msg.evidence?.sheet) {
        session.primary_sheet = msg.evidence.sheet;
      } else if (msg.referenced_sources && msg.referenced_sources.length > 0) {
        session.primary_sheet = msg.referenced_sources[0].sheet;
      }

      if (msg.referenced_sources && msg.referenced_sources.length > 0) {
        session.source_count = (session.source_count || 0) + msg.referenced_sources.length;
      } else if (msg.evidence) {
        session.source_count = Math.max(session.source_count || 0, 1);
      }
    }

    saveToStorage("sessions", this.sessions);
    this.notify();

    // Async sync message to Supabase
    if (isSupabaseConfigured() && !sessionId.startsWith("s1") && !sessionId.startsWith("c1") && !sessionId.startsWith("c2")) {
      sessionService
        .addMessage({
          sessionId,
          role: msg.role,
          content: msg.content,
          thought_trace: msg.thought_trace,
          tool_steps: msg.tool_steps,
          evidence: msg.evidence || undefined,
          action_proposal: msg.action_proposal,
          metric_highlights: msg.metric_highlights,
          referenced_sources: msg.referenced_sources,
        })
        .catch((err) => console.warn("Supabase message persistence failed:", err));
    }

    // If a user message was sent, run the Vectoris Agent investigation asynchronously
    if (msg.role === "user" && autoRunAgent) {
      agentRuntime
        .runInvestigation({
          sessionId,
          projectId: session.project_id,
          inquiry: msg.content,
        })
        .then((result) => {
          this.addSessionMessage(
            sessionId,
            {
              role: "assistant",
              content: result.content,
              thought_trace: result.thoughtTrace,
              tool_steps: result.toolSteps,
              evidence: result.evidence,
              action_proposal: result.actionProposal,
              metric_highlights: result.metricHighlights,
              referenced_sources: result.referencedSources,
            },
            false
          );
        })
        .catch((err) => {
          console.error("Agent investigation runtime error:", err);
          this.addSessionMessage(
            sessionId,
            {
              role: "assistant",
              content: "⚠️ The Vectoris Agent encountered an unexpected runtime error during the investigation. Please check project permissions and try again.",
            },
            false
          );
        });
    }

    return newMsg;
  }

  /**
   * Deterministic async helper: sends user message and awaits complete assistant response.
   * Useful for testing and controlled investigation lifecycle flows.
   */
  public async sendUserMessage(
    sessionId: string,
    content: string,
    userRole?: "viewer" | "editor" | "manager" | "admin" | "owner"
  ): Promise<ChatMessage | undefined> {
    const userMsg = this.addSessionMessage(
      sessionId,
      {
        role: "user",
        content,
      },
      false
    );

    if (!userMsg) return undefined;

    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return userMsg;

    try {
      const result = await agentRuntime.runInvestigation({
        sessionId,
        projectId: session.project_id,
        inquiry: content,
        userRole: userRole || "editor",
      });

      const assistantMsg = this.addSessionMessage(
        sessionId,
        {
          role: "assistant",
          content: result.content,
          thought_trace: result.thoughtTrace,
          tool_steps: result.toolSteps,
          evidence: result.evidence,
          action_proposal: result.actionProposal,
          metric_highlights: result.metricHighlights,
          referenced_sources: result.referencedSources,
        },
        false
      );

      return assistantMsg;
    } catch (err) {
      console.error("sendUserMessage agent runtime error:", err);
      const errMsg = this.addSessionMessage(
        sessionId,
        {
          role: "assistant",
          content: "⚠️ The Vectoris Agent encountered an unexpected runtime error during the investigation. Please check project permissions and try again.",
        },
        false
      );
      return errMsg;
    }
  }

  /**
   * Approves an AI Action Proposal with strict RBAC re-validation below the model,
   * creates the real Takeoff line item mutation, records an immutable audit record,
   * and refreshes the Takeoff store.
   */
  public async approveProposal(params: {
    sessionId: string;
    messageId: string;
    userId?: string;
    userRole?: string;
    userEmail?: string;
    reason?: string;
  }): Promise<{ success: boolean; error?: string; lineItem?: LineItem }> {
    const session = this.sessions.find((s) => s.id === params.sessionId);
    if (!session) {
      return { success: false, error: `Session '${params.sessionId}' not found.` };
    }

    const msg = session.messages.find(
      (m) => m.id === params.messageId || m.action_proposal?.id === params.messageId
    );
    if (!msg || !msg.action_proposal) {
      return { success: false, error: "Action proposal not found in session." };
    }

    if (msg.action_proposal.status !== "pending") {
      return { success: false, error: `Proposal has already been ${msg.action_proposal.status}.` };
    }

    // 1. RBAC Check below the model: Only Editor, Manager, Admin, Owner can approve mutations
    const role = (params.userRole || "Editor").toLowerCase().trim();
    const disallowedRoles = ["viewer", "read-only", "guest"];
    if (disallowedRoles.includes(role)) {
      return {
        success: false,
        error: `Authorization failure: Role '${params.userRole || "Viewer"}' lacks permission to approve takeoff mutations (requires Editor, Admin, or Owner).`,
      };
    }

    // 2. Active Project Scope Check
    const projectId = session.project_id || msg.action_proposal.project_id;
    if (!projectId) {
      return {
        success: false,
        error: "Cannot approve takeoff line item: No active project associated with this investigation session.",
      };
    }

    const committerName = params.userId || "Project Reviewer";
    const committerId = params.userId || "u-active";
    const readableTimestamp = "Just now";

    // 3. Extract quantity, unit, category, metadata
    const p = msg.action_proposal;
    const payload = p.payload || {};
    const rawQty = p.quantity !== undefined ? p.quantity : payload.quantity;
    const qty = typeof rawQty === "number" ? rawQty : parseFloat(String(rawQty).replace(/[^\d.]/g, "")) || 1;
    const unit = ((p.unit || payload.unit || "NOS") as string).toUpperCase() as LineItem["unit"];
    const category = ((p.category || payload.category || "Power Distribution") as string) as LineItem["category"];
    const itemCode = p.item_code || payload.itemCode || payload.item_code || "PROP-01";
    const itemName = p.item_name || payload.name || p.title;
    const sheet = p.source_sheet || msg.evidence?.sheet;
    const docId = msg.evidence?.doc_id;
    const docName = msg.evidence?.doc_name;
    const reason = params.reason || `Approved via Investigation Session: ${session.title}`;

    // 4. Create immutable audit/correction record
    const correctionRecord: CorrectionRecord = {
      id: generateId("corr"),
      line_item_id: itemCode,
      timestamp: readableTimestamp,
      user: committerName,
      user_id: committerId,
      action: "Item committed and verified from AI Action Proposal",
      previous_value: "proposed (AI proposal)",
      new_value: "approved",
      ai_value: `${qty} ${unit} proposed`,
      human_value: `${qty} ${unit} verified`,
      delta: "0",
      correction_type: "manual_override",
      reason,
      source: "verification",
      model_version: "v2.4-native",
    };

    // 5. Update or insert LineItem into Takeoff store
    let lineItem: LineItem;
    const existingIndex = this.lineItems.findIndex(
      (li) => li.project_id === projectId && li.item_code === itemCode && li.status === "proposed"
    );

    if (existingIndex >= 0) {
      const existing = this.lineItems[existingIndex];
      existing.status = "approved";
      existing.reviewed_by = committerName;
      existing.reviewed_at = readableTimestamp;
      existing.correction_history = [correctionRecord, ...(existing.correction_history || [])];
      lineItem = existing;
    } else {
      lineItem = {
        id: generateId("li"),
        project_id: projectId,
        item_code: itemCode,
        name: itemName,
        description: p.description || payload.description,
        specification: "Verified via Vectoris AI Investigation Workshop",
        category,
        quantity: qty,
        unit,
        source_document_id: docId || undefined,
        source_document_name: docName || undefined,
        source_sheet: sheet || undefined,
        status: "approved",
        detection_source: "human_created",
        model_version: "v2.4-native",
        reviewed_by: committerName,
        reviewed_at: readableTimestamp,
        correction_history: [correctionRecord],
      };
      this.lineItems.push(lineItem);
    }

    saveToStorage("lineItems", this.lineItems);

    // 6. Recalculate and update Takeoff Summary
    const summary = this.takeoffSummaries[projectId];
    if (summary) {
      summary.line_items_proposed = this.lineItems.filter((li) => li.project_id === projectId).length;
      summary.line_items_approved = this.lineItems.filter(
        (li) => li.project_id === projectId && li.status === "approved"
      ).length;
      saveToStorage("takeoffSummaries", this.takeoffSummaries);
    }

    // 7. Update Proposal state on message to 'approved'
    msg.action_proposal.status = "approved";
    msg.action_proposal.committed_at = readableTimestamp;
    msg.action_proposal.committed_by = committerName;
    saveToStorage("sessions", this.sessions);

    // 8. Remote Supabase persistence & offline sync queue
    if (isSupabaseConfigured() && !projectId.startsWith("p-") && !projectId.startsWith("p1")) {
      takeoffService
        .createManualLineItem({
          projectId,
          name: itemName,
          itemCode,
          category,
          quantity: qty,
          unit,
        })
        .catch((err) => {
          console.warn("Supabase createManualLineItem error, enqueuing offline:", err);
          offlineSyncService.enqueue("manual_line_item", {
            projectId,
            lineItem: { name: itemName, item_code: itemCode, category, quantity: qty, unit },
          });
        });
    }

    // 9. Notify all reactive subscribers
    this.notify();

    return { success: true, lineItem };
  }

  /**
   * Rejects an AI Action Proposal with user rejection reason, records audit trail,
   * updates the proposal state to 'rejected', and disables actions.
   */
  public async rejectProposal(params: {
    sessionId: string;
    messageId: string;
    userId?: string;
    userRole?: string;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.find((s) => s.id === params.sessionId);
    if (!session) {
      return { success: false, error: `Session '${params.sessionId}' not found.` };
    }

    const msg = session.messages.find(
      (m) => m.id === params.messageId || m.action_proposal?.id === params.messageId
    );
    if (!msg || !msg.action_proposal) {
      return { success: false, error: "Action proposal not found in session." };
    }

    if (msg.action_proposal.status !== "pending") {
      return { success: false, error: `Proposal has already been ${msg.action_proposal.status}.` };
    }

    // 1. RBAC Check: Viewer cannot reject proposals
    const role = (params.userRole || "Editor").toLowerCase().trim();
    const disallowedRoles = ["viewer", "read-only", "guest"];
    if (disallowedRoles.includes(role)) {
      return {
        success: false,
        error: `Authorization failure: Role '${params.userRole || "Viewer"}' lacks permission to reject takeoff proposals.`,
      };
    }

    const rejecterName = params.userId || "Project Reviewer";
    const readableTimestamp = "Just now";
    const rejectionReason = params.reason || "Rejected by reviewer during investigation";

    // 2. Update Proposal state on message to 'rejected'
    msg.action_proposal.status = "rejected";
    msg.action_proposal.rejection_reason = rejectionReason;
    msg.action_proposal.committed_at = readableTimestamp;
    msg.action_proposal.committed_by = rejecterName;

    saveToStorage("sessions", this.sessions);

    // 3. Notify subscribers
    this.notify();

    return { success: true };
  }

  /**
   * Synchronous / backward-compatible wrapper for proposal approval and rejection.
   */
  public updateProposalStatus(
    sessionId: string,
    messageId: string,
    status: "approved" | "rejected",
    user: string = "Project User",
    reason?: string
  ): void {
    if (status === "approved") {
      void this.approveProposal({
        sessionId,
        messageId,
        userId: user,
        userRole: "Editor",
        reason,
      });
    } else {
      void this.rejectProposal({
        sessionId,
        messageId,
        userId: user,
        userRole: "Editor",
        reason,
      });
    }
  }

  // ── Engine Status ───────────────────────────────────────────────────────────

  public getEngineStatus(): EngineStatusInfo {
    return { ...this.engineStatus };
  }

  public updateEngineStatus(patch: Partial<EngineStatusInfo>): void {
    this.engineStatus = { ...this.engineStatus, ...patch };
    saveToStorage("engineStatus", this.engineStatus);
    this.notify();
  }

  // ── Global Search ───────────────────────────────────────────────────────────

  public searchAll(query: string): {
    projects: Project[];
    documents: ProjectDocument[];
    sessions: ChatSession[];
  } {
    const q = query.toLowerCase().trim();
    if (!q) return { projects: [], documents: [], sessions: [] };

    const projects = this.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.discipline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );

    const documents = this.documents.filter(
      (d) => d.filename.toLowerCase().includes(q) || d.format.toLowerCase().includes(q)
    );

    const sessions = this.sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.last_message_preview.toLowerCase().includes(q) ||
        (s.project_name && s.project_name.toLowerCase().includes(q))
    );

    return { projects, documents, sessions };
  }

  // ── Project Plan ─────────────────────────────────────────────────────────────

  public getProjectPlan(projectId: string): ProjectPlan | null {
    return this.projectPlans[projectId] || null;
  }

  public async fetchProjectPlan(projectId: string): Promise<ProjectPlan | null> {
    const plan = await projectPlanService.getProjectPlan(projectId);
    if (plan) {
      this.projectPlans[projectId] = plan;
      saveToStorage("projectPlans", this.projectPlans);
      this.notify();
    }
    return plan;
  }

  public async createProjectPlanDraft(params: CreateDraftParams): Promise<string> {
    const draftId = await projectPlanService.createDraft(params);
    await this.fetchProjectPlan(params.projectId);
    return draftId;
  }

  public async acceptProjectPlanDraft(
    projectId: string,
    draftVersionId: string,
    resolutions?: DecisionResolution[]
  ): Promise<void> {
    await projectPlanService.acceptDraft(draftVersionId, resolutions);
    await this.fetchProjectPlan(projectId);
  }

  public async rejectProjectPlanDraft(
    projectId: string,
    draftVersionId: string,
    reason?: string
  ): Promise<void> {
    await projectPlanService.rejectDraft(draftVersionId, reason);
    await this.fetchProjectPlan(projectId);
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  public resetToDefaults(): void {
    this.projects = [...INITIAL_PROJECTS];
    this.documents = [...INITIAL_DOCUMENTS];
    this.sessions = [...INITIAL_SESSIONS];
    this.projectPlans = { ...INITIAL_PROJECT_PLANS };
    this.takeoffSummaries = { ...INITIAL_TAKEOFF_SUMMARY };
    this.lineItems = [...INITIAL_LINE_ITEMS];
    this.sheets = [...INITIAL_SHEETS];
    this.layers = [...INITIAL_LAYERS];
    this.detections = { ...INITIAL_DETECTIONS };
    this.engineStatus = { ...INITIAL_ENGINE_STATUS };

    saveToStorage("projects", this.projects);
    saveToStorage("documents", this.documents);
    saveToStorage("sessions", this.sessions);
    saveToStorage("projectPlans", this.projectPlans);
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    saveToStorage("lineItems", this.lineItems);
    saveToStorage("sheets", this.sheets);
    saveToStorage("layers", this.layers);
    saveToStorage("detections", this.detections);
    saveToStorage("engineStatus", this.engineStatus);

    this.notify();
  }
}

const globalRef = (typeof globalThis !== "undefined" ? globalThis : window) as any;
export const dataService: DataService =
  globalRef.__vectorisDataService__ ||
  (globalRef.__vectorisDataService__ = new DataService());

// ── React Custom Hooks ────────────────────────────────────────────────────────

export function useProjects(): Project[] {
  const [projects, setProjects] = useState<Project[]>(() => dataService.getProjects());

  useEffect(() => {
    return dataService.subscribe(() => {
      setProjects(dataService.getProjects());
    });
  }, []);

  return projects;
}

export function useProject(id: string): Project | undefined {
  const [project, setProject] = useState<Project | undefined>(() => dataService.getProject(id));

  useEffect(() => {
    setProject(dataService.getProject(id));
    return dataService.subscribe(() => {
      setProject(dataService.getProject(id));
    });
  }, [id]);

  return project;
}

export function useDocuments(projectId: string): ProjectDocument[] {
  const [docs, setDocs] = useState<ProjectDocument[]>(() => dataService.getDocuments(projectId));

  useEffect(() => {
    setDocs(dataService.getDocuments(projectId));
    return dataService.subscribe(() => {
      setDocs(dataService.getDocuments(projectId));
    });
  }, [projectId]);

  return docs;
}

export function useAllDocuments(): ProjectDocument[] {
  const [docs, setDocs] = useState<ProjectDocument[]>(() => dataService.getAllDocuments());

  useEffect(() => {
    return dataService.subscribe(() => {
      setDocs(dataService.getAllDocuments());
    });
  }, []);

  return docs;
}

export function useTakeoff(projectId: string): TakeoffRunSummary {
  const [takeoff, setTakeoff] = useState<TakeoffRunSummary>(() => dataService.getTakeoff(projectId));

  useEffect(() => {
    setTakeoff(dataService.getTakeoff(projectId));
    return dataService.subscribe(() => {
      setTakeoff(dataService.getTakeoff(projectId));
    });
  }, [projectId]);

  return takeoff;
}

export function useLineItems(projectId: string): LineItem[] {
  const [items, setItems] = useState<LineItem[]>(() => dataService.getLineItems(projectId));

  useEffect(() => {
    setItems(dataService.getLineItems(projectId));
    return dataService.subscribe(() => {
      setItems(dataService.getLineItems(projectId));
    });
  }, [projectId]);

  return items;
}

export function useSheets(projectId: string): Sheet[] {
  const [sheets, setSheets] = useState<Sheet[]>(() => dataService.getSheets(projectId));

  useEffect(() => {
    setSheets(dataService.getSheets(projectId));
    return dataService.subscribe(() => {
      setSheets(dataService.getSheets(projectId));
    });
  }, [projectId]);

  return sheets;
}

export function useLayers(): LayerDef[] {
  const [layers, setLayers] = useState<LayerDef[]>(() => dataService.getLayers());

  useEffect(() => {
    return dataService.subscribe(() => {
      setLayers(dataService.getLayers());
    });
  }, []);

  return layers;
}

export function useDetections(sheetId: string): Detection[] {
  const [detections, setDetections] = useState<Detection[]>(() => dataService.getDetections(sheetId));

  useEffect(() => {
    setDetections(dataService.getDetections(sheetId));
    return dataService.subscribe(() => {
      setDetections(dataService.getDetections(sheetId));
    });
  }, [sheetId]);

  return detections;
}

export function useSessions(projectId?: string | null): ChatSession[] {
  const [sessions, setSessions] = useState<ChatSession[]>(() => dataService.getSessions(projectId));

  useEffect(() => {
    setSessions(dataService.getSessions(projectId));
    return dataService.subscribe(() => {
      setSessions(dataService.getSessions(projectId));
    });
  }, [projectId]);

  return sessions;
}

export function useSession(id: string): ChatSession | undefined {
  const [session, setSession] = useState<ChatSession | undefined>(() => dataService.getSession(id));

  useEffect(() => {
    setSession(dataService.getSession(id));
    return dataService.subscribe(() => {
      setSession(dataService.getSession(id));
    });
  }, [id]);

  return session;
}

export function useEngineStatus(): EngineStatusInfo {
  const [status, setStatus] = useState<EngineStatusInfo>(() => dataService.getEngineStatus());

  useEffect(() => {
    return dataService.subscribe(() => {
      setStatus(dataService.getEngineStatus());
    });
  }, []);

  return status;
}

export function useProjectPlan(projectId?: string | null): ProjectPlan | null {
  const [plan, setPlan] = useState<ProjectPlan | null>(() =>
    projectId ? dataService.getProjectPlan(projectId) : null
  );

  useEffect(() => {
    if (!projectId) {
      setPlan(null);
      return;
    }
    setPlan(dataService.getProjectPlan(projectId));
    dataService.fetchProjectPlan(projectId);

    return dataService.subscribe(() => {
      setPlan(dataService.getProjectPlan(projectId));
    });
  }, [projectId]);

  return plan;
}

export function useActivePlanVersion(projectId?: string | null): PlanVersion | null {
  const plan = useProjectPlan(projectId);
  return plan?.active_version || null;
}

export function useDraftPlanVersion(projectId?: string | null): PlanVersion | null {
  const plan = useProjectPlan(projectId);
  return plan?.draft_version || null;
}

export function useAllLineItems(): LineItem[] {
  const [items, setItems] = useState<LineItem[]>(() => dataService.getAllLineItems());

  useEffect(() => {
    return dataService.subscribe(() => {
      setItems(dataService.getAllLineItems());
    });
  }, []);

  return items;
}



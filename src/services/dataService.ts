/**
 * dataService.ts — Unified reactive data layer and service boundary.
 *
 * Provides a clean seam between the UI and backend/local engine capabilities.
 * Persists modifications in localStorage and notifies subscribers of state changes.
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
} from "../data/types";
import { generateId } from "./idService";
import { INITIAL_PROJECTS } from "../data/mockProjects";
import { INITIAL_DOCUMENTS } from "../data/mockDocuments";
import { INITIAL_SESSIONS } from "../data/mockSessions";
import {
  INITIAL_TAKEOFF_SUMMARY,
  INITIAL_LINE_ITEMS,
  INITIAL_SHEETS,
  INITIAL_LAYERS,
  INITIAL_DETECTIONS,
} from "../data/mockTakeoff";
import { INITIAL_ENGINE_STATUS } from "../data/mockEngine";

const STORAGE_KEY_PREFIX = "vectoris.store.v1.";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Storage load error for", key, err);
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T): void {
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
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.projects = loadFromStorage<Project[]>("projects", INITIAL_PROJECTS);
    this.documents = loadFromStorage<ProjectDocument[]>("documents", INITIAL_DOCUMENTS);
    this.sessions = loadFromStorage<ChatSession[]>("sessions", INITIAL_SESSIONS);
    this.takeoffSummaries = loadFromStorage<Record<string, TakeoffRunSummary>>(
      "takeoffSummaries",
      INITIAL_TAKEOFF_SUMMARY
    );
    this.lineItems = loadFromStorage<LineItem[]>("lineItems", INITIAL_LINE_ITEMS);
    this.sheets = loadFromStorage<Sheet[]>("sheets", INITIAL_SHEETS);
    this.layers = loadFromStorage<LayerDef[]>("layers", INITIAL_LAYERS);
    this.detections = loadFromStorage<Record<string, Detection[]>>("detections", INITIAL_DETECTIONS);
    this.engineStatus = loadFromStorage<EngineStatusInfo>("engineStatus", INITIAL_ENGINE_STATUS);
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

  public createProject(data: {
    name: string;
    description?: string;
    client?: string;
    sector?: ProjectSector;
    discipline?: string;
  }): Project {
    const id = generateId("p");
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
      members: [{ name: "Hardik Bhaskar", initials: "HB", role: "Owner", avatarColor: "#2d4a6e" }],
    };

    this.projects.unshift(newProject);
    saveToStorage("projects", this.projects);
    this.notify();
    return newProject;
  }

  public updateProjectType(
    projectId: string,
    displayType: string,
    provenance: "ai_inferred" | "user_provided" | "verified"
  ): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

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
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  public getDocuments(projectId: string): ProjectDocument[] {
    return this.documents.filter((d) => d.project_id === projectId);
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
      filename: string;
      format: DocumentFormat;
      size_mb: number;
      uploaded_by?: string;
      file_path?: string;
      storage_reference?: string;
    }>
  ): ProjectDocument[] {
    const newDocs: ProjectDocument[] = files.map((f) => {
      const docId = generateId("d");
      return {
        id: docId,
        project_id: projectId,
        filename: f.filename,
        format: f.format,
        size_mb: Number(f.size_mb.toFixed(2)),
        upload_status: "queued", // Honest state: Queued awaiting engine processing
        sheet_count: null,
        uploaded_by: f.uploaded_by || "Hardik Bhaskar",
        uploaded_at: "Just now",
        file_path: f.file_path,
        storage_reference: f.storage_reference || `projects/${projectId}/documents/${docId}/${f.filename}`,
      };
    });

    this.documents = [...newDocs, ...this.documents];
    saveToStorage("documents", this.documents);

    // Update project updated_at & sheets metadata if needed
    const proj = this.projects.find((p) => p.id === projectId);
    if (proj) {
      proj.updated_at = "Just now";
      saveToStorage("projects", this.projects);
    }

    this.notify();
    return newDocs;
  }

  public removeDocument(docId: string): void {
    this.documents = this.documents.filter((d) => d.id !== docId);
    saveToStorage("documents", this.documents);
    this.notify();
  }

  // ── Takeoff & Line Items ─────────────────────────────────────────────────────

  public getTakeoff(projectId: string): TakeoffRunSummary {
    return (
      this.takeoffSummaries[projectId] || {
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
    return this.lineItems.filter((li) => li.project_id === projectId);
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
    return newLineItem;
  }

  public updateLineItemStatus(
    id: string,
    status: LineItemStatus,
    user: string = "Hardik Bhaskar",
    reason?: string
  ): void {
    const item = this.lineItems.find((li) => li.id === id);
    if (!item) return;

    const prev = item.status;
    item.status = status;
    item.reviewed_by = user;
    item.reviewed_at = "Just now";
    if (reason) item.rejection_reason = reason;

    if (!item.correction_history) item.correction_history = [];
    item.correction_history.push({
      id: generateId("corr"),
      line_item_id: item.id,
      timestamp: "Just now",
      user,
      user_id: "u-hb",
      action: `Status changed from ${prev} to ${status}`,
      previous_value: prev,
      new_value: status,
      ai_value: `${item.quantity} ${item.unit} proposed`,
      human_value: status === "approved" ? `${item.quantity} ${item.unit} verified` : "0 (rejected)",
      delta: status === "approved" ? "0" : `-${item.quantity}`,
      correction_type: status === "rejected" ? (reason?.toLowerCase().includes("scope") ? "scope_excluded" : "manual_override") : "manual_override",
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
  }

  public getSheets(projectId: string): Sheet[] {
    return this.sheets.filter((s) => s.project_id === projectId);
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
    user: string = "Hardik Bhaskar",
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
        user_id: "u-hb",
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
      created_by: "Hardik Bhaskar",
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
    return newSession;
  }

  public deleteSession(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    saveToStorage("sessions", this.sessions);
    this.notify();
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
    }
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
    };

    session.messages.push(newMsg);
    session.message_count = session.messages.length;
    session.last_message_preview = msg.content.slice(0, 90) + (msg.content.length > 90 ? "…" : "");
    session.updated_at = "Just now";

    saveToStorage("sessions", this.sessions);
    this.notify();
    return newMsg;
  }

  public updateProposalStatus(
    sessionId: string,
    messageId: string,
    status: "approved" | "rejected",
    user: string = "Hardik Bhaskar"
  ): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const msg = session.messages.find((m) => m.id === messageId || m.action_proposal?.id === messageId);
    if (!msg || !msg.action_proposal) return;

    msg.action_proposal.status = status;
    if (status === "approved") {
      msg.action_proposal.committed_at = "Just now";
      msg.action_proposal.committed_by = user;

      // If attached to a project, update or create the takeoff line item
      if (session.project_id) {
        const itemCode = msg.action_proposal.item_code;
        const existing = this.lineItems.find(
          (li) => li.project_id === session.project_id && li.item_code === itemCode
        );

        if (existing) {
          this.updateLineItemStatus(
            existing.id,
            "approved",
            user,
            `Approved via Investigation Workshop: ${session.title}`
          );
        } else {
          // Parse quantity as number
          const rawQty = msg.action_proposal.quantity;
          const qty = typeof rawQty === "number" ? rawQty : parseInt(String(rawQty).replace(/[^\d.]/g, ""), 10) || 1;
          const unit = (msg.action_proposal.unit as any) || "EA";
          const category = (msg.action_proposal.category as any) || "Power Distribution";

          const newItem: LineItem = {
            id: generateId("li"),
            project_id: session.project_id,
            item_code: itemCode,
            name: msg.action_proposal.item_name || msg.action_proposal.title,
            description: msg.action_proposal.description,
            specification: "Verified via Vectoris Investigation Workshop",
            category,
            quantity: qty,
            unit,
            source_document_id: msg.evidence?.doc_id || "d1",
            source_document_name: msg.evidence?.doc_name || "Single Line Diagram",
            source_sheet: msg.evidence?.sheet || "E-001",
            status: "approved",
            detection_source: "ai_detection",
            model_version: "v2.4-native",
            reviewed_by: user,
            reviewed_at: "Just now",
            correction_history: [
              {
                id: generateId("corr"),
                line_item_id: itemCode,
                timestamp: "Just now",
                user,
                user_id: "u-hb",
                action: "Item committed and verified from Investigation Workshop",
                previous_value: "proposed (investigation)",
                new_value: "approved",
                ai_value: `${qty} ${unit} proposed`,
                human_value: `${qty} ${unit} verified`,
                delta: "0",
                correction_type: "manual_override",
                reason: `Approved from investigation: ${session.title}`,
                source: "verification",
                model_version: "v2.4-native",
              },
            ],
          };

          this.lineItems.push(newItem);
          saveToStorage("lineItems", this.lineItems);

          const summary = this.takeoffSummaries[session.project_id];
          if (summary) {
            summary.line_items_proposed = this.lineItems.filter(
              (li) => li.project_id === session.project_id
            ).length;
            summary.line_items_approved = this.lineItems.filter(
              (li) => li.project_id === session.project_id && li.status === "approved"
            ).length;
            saveToStorage("takeoffSummaries", this.takeoffSummaries);
          }
        }
      }
    }

    saveToStorage("sessions", this.sessions);
    this.notify();
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

  // ── Reset ───────────────────────────────────────────────────────────────────

  public resetToDefaults(): void {
    this.projects = [...INITIAL_PROJECTS];
    this.documents = [...INITIAL_DOCUMENTS];
    this.sessions = [...INITIAL_SESSIONS];
    this.takeoffSummaries = { ...INITIAL_TAKEOFF_SUMMARY };
    this.lineItems = [...INITIAL_LINE_ITEMS];
    this.sheets = [...INITIAL_SHEETS];
    this.layers = [...INITIAL_LAYERS];
    this.detections = { ...INITIAL_DETECTIONS };
    this.engineStatus = { ...INITIAL_ENGINE_STATUS };

    saveToStorage("projects", this.projects);
    saveToStorage("documents", this.documents);
    saveToStorage("sessions", this.sessions);
    saveToStorage("takeoffSummaries", this.takeoffSummaries);
    saveToStorage("lineItems", this.lineItems);
    saveToStorage("sheets", this.sheets);
    saveToStorage("layers", this.layers);
    saveToStorage("detections", this.detections);
    saveToStorage("engineStatus", this.engineStatus);

    this.notify();
  }
}

export const dataService = new DataService();

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

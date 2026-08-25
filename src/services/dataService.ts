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
    const id = `p${Date.now()}`;
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
    }>
  ): ProjectDocument[] {
    const newDocs: ProjectDocument[] = files.map((f, idx) => ({
      id: `d_${Date.now()}_${idx}`,
      project_id: projectId,
      filename: f.filename,
      format: f.format,
      size_mb: Number(f.size_mb.toFixed(2)),
      upload_status: "queued", // Honest state: Queued awaiting engine processing
      sheet_count: null,
      uploaded_by: f.uploaded_by || "Hardik Bhaskar",
      uploaded_at: "Just now",
      file_path: f.file_path,
    }));

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

  public addLineItem(
    projectId: string,
    item: Omit<LineItem, "id" | "project_id">
  ): LineItem {
    const newLineItem: LineItem = {
      ...item,
      id: `li-${Date.now()}`,
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
      timestamp: "Just now",
      user,
      action: `Status changed from ${prev} to ${status}`,
      previous_value: prev,
      new_value: status,
      reason,
    });

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

  // ── AI Sessions ─────────────────────────────────────────────────────────────

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
    const newSession: ChatSession = {
      id: `s_${Date.now()}`,
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
              id: `m_${Date.now()}`,
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
      evidence?: ChatMessage["evidence"];
      action_proposal?: ChatMessage["action_proposal"];
    }
  ): ChatMessage | undefined {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return undefined;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: msg.role,
      content: msg.content,
      timestamp: "Just now",
      thought_trace: msg.thought_trace,
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

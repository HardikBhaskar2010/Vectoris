/**
 * types.ts — Canonical entity type definitions for Vectoris Workstation.
 *
 * SOURCE OF TRUTH:
 *   - docs/03_ARCHITECTURE/DATA_MODEL.md
 *   - docs/01_PRODUCT/CORE_WORKFLOWS.md
 *   - docs/06_PAGES/PROJECT_NAVIGATION.md
 *   - docs/06_PAGES/PROCESSING.md
 */

// ── Project Types ────────────────────────────────────────────────────────────

export type TypeProvenance = "ai_inferred" | "user_provided" | "verified";

export type ProjectStatus = "processing" | "review" | "completed" | "verified";

export type ProjectSector =
  | "data-center"
  | "industrial"
  | "healthcare"
  | "commercial"
  | "infrastructure";

export interface ProjectMember {
  name: string;
  initials: string;
  role: string;
  avatarColor?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  sector: ProjectSector;
  discipline: string;
  inferred_type: string | null;
  user_provided_type: string | null;
  verified_type: string | null;
  displayType: string;
  typeProvenance: TypeProvenance;
  status: ProjectStatus;
  progress: number;
  sheets: number;
  sheetType: "DWG" | "PDF" | "BIM";
  created_at: string;
  updated_at: string;
  member_count: number;
  members: ProjectMember[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  client: string;
  sector?: string;
  discipline?: string;
  displayType?: string;
  typeProvenance?: TypeProvenance;
}

// ── Document Types ───────────────────────────────────────────────────────────

export type DocumentFormat = "PDF" | "DWG" | "DXF" | "BIM" | "TIFF" | "Excel" | "Other";

/**
 * Processing states per document (docs/06_PAGES/PROCESSING.md):
 * queued → ingesting → classifying → detecting → complete | error
 */
export type ProcessingState =
  | "queued"
  | "ingesting"
  | "classifying"
  | "detecting"
  | "complete"
  | "parsed"
  | "error";

export interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  format: DocumentFormat;
  size_mb: number;
  upload_status: ProcessingState;
  sheet_count: number | null;
  uploaded_by: string;
  uploaded_at: string;
  error_message?: string;
  file_path?: string;
}

// ── Takeoff & Detection Types ─────────────────────────────────────────────────

export type LineItemStatus = "proposed" | "approved" | "rejected";

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CorrectionRecord {
  timestamp: string;
  user: string;
  action: string;
  previous_value: string;
  new_value: string;
  reason?: string;
}

export interface LineItem {
  id: string;
  project_id: string;
  item_code: string;
  name: string;
  description: string;
  specification: string;
  category: "Lighting" | "Cable Tray" | "Power Distribution" | "Conduit" | "Equipment" | "Safety";
  quantity: number;
  unit: "EA" | "m" | "ft" | "SET" | "LOT";
  source_document_id: string;
  source_document_name: string;
  source_sheet: string;
  source_coordinates?: Coordinates;
  status: LineItemStatus;
  detection_source: "ai_detection" | "human_created";
  model_version?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  correction_history?: CorrectionRecord[];
}

export interface TakeoffRunSummary {
  id: string;
  project_id: string;
  status: "pending" | "running" | "complete" | "error";
  sheets_processed: number;
  sheets_total: number;
  line_items_proposed: number;
  line_items_approved: number;
  started_at: string;
  completed_at: string | null;
  model_version: string;
}

export interface Sheet {
  id: string;
  project_id: string;
  sheet_id: string;
  name: string;
  type: "floor_plan" | "schedule" | "single_line" | "legend" | "notes";
  detection_count: number;
  document_name: string;
  is_empty: boolean;
}

export interface LayerDef {
  id: string;
  name: string;
  color: string;
}

export interface Detection {
  id: string;
  sheet_id: string;
  document_name: string;
  label: string;
  category: string;
  layer_id: string;
  status: LineItemStatus;
  quantity: number;
  unit: string;
  model_version: string;
  reviewed_by?: string;
}

// ── AI Chat Session Types ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thought_trace?: string[];
  evidence?: {
    doc_id: string;
    doc_name: string;
    sheet: string;
    region?: string;
    coordinates?: string;
  };
  action_proposal?: {
    id: string;
    title: string;
    description: string;
    item_code: string;
    quantity: string;
    status: "pending" | "approved" | "rejected";
  };
}

export interface ChatSession {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  last_message_preview: string;
  message_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

// ── Export / Report Types ─────────────────────────────────────────────────────

export type ExportFormat = "XLSX" | "CSV" | "JSON" | "PDF";

export interface ExportHistoryItem {
  id: string;
  project_id: string;
  format: ExportFormat;
  filename: string;
  item_count: number;
  generated_by: string;
  generated_at: string;
  size_kb: number;
}

// ── Engine Status Types ───────────────────────────────────────────────────────

export interface EngineStatusInfo {
  status: "ready" | "standby" | "processing" | "offline";
  mode: "local_first";
  storage_path: string;
  active_jobs: number;
  sheets_indexed: number;
  version: string;
}

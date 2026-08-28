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
  sheetType: "DWG" | "PDF" | "BIM" | "XLSX" | string;
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

export type DocumentFormat = "PDF" | "DWG" | "DXF" | "BIM" | "TIFF" | "Excel" | "XLSX" | "Other";

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
  storage_reference?: string;
}

// ── Takeoff & Detection Types ─────────────────────────────────────────────────

export type LineItemStatus = "proposed" | "approved" | "rejected";

export type CorrectionType =
  | "missed"
  | "false_positive"
  | "wrong_symbol"
  | "wrong_classification"
  | "duplicate"
  | "scope_excluded"
  | "sheet_conflict"
  | "manual_override"
  | "other";

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * CorrectionRecord / CorrectionEvent (docs/03_ARCHITECTURE/DATA_MODEL.md §2)
 * Structured audit record capturing human corrections to AI proposed takeoffs.
 */
export interface CorrectionRecord {
  id?: string;
  line_item_id?: string;
  timestamp: string;
  user: string;
  user_id?: string;
  action: string;
  previous_value: string;
  new_value: string;
  ai_value?: string;
  human_value?: string;
  delta?: string;
  correction_type?: CorrectionType;
  correction_reason?: string;
  reason?: string;
  source?: "manual" | "ai_inference" | "verification";
  model_version?: string;
}

export type LineItemCategory =
  | "Lighting"
  | "Cable Tray"
  | "Cable Trays"
  | "Power Distribution"
  | "Conduit"
  | "Equipment"
  | "Safety"
  | "Power Cables"
  | "Control Cabling"
  | "Automatic Transfer Switches"
  | "Receptacles & Sockets"
  | "Cable Accessories"
  | "Earthing & Grounding"
  | "Refrigerant Piping"
  | "Thermal Insulation"
  | "Structural Fabrication"
  | "Condensate Drainage"
  | "Refrigerants & Chemicals"
  | "Extended Piping"
  | "Humidification Water"
  | "Valves & Fittings"
  | "Equipment Commissioning"
  | "Drainage Equipment"
  | (string & {});

export type LineItemUnit =
  | "EA"
  | "m"
  | "ft"
  | "SET"
  | "LOT"
  | "NOS"
  | "MTR"
  | "RM"
  | "KGS"
  | "LTR"
  | "sqm"
  | "Rmt"
  | (string & {});

export interface LineItem {
  id: string;
  project_id: string;
  item_code: string;
  name: string;
  description: string;
  specification: string;
  category: LineItemCategory;
  quantity: number;
  unit: LineItemUnit;
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
  coordinates?: Coordinates;
  line_item_id?: string;
}

// ── AI Chat Session Types ─────────────────────────────────────────────────────

export interface ToolTraceStep {
  id: string;
  name: string;
  label: string;
  status: "complete" | "running" | "pending";
  output?: string;
}

export interface EvidenceData {
  doc_id: string;
  doc_name: string;
  sheet: string;
  sheet_id?: string;
  region?: string;
  coordinates?: string;
  thumbnail_type?: "switchgear" | "tray" | "conduit" | "lighting" | "panel";
  specs?: Array<{ label: string; value: string }>;
}

export interface ActionProposal {
  id: string;
  title: string;
  description: string;
  item_code: string;
  item_name?: string;
  category?: string;
  quantity: string | number;
  unit?: string;
  status: "pending" | "approved" | "rejected";
  committed_at?: string;
  committed_by?: string;
}

export interface MetricHighlight {
  label: string;
  value: string;
  status?: "pass" | "warn" | "info";
}

export interface ReferencedSource {
  sheet: string;
  desc: string;
  doc_id?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thought_trace?: string[];
  tool_steps?: ToolTraceStep[];
  evidence?: EvidenceData;
  action_proposal?: ActionProposal;
  metric_highlights?: MetricHighlight[];
  referenced_sources?: ReferencedSource[];
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
  investigation_status?: "verified" | "calculated" | "review_required" | "in_progress";
  key_metric?: string;
  primary_sheet?: string;
  source_count?: number;
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

// ── Project Plan Types (docs/PLAN.md) ──────────────────────────────────────────

export type PlanVersionStatus = "draft" | "active" | "superseded";

export type ClaimSection =
  | "scope_outcomes"
  | "milestones"
  | "risks"
  | "dependencies";

export type ClaimGrounding =
  | "known_from_evidence"
  | "inferred"
  | "human_decided"
  | "unresolved";

export type LineageRelationship = "split" | "merge";

export interface PlanClaimEvidenceLink {
  document_id: string;
  document_name?: string;
  sheet_id?: string;
  sheet_index?: number;
  coordinates?: Coordinates;
  note?: string;
}

export interface PlanClaim {
  id: string;
  claim_id: string;
  plan_version_id: string;
  section: ClaimSection;
  content: string;
  grounding: ClaimGrounding;
  evidence_links: PlanClaimEvidenceLink[];
  inference_rationale?: string | null;
  unresolved_reason?: string | null;
  conflict_with_decision_id?: string | null;
  conflict_details?: string | null;
  created_at?: string;
}

export interface PlanVersion {
  id: string;
  plan_id: string;
  version_number: number;
  status: PlanVersionStatus;
  created_by: string;
  created_at: string;
  activated_at?: string | null;
  superseded_at?: string | null;
  claims: PlanClaim[];
  documents?: ProjectDocument[];
}

export interface ProjectPlan {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  active_version?: PlanVersion | null;
  draft_version?: PlanVersion | null;
  version_history?: PlanVersion[];
}

export interface Decision {
  id: string;
  claim_id: string;
  project_id: string;
  decision_text: string;
  rationale?: string | null;
  decided_by: string;
  decided_at: string;
  superseded_by?: string | null;
  superseded_at?: string | null;
  is_active: boolean;
}

export interface ClaimLineage {
  id: string;
  parent_claim_id: string;
  child_claim_id: string;
  relationship: LineageRelationship;
  occurred_at: string;
  triggering_plan_version_id: string;
}

export interface DecisionResolution {
  claim_id: string;
  action: "accept_proposed" | "keep_existing" | "custom_decision";
  custom_decision_text?: string;
  rationale?: string;
}

export type ClaimDiffType = "added" | "removed" | "modified" | "unchanged";

export interface ClaimDiffItem {
  claim_id: string;
  section: ClaimSection;
  diff_type: ClaimDiffType;
  active_claim?: PlanClaim;
  draft_claim?: PlanClaim;
  conflict?: {
    decision_id: string;
    decision_text: string;
    conflict_details?: string;
  };
  lineage?: ClaimLineage[];
}

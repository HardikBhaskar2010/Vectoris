/**
 * domainMappers.ts — Pure mapping functions between database rows and Vectoris domain types.
 *
 * Keeps raw database rows from leaking across UI components while providing
 * type-safe translations for persistence and retrieval.
 */

import type { Database } from "../data/database.types";
import type {
  Project,
  ProjectSector,
  TypeProvenance,
  ProjectDocument,
  DocumentFormat,
  ProcessingState,
  ProjectMember,
  LineItem,
  LineItemStatus,
  CorrectionRecord,
  CorrectionType,
  TakeoffRunSummary,
  ChatSession,
  ChatMessage,
  EvidenceData,
  ActionProposal,
  ToolTraceStep,
} from "../data/types";

type DbProject = Database["public"]["Tables"]["projects"]["Row"];
type DbDocument = Database["public"]["Tables"]["documents"]["Row"];
type DbProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
type DbLineItem = Database["public"]["Tables"]["line_items"]["Row"];
type DbCorrectionEvent = Database["public"]["Tables"]["correction_events"]["Row"];
type DbTakeoffRun = Database["public"]["Tables"]["takeoff_runs"]["Row"];
type DbChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];
type DbMessage = Database["public"]["Tables"]["messages"]["Row"];

/**
 * Maps a database project row + members into the Vectoris frontend Project domain entity.
 */
export function mapDbProjectToDomain(
  row: DbProject,
  members: DbProjectMember[] = []
): Project {
  // Determine provenance & displayType
  let provenance: TypeProvenance = "ai_inferred";
  let displayType = "Unclassified";

  if (row.verified_type) {
    provenance = "verified";
    displayType = row.verified_type;
  } else if (row.user_provided_type) {
    provenance = "user_provided";
    displayType = row.user_provided_type;
  } else if (row.inferred_type) {
    provenance = "ai_inferred";
    displayType = row.inferred_type;
  }

  // Derive sector and discipline from displayType or description if structured
  let sector: ProjectSector = "commercial";
  const lowerDisplay = displayType.toLowerCase();
  if (lowerDisplay.includes("data center") || lowerDisplay.includes("datacenter")) {
    sector = "data-center";
  } else if (lowerDisplay.includes("industrial")) {
    sector = "industrial";
  } else if (lowerDisplay.includes("healthcare") || lowerDisplay.includes("hospital")) {
    sector = "healthcare";
  } else if (lowerDisplay.includes("infrastructure")) {
    sector = "infrastructure";
  } else if (lowerDisplay.includes("commercial")) {
    sector = "commercial";
  }

  const domainMembers: ProjectMember[] = members.map((m) => {
    const roleCapitalized = m.role.charAt(0).toUpperCase() + m.role.slice(1);
    return {
      name: "Member",
      initials: "M",
      role: roleCapitalized,
      avatarColor: "#2d4a6e",
    };
  });

  if (domainMembers.length === 0) {
    domainMembers.push({
      name: "Current User",
      initials: "CU",
      role: "Owner",
      avatarColor: "#2d4a6e",
    });
  }

  return {
    id: row.id,
    name: row.name,
    client: "Active Client",
    description: row.description || "",
    sector,
    discipline: "Electrical & MEP",
    inferred_type: row.inferred_type,
    user_provided_type: row.user_provided_type,
    verified_type: row.verified_type,
    displayType,
    typeProvenance: provenance,
    status: "processing",
    progress: 0,
    sheets: 0,
    sheetType: "PDF",
    created_at: row.created_at ? row.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    updated_at: row.updated_at ? "Just now" : "Recently",
    member_count: Math.max(domainMembers.length, 1),
    members: domainMembers,
  };
}

/**
 * Maps a database document row to the Vectoris frontend ProjectDocument domain entity.
 */
export function mapDbDocumentToDomain(row: DbDocument): ProjectDocument {
  const formatUpper = row.format.toUpperCase();
  let format: DocumentFormat = "PDF";
  if (formatUpper === "PDF") format = "PDF";
  else if (formatUpper === "DWG") format = "DWG";
  else if (formatUpper === "DXF") format = "DXF";
  else if (formatUpper === "BIM") format = "BIM";
  else if (formatUpper === "TIFF") format = "TIFF";
  else if (formatUpper === "XLSX" || formatUpper === "CSV" || formatUpper === "EXCEL") format = "Excel";
  else format = "Other";

  const storageRef = row.storage_mode === "local" ? (row.local_reference || "") : (row.cloud_object_path || "");

  return {
    id: row.id,
    project_id: row.project_id,
    filename: row.filename,
    format,
    size_mb: 0, // Metadata derived
    upload_status: row.upload_status as ProcessingState,
    sheet_count: null,
    uploaded_by: "Project User",
    uploaded_at: row.uploaded_at ? "Just now" : "Recently",
    error_message: row.error_message || undefined,
    storage_reference: storageRef,
  };
}

/**
 * Maps a database line_item row + correction history to the Vectoris frontend LineItem entity.
 */
export function mapDbLineItemToDomain(
  row: DbLineItem,
  correctionHistory: CorrectionRecord[] = []
): LineItem {
  const categoryMapped = (row.category as LineItem["category"]) || "Power Distribution";
  const unitMapped = (row.unit_of_measure as LineItem["unit"]) || "EA";

  return {
    id: row.id,
    project_id: row.project_id,
    item_code: row.item_code || "ITEM",
    name: row.name,
    description: row.name,
    specification: "Standard Specification",
    category: categoryMapped,
    quantity: row.current_value,
    unit: unitMapped,
    source_document_id: "doc-1",
    source_document_name: "Drawing Package",
    source_sheet: "E-001",
    status: row.status as LineItemStatus,
    detection_source: row.source,
    reviewed_by: row.reviewed_by || undefined,
    reviewed_at: row.reviewed_at ? "Just now" : undefined,
    correction_history: correctionHistory,
  };
}

/**
 * Maps a database correction_event row to the Vectoris frontend CorrectionRecord entity.
 */
export function mapDbCorrectionEventToDomain(row: DbCorrectionEvent): CorrectionRecord {
  return {
    id: row.id,
    line_item_id: row.line_item_id,
    timestamp: row.created_at ? "Just now" : "Recently",
    user: "Project Reviewer",
    user_id: row.user_id,
    action: `Correction: ${row.correction_type}`,
    previous_value: row.ai_value || "proposed",
    new_value: row.human_value,
    ai_value: row.ai_value || undefined,
    human_value: row.human_value,
    delta: row.delta || undefined,
    correction_type: row.correction_type as CorrectionType,
    correction_reason: row.correction_reason || undefined,
    reason: row.correction_reason || undefined,
    source: "verification",
    model_version: row.model_version || "v2.4-native",
  };
}

/**
 * Maps a database takeoff_run row to the Vectoris frontend TakeoffRunSummary entity.
 */
export function mapDbTakeoffRunToDomain(
  row: DbTakeoffRun,
  proposedCount = 0,
  approvedCount = 0,
  sheetsCount = 0
): TakeoffRunSummary {
  return {
    id: row.id,
    project_id: row.project_id,
    status: row.status,
    sheets_processed: sheetsCount,
    sheets_total: sheetsCount,
    line_items_proposed: proposedCount,
    line_items_approved: approvedCount,
    started_at: row.started_at ? row.started_at.split("T")[0] : "Recently",
    completed_at: row.completed_at,
    model_version: row.model_version,
  };
}

/**
 * Maps a database message row into the Vectoris frontend ChatMessage entity.
 */
export function mapDbMessageToDomain(row: DbMessage): ChatMessage {
  const role: "user" | "assistant" = row.role === "agent" ? "assistant" : "user";
  
  let toolSteps: ToolTraceStep[] | undefined = undefined;
  let evidence: EvidenceData | undefined = undefined;
  let actionProposal: ActionProposal | undefined = undefined;
  let thoughtTrace: string[] | undefined = undefined;

  // Extract structured tool calls
  if (Array.isArray(row.tool_calls) && row.tool_calls.length > 0) {
    toolSteps = row.tool_calls as unknown as ToolTraceStep[];
  }

  // Extract evidence links
  if (row.evidence_links && typeof row.evidence_links === "object") {
    const rawEv = row.evidence_links as Record<string, unknown>;
    if (rawEv.evidence) {
      evidence = rawEv.evidence as EvidenceData;
    }
    if (rawEv.action_proposal) {
      actionProposal = rawEv.action_proposal as ActionProposal;
    }
    if (Array.isArray(rawEv.thought_trace)) {
      thoughtTrace = rawEv.thought_trace as string[];
    }
  }

  return {
    id: row.id,
    role,
    content: row.content,
    timestamp: row.created_at ? "Just now" : "Recently",
    thought_trace: thoughtTrace,
    tool_steps: toolSteps,
    evidence,
    action_proposal: actionProposal,
  };
}

/**
 * Maps a database chat_session row into the Vectoris frontend ChatSession entity.
 */
export function mapDbSessionToDomain(
  row: DbChatSession,
  messages: ChatMessage[] = [],
  projectName: string | null = null
): ChatSession {
  const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : "New investigation started";
  const preview = lastMsg.slice(0, 90) + (lastMsg.length > 90 ? "…" : "");

  return {
    id: row.id,
    project_id: row.project_id,
    project_name: projectName,
    title: row.title || "Investigation Session",
    last_message_preview: preview,
    message_count: messages.length,
    created_by: "Project User",
    created_at: row.created_at ? "Recently" : "Just now",
    updated_at: row.updated_at ? "Just now" : "Recently",
    messages,
  };
}

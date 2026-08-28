/**
 * toolRegistry.ts — Centralized Vectoris AI Tool Catalog, Contracts & Authorization Boundary.
 *
 * Source of Truth:
 *   - docs/04_AI/TOOL_SYSTEM.md (§1-§4 Tool Inventory & Verification Layer)
 *   - docs/04_AI/AGENT_RUNTIME.md (§3 Typed Error Contracts & §7 JSON Schema Standard)
 *   - User Request Section 8 (AI Tool Usage & Tool-Calling Architecture)
 */

import { dataService } from "../../services/dataService";
import { projectPlanService } from "../../services/projectPlanService";
import type {
  LineItem,
  ProjectDocument,
  Sheet,
  Detection,
  Coordinates,
  CorrectionRecord,
  ProjectMember,
  ClaimSection,
  ClaimGrounding,
} from "../../data/types";

export type ToolCategory =
  | "project"
  | "document"
  | "drawing"
  | "takeoff"
  | "investigation"
  | "calculation";

export type ToolClassification = "READ" | "WRITE";

export type ToolRiskLevel = "low" | "medium" | "high";

export type ToolUserRole = "viewer" | "editor" | "manager" | "admin" | "owner";

export type ToolErrorCode =
  | "not_found"
  | "permission_denied"
  | "timeout"
  | "validation_failed"
  | "internal_error"
  | "insufficient_evidence";

export interface EvidenceReference {
  document_id?: string;
  document_name?: string;
  sheet_number?: string;
  coordinates?: Coordinates;
  line_item_id?: string;
  provenance_note: string;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  evidence?: EvidenceReference[];
  metadata?: {
    tool_id: string;
    duration_ms: number;
    timestamp: string;
  };
  warnings?: string[];
  error_code?: ToolErrorCode;
  message?: string;
  retryable?: boolean;
}

export interface ToolExecutionContext {
  projectId?: string | null;
  userRole: ToolUserRole;
  userId: string;
  activeSkillIds?: string[];
}

export interface ToolDefinition {
  tool_id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  classification: ToolClassification;
  risk_level: ToolRiskLevel;
  required_role: ToolUserRole;
  requires_project_scope: boolean;
  requires_human_approval: boolean;
  parameters: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolExecutionResult>;
}

const ROLE_RANKS: Record<ToolUserRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

function hasRolePermission(userRole: ToolUserRole, requiredRole: ToolUserRole): boolean {
  return (ROLE_RANKS[userRole] || 1) >= (ROLE_RANKS[requiredRole] || 1);
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerAllTools();
  }

  private registerAllTools(): void {
    // ── 1. PROJECT / CONTEXT TOOLS ───────────────────────────────────────────

    this.register({
      tool_id: "get_project",
      name: "get_project",
      description: "Retrieves metadata, client, sector, discipline, and display type for a project.",
      version: "1.0.0",
      category: "project",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "UUID or ID of the project" },
        },
        required: ["projectId"],
      },
      execute: async (args, context) => {
        const pId = (args.projectId as string) || context.projectId;
        if (!pId) {
          return {
            success: false,
            error_code: "not_found",
            message: "Missing project ID parameter.",
          };
        }
        const proj = dataService.getProject(pId);
        if (!proj) {
          return {
            success: false,
            error_code: "not_found",
            message: `Project '${pId}' not found.`,
          };
        }
        return {
          success: true,
          data: {
            id: proj.id,
            name: proj.name,
            client: proj.client,
            sector: proj.sector,
            discipline: proj.discipline,
            display_type: proj.displayType,
            type_provenance: proj.typeProvenance,
            sheet_count: proj.sheets,
          },
          evidence: [
            {
              provenance_note: `Project record: ${proj.name} (${proj.displayType})`,
            },
          ],
        };
      },
    });

    this.register({
      tool_id: "search_projects",
      name: "search_projects",
      description: "Searches accessible projects by name, client, sector, or discipline.",
      version: "1.0.0",
      category: "project",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: false,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query keywords" },
        },
        required: ["query"],
      },
      execute: async (args) => {
        const query = (args.query as string || "").toLowerCase();
        const allProjects = dataService.getProjects();
        const matches = allProjects.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.client.toLowerCase().includes(query) ||
            p.sector.toLowerCase().includes(query)
        );
        return {
          success: true,
          data: {
            total_matches: matches.length,
            projects: matches.map((p) => ({
              id: p.id,
              name: p.name,
              client: p.client,
              sector: p.sector,
              discipline: p.discipline,
            })),
          },
        };
      },
    });

    this.register({
      tool_id: "get_project_members",
      name: "get_project_members",
      description: "Lists assigned project team members, roles, and disciplines.",
      version: "1.0.0",
      category: "project",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Target project ID" },
        },
      },
      execute: async (args, context) => {
        const pId = (args.projectId as string) || context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const proj = dataService.getProject(pId);
        return {
          success: true,
          data: {
            project_id: pId,
            members: proj?.members || [],
          },
        };
      },
    });

    this.register({
      tool_id: "get_project_context",
      name: "get_project_context",
      description: "Retrieves complete high-level project context, active document counts, and takeoff summary.",
      version: "1.0.0",
      category: "project",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Target project ID" },
        },
      },
      execute: async (args, context) => {
        const pId = (args.projectId as string) || context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const proj = dataService.getProject(pId);
        const docs = dataService.getDocuments(pId);
        const takeoff = dataService.getTakeoff(pId);
        const lineItems = dataService.getLineItems(pId);

        return {
          success: true,
          data: {
            project: proj
              ? {
                  id: proj.id,
                  name: proj.name,
                  client: proj.client,
                  sector: proj.sector,
                  discipline: proj.discipline,
                  display_type: proj.displayType,
                }
              : null,
            total_documents: docs.length,
            document_formats: Array.from(new Set(docs.map((d) => d.format))),
            takeoff_summary: takeoff,
            line_item_counts: {
              total: lineItems.length,
              proposed: lineItems.filter((i) => i.status === "proposed").length,
              approved: lineItems.filter((i) => i.status === "approved").length,
              rejected: lineItems.filter((i) => i.status === "rejected").length,
            },
          },
        };
      },
    });

    // ── 2. DOCUMENT TOOLS ───────────────────────────────────────────────────

    this.register({
      tool_id: "search_documents",
      name: "search_documents",
      description: "Searches documents in the active project by filename, format, or upload status.",
      version: "1.0.0",
      category: "document",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Filename or keyword filter" },
          format: { type: "string", description: "Format filter (PDF, DWG, DXF, BIM, TIFF, Excel)" },
        },
      },
      execute: async (args, context) => {
        const pId = context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const docs = dataService.getDocuments(pId);
        const query = (args.query as string || "").toLowerCase();
        const format = (args.format as string || "").toUpperCase();

        const filtered = docs.filter((d) => {
          if (query && !d.filename.toLowerCase().includes(query)) return false;
          if (format && d.format.toUpperCase() !== format) return false;
          return true;
        });

        return {
          success: true,
          data: {
            total_matching: filtered.length,
            documents: filtered.map((d) => ({
              id: d.id,
              filename: d.filename,
              format: d.format,
              size_mb: d.size_mb,
              upload_status: d.upload_status,
              storage_reference: d.storage_reference,
            })),
          },
          evidence: filtered.map((d) => ({
            document_id: d.id,
            document_name: d.filename,
            provenance_note: `Document: ${d.filename} (${d.format})`,
          })),
        };
      },
    });

    this.register({
      tool_id: "get_document_metadata",
      name: "get_document_metadata",
      description: "Retrieves metadata, format, storage reference, and sheet count for a single document.",
      version: "1.0.0",
      category: "document",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Target document ID" },
        },
        required: ["documentId"],
      },
      execute: async (args, context) => {
        const pId = context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const docs = dataService.getDocuments(pId);
        const doc = docs.find((d) => d.id === args.documentId);
        if (!doc) {
          return { success: false, error_code: "not_found", message: `Document '${args.documentId}' not found.` };
        }
        return {
          success: true,
          data: {
            id: doc.id,
            filename: doc.filename,
            format: doc.format,
            size_mb: doc.size_mb,
            upload_status: doc.upload_status,
            storage_reference: doc.storage_reference,
            uploaded_at: doc.uploaded_at,
          },
          evidence: [
            {
              document_id: doc.id,
              document_name: doc.filename,
              provenance_note: `Document: ${doc.filename} (${doc.format})`,
            },
          ],
        };
      },
    });

    // ── 3. DRAWING / SHEET TOOLS ─────────────────────────────────────────────

    this.register({
      tool_id: "list_sheets",
      name: "list_sheets",
      description: "Lists all drawing sheets in the project with sheet IDs, names, and sheet numbers.",
      version: "1.0.0",
      category: "drawing",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Target project ID" },
        },
      },
      execute: async (args, context) => {
        const pId = (args.projectId as string) || context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const sheets = dataService.getSheets(pId);
        return {
          success: true,
          data: {
            total_sheets: sheets.length,
            sheets: sheets.map((s) => ({
              id: s.id,
              sheet_id: s.sheet_id,
              name: s.name,
              number: s.sheet_id,
            })),
          },
          evidence: sheets.map((s) => ({
            sheet_number: s.sheet_id,
            provenance_note: `Drawing Sheet: ${s.sheet_id} - ${s.name}`,
          })),
        };
      },
    });

    this.register({
      tool_id: "inspect_drawing_region",
      name: "inspect_drawing_region",
      description: "Inspects a drawing sheet for specific electrical/MEP components, tags, legends, and bounding regions.",
      version: "1.0.0",
      category: "drawing",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          sheetNumber: { type: "string", description: "Sheet identifier (e.g. E-001, E-101, E-104)" },
          componentQuery: { type: "string", description: "Component type, equipment tag, or circuit label" },
        },
        required: ["sheetNumber"],
      },
      execute: async (args, context) => {
        const pId = context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const sheets = dataService.getSheets(pId);
        const rawSheet = (args.sheetNumber || args.sheet_number || args.sheet_id || args.sheet || "") as string;
        const sheetNum = rawSheet.toLowerCase().trim();
        const sheet = sheetNum
          ? sheets.find(
              (s) => s.sheet_id.toLowerCase() === sheetNum || s.name.toLowerCase().includes(sheetNum)
            ) || sheets[0]
          : sheets[0];

        if (!sheet) {
          return {
            success: false,
            error_code: "not_found",
            message: `Sheet '${rawSheet || "default"}' not found in project drawings.`,
          };
        }

        const detections = dataService.getDetections(sheet.id);
        const queryTerm = (args.componentQuery as string)?.toLowerCase();
        const matched = queryTerm
          ? detections.filter(
              (d) =>
                d.label.toLowerCase().includes(queryTerm) ||
                d.category.toLowerCase().includes(queryTerm)
            )
          : detections;

        const evidenceList: EvidenceReference[] = matched.slice(0, 8).map((d) => ({
          sheet_number: sheet.sheet_id,
          coordinates: d.coordinates,
          provenance_note: `Detection [${d.label}] on Sheet ${sheet.sheet_id} (${d.category}, qty ${d.quantity})`,
        }));

        return {
          success: true,
          data: {
            sheet_id: sheet.sheet_id,
            sheet_name: sheet.name,
            inspected_component_query: queryTerm || "all",
            total_detections_found: matched.length,
            detections: matched.map((d) => ({
              id: d.id,
              label: d.label,
              category: d.category,
              quantity: d.quantity,
              status: d.status,
              model_version: d.model_version,
              coordinates: d.coordinates,
            })),
          },
          evidence: evidenceList,
        };
      },
    });

    // ── 4. TAKEOFF TOOLS ────────────────────────────────────────────────────

    this.register({
      tool_id: "search_line_items",
      name: "search_line_items",
      description: "Searches takeoff line items by keyword, code, category, or approval status.",
      version: "1.0.0",
      category: "takeoff",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword, equipment code, or description" },
          category: { type: "string", description: "Category filter (Lighting, Cable Tray, Power Distribution, etc.)" },
          status: { type: "string", description: "Status filter (proposed, approved, rejected)" },
        },
      },
      execute: async (args, context) => {
        const pId = context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const lineItems = dataService.getLineItems(pId);
        const q = (args.query as string || "").toLowerCase();
        const cat = (args.category as string || "").toLowerCase();
        const st = (args.status as string || "").toLowerCase();

        const filtered = lineItems.filter((i) => {
          if (q && !i.name.toLowerCase().includes(q) && !i.item_code.toLowerCase().includes(q)) return false;
          if (cat && i.category.toLowerCase() !== cat) return false;
          if (st && i.status.toLowerCase() !== st) return false;
          return true;
        });

        return {
          success: true,
          data: {
            total_items: filtered.length,
            line_items: filtered.map((i) => ({
              id: i.id,
              item_code: i.item_code,
              name: i.name,
              category: i.category,
              quantity: i.quantity,
              unit: i.unit,
              status: i.status,
              source_sheet: i.source_sheet,
              detection_source: i.detection_source,
            })),
          },
          evidence: filtered.slice(0, 10).map((i) => ({
            line_item_id: i.id,
            sheet_number: i.source_sheet,
            coordinates: i.source_coordinates,
            provenance_note: `Line Item [${i.item_code}]: ${i.quantity} ${i.unit} (${i.status}) from Sheet ${i.source_sheet}`,
          })),
        };
      },
    });

    this.register({
      tool_id: "get_line_item",
      name: "get_line_item",
      description: "Retrieves complete details of a single line item including full correction audit history.",
      version: "1.0.0",
      category: "takeoff",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          lineItemId: { type: "string", description: "Target line item ID" },
        },
        required: ["lineItemId"],
      },
      execute: async (args, context) => {
        const pId = context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const lineItems = dataService.getLineItems(pId);
        const item = lineItems.find((i) => i.id === args.lineItemId);
        if (!item) {
          return {
            success: false,
            error_code: "not_found",
            message: `Line item '${args.lineItemId}' not found.`,
          };
        }

        return {
          success: true,
          data: item,
          evidence: [
            {
              line_item_id: item.id,
              sheet_number: item.source_sheet,
              coordinates: item.source_coordinates,
              provenance_note: `Line Item: ${item.name} (${item.quantity} ${item.unit}) on Sheet ${item.source_sheet}`,
            },
          ],
        };
      },
    });

    this.register({
      tool_id: "get_takeoff_run",
      name: "get_takeoff_run",
      description: "Retrieves the latest takeoff perception run status, model version, and processing counts.",
      version: "1.0.0",
      category: "takeoff",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Target project ID" },
        },
      },
      execute: async (args, context) => {
        const pId = (args.projectId as string) || context.projectId;
        if (!pId) {
          return { success: false, error_code: "not_found", message: "No project scope specified." };
        }
        const takeoff = dataService.getTakeoff(pId);
        return {
          success: true,
          data: takeoff,
        };
      },
    });

    this.register({
      tool_id: "create_line_item",
      name: "create_line_item",
      description: "Proposes adding a new takeoff line item. Generates an Action Proposal requiring engineer commit.",
      version: "1.0.0",
      category: "takeoff",
      classification: "WRITE",
      risk_level: "medium",
      required_role: "editor",
      requires_project_scope: true,
      requires_human_approval: true,
      parameters: {
        type: "object",
        properties: {
          itemCode: { type: "string", description: "Item code or symbol tag" },
          name: { type: "string", description: "Equipment name / line item title" },
          category: { type: "string", description: "Category (Lighting, Cable Tray, Power Distribution, etc.)" },
          quantity: { type: "number", description: "Quantity count or length" },
          unit: { type: "string", description: "Unit of measure (EA, m, ft, SET, LOT)" },
          sourceSheet: { type: "string", description: "Inspected source sheet (e.g. E-104)" },
          description: { type: "string", description: "Optional technical specification" },
        },
        required: ["name", "quantity", "unit", "sourceSheet"],
      },
      execute: async (args, context) => {
        if (!hasRolePermission(context.userRole, "editor")) {
          return {
            success: false,
            error_code: "permission_denied",
            message: "Viewer role is not authorized to create takeoff line items.",
          };
        }

        const proposal = {
          item_code: (args.itemCode as string) || "PROP-ITEM",
          name: args.name as string,
          category: (args.category as LineItem["category"]) || "Power Distribution",
          quantity: Number(args.quantity),
          unit: (args.unit as LineItem["unit"]) || "EA",
          source_sheet: args.sourceSheet as string,
          description: (args.description as string) || (args.name as string),
        };

        return {
          success: true,
          data: {
            proposal_type: "create_line_item",
            item: proposal,
            status: "pending_human_approval",
          },
          evidence: [
            {
              sheet_number: proposal.source_sheet,
              provenance_note: `Proposed Line Item [${proposal.item_code}]: ${proposal.quantity} ${proposal.unit} based on Sheet ${proposal.source_sheet}`,
            },
          ],
        };
      },
    });

    // ── 5. INVESTIGATION TOOLS ───────────────────────────────────────────────

    this.register({
      tool_id: "search_previous_investigations",
      name: "search_previous_investigations",
      description: "Searches previous engineering investigation sessions and messages in the current scope.",
      version: "1.0.0",
      category: "investigation",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: false,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query keywords" },
        },
        required: ["query"],
      },
      execute: async (args, context) => {
        const query = (args.query as string || "").toLowerCase();
        const pId = context.projectId;
        const sessions = dataService.getSessions(pId);
        const matches = sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.last_message_preview.toLowerCase().includes(query)
        );

        return {
          success: true,
          data: {
            total_matches: matches.length,
            sessions: matches.map((s) => ({
              id: s.id,
              title: s.title,
              project_id: s.project_id,
              message_count: s.message_count,
              preview: s.last_message_preview,
            })),
          },
        };
      },
    });

    // ── 6. CALCULATION / ENGINEERING TOOLS ───────────────────────────────────

    this.register({
      tool_id: "calculate_electrical_load",
      name: "calculate_electrical_load",
      description: "Calculates full load amperes (FLA) for 1-phase or 3-phase circuits given kVA/kW, voltage, and power factor.",
      version: "1.0.0",
      category: "calculation",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: false,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          kva: { type: "number", description: "Apparent power in kVA (or kW if pf is provided)" },
          voltage: { type: "number", description: "System voltage in Volts (e.g. 480, 208, 120, 415)" },
          isThreePhase: { type: "boolean", description: "True for 3-phase circuits, false for 1-phase" },
          powerFactor: { type: "number", description: "Power factor between 0.7 and 1.0 (default 0.85)" },
        },
        required: ["kva", "voltage"],
      },
      execute: async (args) => {
        const pf = Number(args.powerFactor || args.power_factor) || 0.85;
        const rawKva = args.kva !== undefined ? Number(args.kva) : (Number(args.load_kw || args.kw || 0) / pf);
        const kva = rawKva || 150;
        const v = Number(args.voltage || args.voltage_v || args.voltageV) || 480;
        const is3P = args.isThreePhase !== undefined ? Boolean(args.isThreePhase) : (args.phases !== undefined ? Number(args.phases) === 3 : true);

        if (v <= 0 || kva <= 0) {
          return {
            success: false,
            error_code: "validation_failed",
            message: "Voltage and kVA must be positive numbers.",
          };
        }

        let fla: number;
        if (is3P) {
          // FLA = (kVA * 1000) / (sqrt(3) * V)
          fla = (kva * 1000) / (Math.sqrt(3) * v);
        } else {
          // FLA = (kVA * 1000) / V
          fla = (kva * 1000) / v;
        }

        const continuousAmperes = fla * 1.25; // NEC 125% continuous load rule
        const kw = kva * pf;
        const STANDARD_BREAKERS = [
          15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
          110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450,
          500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000,
        ];
        const breakerAmps =
          STANDARD_BREAKERS.find((b) => b >= continuousAmperes) ||
          Math.ceil(continuousAmperes / 100) * 100;

        return {
          success: true,
          data: {
            apparent_power_kva: Math.round(kva * 10) / 10,
            kva: Math.round(kva * 10) / 10,
            real_power_kw: Math.round(kw * 10) / 10,
            load_kw: Math.round(kw * 10) / 10,
            system_voltage_v: v,
            phase: is3P ? "3-Phase" : "1-Phase",
            full_load_amperes: Math.round(fla * 10) / 10,
            fla_amps: Math.round(fla * 10) / 10,
            continuous_load_amperes_125pct: Math.round(continuousAmperes * 10) / 10,
            design_amps: Math.round(continuousAmperes * 10) / 10,
            recommended_minimum_breaker_amperes: breakerAmps,
            recommended_breaker_amps: breakerAmps,
          },
          evidence: [
            {
              provenance_note: `Calculated: ${kva.toFixed(1)} kVA at ${v}V (${is3P ? "3-Phase" : "1-Phase"}) yields ${Math.round(fla * 10) / 10} FLA (125% continuous: ${Math.round(continuousAmperes * 10) / 10} A)`,
            },
          ],
        };
      },
    });

    this.register({
      tool_id: "verify_feeder_sizing",
      name: "verify_feeder_sizing",
      description: "Verifies minimum standard copper/aluminum conductor gauge for a given circuit breaker rating under 75°C terminal ratings.",
      version: "1.0.0",
      category: "calculation",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: false,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          breakerAmperes: { type: "number", description: "Breaker trip rating in Amperes (e.g. 50, 100, 200, 400)" },
          conductorMaterial: { type: "string", description: "Conductor material: Copper (Cu) or Aluminum (Al)" },
        },
        required: [],
      },
      execute: async (args) => {
        const amps = Number(args.breakerAmperes || args.target_amps || args.targetAmps || args.amps || 200);
        const material = ((args.conductorMaterial || args.material || "Copper") as string).toLowerCase();
        const isCu = !material.includes("al");

        // Standard 75°C ampacity table lookup (NEC Table 310.16)
        let recommendedGauge = "12 AWG";
        let rawGauge = "12 AWG";
        let conduitEstimate = '3/4" EMT';
        let ampacity = 20;

        if (isCu) {
          if (amps <= 20) { rawGauge = "12 AWG"; recommendedGauge = "12 AWG Cu"; conduitEstimate = '1/2" EMT'; ampacity = 20; }
          else if (amps <= 30) { rawGauge = "10 AWG"; recommendedGauge = "10 AWG Cu"; conduitEstimate = '3/4" EMT'; ampacity = 30; }
          else if (amps <= 50) { rawGauge = "8 AWG"; recommendedGauge = "8 AWG Cu"; conduitEstimate = '3/4" EMT'; ampacity = 50; }
          else if (amps <= 70) { rawGauge = "4 AWG"; recommendedGauge = "4 AWG Cu"; conduitEstimate = '1" EMT'; ampacity = 85; }
          else if (amps <= 100) { rawGauge = "3 AWG"; recommendedGauge = "3 AWG Cu"; conduitEstimate = '1-1/4" EMT'; ampacity = 100; }
          else if (amps <= 125) { rawGauge = "1 AWG"; recommendedGauge = "1 AWG Cu"; conduitEstimate = '1-1/4" EMT'; ampacity = 130; }
          else if (amps <= 150) { rawGauge = "1/0 AWG"; recommendedGauge = "1/0 AWG Cu"; conduitEstimate = '1-1/2" EMT'; ampacity = 150; }
          else if (amps <= 200) { rawGauge = "3/0 AWG"; recommendedGauge = "3/0 AWG Cu"; conduitEstimate = '2" EMT'; ampacity = 200; }
          else if (amps <= 250) { rawGauge = "250 kcmil"; recommendedGauge = "250 kcmil Cu"; conduitEstimate = '2-1/2" EMT'; ampacity = 255; }
          else if (amps <= 400) { rawGauge = "500 kcmil"; recommendedGauge = "500 kcmil Cu (or 2x 3/0)"; conduitEstimate = '3" EMT'; ampacity = 380; }
          else { rawGauge = "Parallel Sets"; recommendedGauge = "Parallel Sets Required (>400A)"; conduitEstimate = "Dual 3\" EMT"; ampacity = amps; }
        } else {
          if (amps <= 100) { rawGauge = "1 AWG"; recommendedGauge = "1 AWG Al"; conduitEstimate = '1-1/4" EMT'; ampacity = 100; }
          else if (amps <= 200) { rawGauge = "4/0 AWG"; recommendedGauge = "4/0 AWG Al"; conduitEstimate = '2" EMT'; ampacity = 205; }
          else if (amps <= 400) { rawGauge = "600 kcmil"; recommendedGauge = "600 kcmil Al (or 2x 4/0)"; conduitEstimate = '3-1/2" EMT'; ampacity = 375; }
          else { rawGauge = "Parallel Sets"; recommendedGauge = "Parallel Sets Required (>400A)"; conduitEstimate = "Dual 3-1/2\" EMT"; ampacity = amps; }
        }

        return {
          success: true,
          data: {
            breaker_rating_amperes: amps,
            material: isCu ? "Copper (Cu, 75°C)" : "Aluminum (Al, 75°C)",
            recommended_conductor_size: recommendedGauge,
            conductor_size: rawGauge,
            conductor_ampacity: ampacity,
            recommended_conduit_trade_size: conduitEstimate,
            conduit_trade_size_in: conduitEstimate,
            continuous_rating_amps: Math.round(ampacity * 0.8),
            code_standard_reference: "NEC 310.16 / 75°C Terminal Column",
          },
          evidence: [
            {
              provenance_note: `Feeder sizing: ${amps}A breaker requires minimum ${recommendedGauge} in ${conduitEstimate}`,
            },
          ],
        };
      },
    });

    // ── Propose Project Plan Revision Tool (docs/PLAN.md) ──────────────────────
    this.register({
      tool_id: "propose_project_plan_revision",
      name: "propose_project_plan_revision",
      version: "1.0.0",
      description:
        "Proposes a grounded revision to the Project Plan (Scope & outcomes, Milestones, Risks, Dependencies) by creating an immutable draft snapshot. Never directly overwrites the active plan.",
      category: "project",
      classification: "READ",
      risk_level: "medium",
      required_role: "editor",
      requires_project_scope: true,
      requires_human_approval: true,
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "UUID of the project to revise",
          },
          documentIds: {
            type: "array",
            items: { type: "string" },
            description: "Optional document UUIDs to link as grounding evidence",
          },
          claims: {
            type: "array",
            description:
              "List of atomic plan claims across the 4 fixed sections (scope_outcomes, milestones, risks, dependencies)",
            items: {
              type: "object",
              properties: {
                claim_id: { type: "string", description: "Stable claim UUID if modifying an existing claim" },
                section: {
                  type: "string",
                  enum: ["scope_outcomes", "milestones", "risks", "dependencies"],
                },
                content: { type: "string", description: "Atomic statement content" },
                grounding: {
                  type: "string",
                  enum: ["known_from_evidence", "inferred", "human_decided", "unresolved"],
                },
                inference_rationale: { type: "string" },
                unresolved_reason: { type: "string" },
              },
              required: ["section", "content", "grounding"],
            },
          },
          lineage: {
            type: "array",
            description: "Optional claim split/merge lineage relationships",
            items: {
              type: "object",
              properties: {
                parent_claim_id: { type: "string" },
                child_claim_id: { type: "string" },
                relationship: { type: "string", enum: ["split", "merge"] },
              },
              required: ["parent_claim_id", "child_claim_id", "relationship"],
            },
          },
        },
        required: ["claims"],
      },
      execute: async (args, context) => {
        const projectId = (args.projectId as string) || context.projectId;
        if (!projectId) {
          return {
            success: false,
            error_code: "validation_failed",
            message: "Missing required parameter 'projectId'.",
          };
        }

        const claims = (args.claims as any[]) || [];
        if (claims.length === 0) {
          return {
            success: false,
            error_code: "validation_failed",
            message: "Parameter 'claims' must contain at least one atomic claim.",
          };
        }

        const documentIds = (args.documentIds as string[]) || [];
        const lineage = (args.lineage as any[]) || [];

        try {
          const draftVersionId = await projectPlanService.createDraft({
            projectId,
            documentIds,
            claims,
            lineage,
          });

          await dataService.fetchProjectPlan(projectId);

          return {
            success: true,
            data: {
              draft_version_id: draftVersionId,
              project_id: projectId,
              claim_count: claims.length,
              status: "draft_created",
              message:
                "Project Plan draft created successfully. The draft is ready for human claim diff review and Decision conflict resolution.",
            },
            evidence: [
              {
                provenance_note: `Generated immutable plan draft ${draftVersionId} with ${claims.length} claims across 4 sections.`,
              },
            ],
          };
        } catch (err: any) {
          return {
            success: false,
            error_code: "internal_error",
            message: err?.message || "Failed to create project plan draft snapshot.",
          };
        }
      },
    });

    // ── Get Project Plan Tool ─────────────────────────────────────────────────
    this.register({
      tool_id: "get_project_plan",
      name: "get_project_plan",
      version: "1.0.0",
      description: "Retrieves the current active Project Plan and any open draft for a project.",
      category: "project",
      classification: "READ",
      risk_level: "low",
      required_role: "viewer",
      requires_project_scope: true,
      requires_human_approval: false,
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Target project UUID" },
        },
      },
      execute: async (args, context) => {
        const projectId = (args.projectId as string) || context.projectId;
        if (!projectId) {
          return {
            success: false,
            error_code: "validation_failed",
            message: "Missing required parameter 'projectId'.",
          };
        }

        const plan = await projectPlanService.getProjectPlan(projectId);
        return {
          success: true,
          data: {
            plan_id: plan?.id,
            project_id: projectId,
            active_version: plan?.active_version || null,
            draft_version: plan?.draft_version || null,
            total_versions: plan?.version_history?.length || 0,
          },
        };
      },
    });
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Dispatches tool execution with strict authorization check below the model.
   */
  public async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error_code: "not_found",
        message: `Tool '${toolName}' is not registered in the Tool Registry.`,
        metadata: {
          tool_id: toolName,
          duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 1. Authorization check below the model
    if (!hasRolePermission(context.userRole, tool.required_role)) {
      return {
        success: false,
        error_code: "permission_denied",
        message: `Authorization failure: User role '${context.userRole}' lacks permission to execute tool '${toolName}' (requires '${tool.required_role}').`,
        metadata: {
          tool_id: tool.tool_id,
          duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 2. Project scope check
    if (tool.requires_project_scope && !context.projectId) {
      return {
        success: false,
        error_code: "validation_failed",
        message: `Tool '${toolName}' requires an active project context.`,
        metadata: {
          tool_id: tool.tool_id,
          duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 3. Execution
    try {
      const res = await tool.execute(args, context);
      res.metadata = {
        tool_id: tool.tool_id,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      return res;
    } catch (err) {
      console.error(`Tool execution error for '${toolName}':`, err);
      return {
        success: false,
        error_code: "internal_error",
        message: err instanceof Error ? err.message : "Unexpected tool execution error.",
        retryable: true,
        metadata: {
          tool_id: tool.tool_id,
          duration_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();

/**
 * vectorisRouter.ts — Vectoris AI Agent Request Router & Execution Classifier.
 *
 * Source of Truth:
 *   - docs/04_AI/AI_SYSTEM.md (§5 Execution Router)
 *   - docs/04_AI/AGENT_RUNTIME.md (§1 Control Loop & §4 Execution Modes)
 *   - docs/04_AI/MODEL_GOVERNANCE.md (§1 Model Versioning)
 *   - User Request Section 9 (Vectoris Router)
 */

import { skillRegistry } from "../skills/skillRegistry";
import { toolRegistry } from "../tools/toolRegistry";

export type RequestIntent =
  | "general_conversation"
  | "project_understanding"
  | "document_investigation"
  | "drawing_investigation"
  | "takeoff_investigation"
  | "engineering_calculation"
  | "evidence_retrieval"
  | "multi_step_investigation"
  | "project_action_proposal";

export type ComplexityLevel = "low" | "medium" | "high";

export type ExecutionMode =
  | "direct_synthesis"
  | "single_tool_execution"
  | "react_multi_step";

export interface ContextRequirements {
  requires_project_metadata: boolean;
  requires_drawing_sheets: boolean;
  requires_takeoff_summary: boolean;
  requires_conversation_history: boolean;
  requires_document_manifest: boolean;
}

export interface ModelSelection {
  model_id: string;
  model_version: string;
  provider: "local_engine" | "cloud_gateway";
  reasoning_effort: "standard" | "high";
}

export interface RoutingDecision {
  intent: RequestIntent;
  complexity: ComplexityLevel;
  execution_mode: ExecutionMode;
  classification: "READ" | "WRITE";
  selected_model: ModelSelection;
  selected_skill_ids: string[];
  candidate_tool_names: string[];
  context_requirements: ContextRequirements;
  requires_confirmation: boolean;
  confidence: number;
  routing_duration_ms: number;
  explanation: string;
}

export interface RouteRequestParams {
  inquiry: string;
  projectId?: string | null;
  userRole?: string;
}

class VectorisRouter {
  /**
   * Evaluates a user inquiry and produces a structured, validated routing decision.
   * Does NOT execute tools or grant permissions.
   */
  public async routeRequest(params: RouteRequestParams): Promise<RoutingDecision> {
    const startTime = Date.now();
    const { inquiry, projectId, userRole = "editor" } = params;
    const q = inquiry.toLowerCase().trim();
    const hasProject = Boolean(projectId);

    let intent: RequestIntent = "general_conversation";
    let complexity: ComplexityLevel = "low";
    let executionMode: ExecutionMode = "direct_synthesis";
    let classification: "READ" | "WRITE" = "READ";
    let requiresConfirmation = false;
    let confidence = 0.85;
    let explanation = "Standard conversational inquiry.";

    const selectedSkillIds: string[] = [];
    const candidateToolNames: string[] = [];
    const contextReqs: ContextRequirements = {
      requires_project_metadata: hasProject,
      requires_drawing_sheets: false,
      requires_takeoff_summary: false,
      requires_conversation_history: true,
      requires_document_manifest: false,
    };

    // 1. Classify Intent & Complexity
    if (
      q.includes("add") ||
      q.includes("create line item") ||
      q.includes("propose item") ||
      q.includes("insert takeoff")
    ) {
      intent = "project_action_proposal";
      complexity = "medium";
      executionMode = "react_multi_step";
      classification = "WRITE";
      requiresConfirmation = true;
      confidence = 0.95;
      explanation = "User requested a state-mutating takeoff addition proposal requiring human commit.";

      selectedSkillIds.push("takeoff-variance-audit");
      candidateToolNames.push("create_line_item", "inspect_drawing_region", "get_project_context");
      contextReqs.requires_drawing_sheets = true;
      contextReqs.requires_takeoff_summary = true;
    } else if (
      (q.includes("why") || q.includes("how many") || q.includes("audit") || q.includes("compare")) &&
      (q.includes("takeoff") || q.includes("boq") || q.includes("count") || q.includes("quantity")) &&
      (q.includes("drawing") || q.includes("sheet") || q.includes("plan"))
    ) {
      intent = "multi_step_investigation";
      complexity = "high";
      executionMode = "react_multi_step";
      classification = "READ";
      confidence = 0.92;
      explanation = "Complex cross-file investigation comparing takeoff quantities against drawing sheet detections.";

      selectedSkillIds.push("takeoff-variance-audit", "drawing-symbol-interpretation");
      candidateToolNames.push("search_line_items", "inspect_drawing_region", "get_line_item", "get_project_context");
      contextReqs.requires_drawing_sheets = true;
      contextReqs.requires_takeoff_summary = true;
      contextReqs.requires_document_manifest = true;
    } else if (
      q.includes("takeoff") ||
      q.includes("boq") ||
      q.includes("quantity") ||
      q.includes("line item") ||
      q.includes("approved") ||
      q.includes("verified")
    ) {
      intent = "takeoff_investigation";
      complexity = "medium";
      executionMode = "react_multi_step";
      classification = "READ";
      confidence = 0.9;
      explanation = "Investigation into takeoff ledger items and approval states.";

      selectedSkillIds.push("takeoff-variance-audit");
      candidateToolNames.push("search_line_items", "get_line_item", "get_takeoff_run");
      contextReqs.requires_takeoff_summary = true;
    } else if (
      q.includes("sheet") ||
      q.includes("drawing") ||
      q.includes("symbol") ||
      q.includes("legend") ||
      q.includes("e-") ||
      q.includes("floor plan") ||
      q.includes("single line")
    ) {
      intent = "drawing_investigation";
      complexity = "medium";
      executionMode = "react_multi_step";
      classification = "READ";
      confidence = 0.9;
      explanation = "Visual or symbolic investigation of project drawings and CAD/BIM layers.";

      selectedSkillIds.push("drawing-symbol-interpretation");
      candidateToolNames.push("inspect_drawing_region", "list_sheets", "get_document_metadata");
      contextReqs.requires_drawing_sheets = true;
      contextReqs.requires_document_manifest = true;
    } else if (
      q.includes("calculate") ||
      q.includes("kva") ||
      q.includes("amp") ||
      q.includes("fla") ||
      q.includes("feeder") ||
      q.includes("breaker size") ||
      q.includes("conductor")
    ) {
      intent = "engineering_calculation";
      complexity = "low";
      executionMode = "react_multi_step";
      classification = "READ";
      confidence = 0.95;
      explanation = "Deterministic engineering calculation for electrical load or feeder sizing.";

      selectedSkillIds.push("electrical-distribution-analysis");
      candidateToolNames.push("calculate_electrical_load", "verify_feeder_sizing");
    } else if (
      q.includes("document") ||
      q.includes("file") ||
      q.includes("spec") ||
      q.includes("pdf") ||
      q.includes("dwg")
    ) {
      intent = "document_investigation";
      complexity = "low";
      executionMode = "single_tool_execution";
      classification = "READ";
      confidence = 0.88;
      explanation = "Lookup of project document packages, uploads, and format metadata.";

      selectedSkillIds.push("mep-spec-compliance");
      candidateToolNames.push("search_documents", "get_document_metadata", "read_project_files");
      contextReqs.requires_document_manifest = true;
    } else if (hasProject) {
      intent = "project_understanding";
      complexity = "low";
      executionMode = "single_tool_execution";
      classification = "READ";
      confidence = 0.8;
      explanation = "General inquiry in project context.";

      selectedSkillIds.push("electrical-distribution-analysis");
      candidateToolNames.push("get_project_context", "search_project");
    } else {
      // General conversation fallback
      intent = "general_conversation";
      complexity = "low";
      executionMode = "direct_synthesis";
      classification = "READ";
      confidence = 0.75;
      explanation = "General engineering question with no active project attachment.";
    }

    // 2. Select Model Class based on Complexity
    const selectedModel: ModelSelection = {
      model_id: "vectoris-brain-local",
      model_version: "v2.4-native",
      provider: "local_engine",
      reasoning_effort: complexity === "high" ? "high" : "standard",
    };

    const durationMs = Date.now() - startTime;

    return {
      intent,
      complexity,
      execution_mode: executionMode,
      classification,
      selected_model: selectedModel,
      selected_skill_ids: selectedSkillIds,
      candidate_tool_names: candidateToolNames,
      context_requirements: contextReqs,
      requires_confirmation: requiresConfirmation,
      confidence,
      routing_duration_ms: durationMs,
      explanation,
    };
  }
}

export const vectorisRouter = new VectorisRouter();

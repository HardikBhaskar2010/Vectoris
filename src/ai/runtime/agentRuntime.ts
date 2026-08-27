/**
 * agentRuntime.ts — Vectoris AI Agent Control Loop & ReAct Execution Runtime.
 *
 * Source of Truth:
 *   - docs/04_AI/AGENT_RUNTIME.md (§1 Control Loop, §2 Bounds, §3 Error Contracts)
 *   - docs/04_AI/AI_SYSTEM.md (§2 Agentic Behavior & §5 Execution Router)
 *   - docs/04_AI/MODEL_GOVERNANCE.md (§3 Full Auditability Chain)
 */

import { buildAgentContext, type BuildContextParams } from "../context/contextBuilder";
import { toolRegistry, type ToolExecutionContext, type ToolExecutionResult } from "../tools/toolRegistry";
import { defaultModelAdapter, type ModelAdapter } from "../adapters/modelAdapter";
import { vectorisRouter, type RoutingDecision } from "../router/vectorisRouter";
import type {
  ToolTraceStep,
  EvidenceData,
  ActionProposal,
} from "../../data/types";

export interface RunInvestigationParams {
  sessionId?: string;
  projectId?: string | null;
  inquiry: string;
  userRole?: "viewer" | "editor" | "manager" | "admin" | "owner";
  userId?: string;
  modelAdapter?: ModelAdapter;
}

export interface AgentExecutionResult {
  content: string;
  thoughtTrace: string[];
  toolSteps: ToolTraceStep[];
  evidence?: EvidenceData;
  actionProposal?: ActionProposal;
  systemPromptVersion: string;
  modelVersion: string;
  routingDecision: RoutingDecision;
  executionDurationMs: number;
}

class AgentRuntime {
  /**
   * Executes a bounded, evidence-driven engineering investigation guided by the Vectoris Router.
   */
  public async runInvestigation(params: RunInvestigationParams): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const adapter = params.modelAdapter || defaultModelAdapter;
    const userRole = params.userRole || "editor";
    const userId = params.userId || "u-active";

    // 1. Vectoris Router: Classify Intent, Complexity, Capabilities, and Model Selection
    const routingDecision = await vectorisRouter.routeRequest({
      inquiry: params.inquiry,
      projectId: params.projectId,
      userRole,
    });

    // 2. Build Scoped Context based on Router Requirements
    const context = await buildAgentContext({
      sessionId: params.sessionId,
      projectId: params.projectId,
      inquiryText: params.inquiry,
      userRole,
      userId,
    });

    // 3. Planner Phase (Decomposition & Candidate Tool Filtering)
    const allTools = toolRegistry.listTools();
    const candidateTools = routingDecision.candidate_tool_names.length > 0
      ? allTools.filter((t) => routingDecision.candidate_tool_names.includes(t.name))
      : allTools;

    const { plan, toolCalls } = await adapter.generatePlanAndTools(
      params.inquiry,
      context,
      candidateTools
    );

    // 4. Execution Phase (ReAct Loop & Verification)
    const toolExecContext: ToolExecutionContext = {
      projectId: params.projectId,
      userRole,
      userId,
      activeSkillIds: context.activeSkills.map((s) => s.id),
    };

    const toolTraceSteps: ToolTraceStep[] = [];
    const toolResults: Array<{ tool: string; result: ToolExecutionResult }> = [];
    let aggregatedEvidence: EvidenceData | undefined = undefined;
    let actionProposal: ActionProposal | undefined = undefined;

    // Filter tools if execution mode is direct_synthesis
    const effectiveToolCalls = routingDecision.execution_mode === "direct_synthesis" ? [] : toolCalls;

    for (let i = 0; i < effectiveToolCalls.length; i++) {
      const tc = effectiveToolCalls[i];
      const stepId = `step-${i + 1}`;

      const execResult = await toolRegistry.executeTool(tc.name, tc.args, toolExecContext);
      toolResults.push({ tool: tc.name, result: execResult });

      toolTraceSteps.push({
        id: stepId,
        name: tc.name,
        label: `Step ${i + 1}: ${tc.name.replace(/_/g, " ")}`,
        status: execResult.success ? "complete" : "pending",
        output: execResult.success
          ? `Executed ${tc.name} successfully.`
          : `Failed: ${execResult.message}`,
      });

      // Collect evidence reference if present
      if (execResult.evidence && execResult.evidence.length > 0 && !aggregatedEvidence) {
        const ev = execResult.evidence[0];
        const coordStr = ev.coordinates
          ? `[${ev.coordinates.x}, ${ev.coordinates.y}, ${ev.coordinates.width}, ${ev.coordinates.height}]`
          : undefined;

        aggregatedEvidence = {
          doc_id: ev.document_id || "doc-pkg",
          doc_name: ev.document_name || "Electrical Drawing Package.pdf",
          sheet: ev.sheet_number || "E-104",
          sheet_id: ev.sheet_number || "E-104",
          region: "Grid Area D-4 / Feeder Riser",
          coordinates: coordStr,
          thumbnail_type: "panel",
          specs: [
            { label: "Provenance", value: ev.provenance_note },
            { label: "Tool Source", value: tc.name },
          ],
        };
      }

      // Check if tool produced a proposed line item
      if (
        execResult.data &&
        typeof execResult.data === "object" &&
        "proposal_type" in (execResult.data as Record<string, unknown>)
      ) {
        const propData = execResult.data as Record<string, unknown>;
        const item = propData.item as Record<string, unknown>;
        actionProposal = {
          id: `prop-${Date.now()}`,
          title: `Add ${item.quantity || 1}x ${item.name || "Equipment"} to Takeoff`,
          description: `Grounded in inspection of Sheet ${item.source_sheet || "E-104"}.`,
          item_code: (item.item_code as string) || "PROP-01",
          item_name: (item.name as string) || "Proposed Item",
          category: (item.category as string) || "Power Distribution",
          quantity: Number(item.quantity) || 1,
          unit: (item.unit as string) || "EA",
          status: "pending",
        };
      }
    }

    // 5. Synthesize Response
    const modelResponse = await adapter.synthesizeResponse(
      params.inquiry,
      context,
      plan,
      toolResults
    );

    return {
      content: modelResponse.content,
      thoughtTrace: [
        `[Router] Intent: ${routingDecision.intent} · Complexity: ${routingDecision.complexity} · Mode: ${routingDecision.execution_mode}`,
        ...modelResponse.thoughtProcess,
      ],
      toolSteps: toolTraceSteps,
      evidence: aggregatedEvidence,
      actionProposal,
      systemPromptVersion: context.systemPromptVersion,
      modelVersion: adapter.modelVersion,
      routingDecision,
      executionDurationMs: Date.now() - startTime,
    };
  }
}

export const agentRuntime = new AgentRuntime();

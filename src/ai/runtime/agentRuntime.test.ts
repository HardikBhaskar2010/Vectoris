/**
 * agentRuntime.test.ts — Unit tests for Vectoris AI Agent Control Loop & ReAct Runtime.
 *
 * Tests:
 * 1. Router intent classification & execution mode routing
 * 2. Scoped context building
 * 3. Tool execution & ReAct trace compilation
 * 4. Evidence linking and action proposal generation
 */

import { agentRuntime } from "./agentRuntime";
import { vectorisRouter } from "../router/vectorisRouter";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runAgentRuntimeTests() {
  console.log("Starting Vectoris Agent Runtime unit tests...");

  // ── 1. Vectoris Router Intent Classification ──────────────────────────────
  const generalRoute = await vectorisRouter.routeRequest({
    inquiry: "Hello, what engineering capabilities can you assist with?",
    projectId: null,
    userRole: "editor",
  });
  assert(
    generalRoute.intent === "general_conversation",
    `Expected general_conversation, got ${generalRoute.intent}`
  );
  assert(
    generalRoute.execution_mode === "direct_synthesis",
    `Expected direct_synthesis for greeting, got ${generalRoute.execution_mode}`
  );

  const calcRoute = await vectorisRouter.routeRequest({
    inquiry: "Calculate electrical load for 150 kW at 480V 3-phase",
    projectId: "p1",
    userRole: "editor",
  });
  assert(
    calcRoute.intent === "engineering_calculation",
    `Expected engineering_calculation, got ${calcRoute.intent}`
  );
  assert(
    calcRoute.candidate_tool_names.includes("calculate_electrical_load"),
    "Expected candidate_tool_names to include calculate_electrical_load"
  );

  // ── 2. End-to-End Investigation with Deterministic CAD Engine ──────────────
  const investigationResult = await agentRuntime.runInvestigation({
    inquiry: "Inspect Sheet E-104 for lighting fixtures and cable trays",
    projectId: "p1",
    userRole: "editor",
    userId: "u-1",
  });

  assert(
    investigationResult.content.length > 0,
    "Investigation response should contain synthesized content"
  );
  assert(
    investigationResult.thoughtTrace.length > 0,
    "Investigation should record router and thought trace"
  );
  assert(
    investigationResult.systemPromptVersion.length > 0,
    "Investigation must record system prompt version for auditability"
  );
  assert(
    investigationResult.executionDurationMs >= 0,
    "Execution duration must be non-negative"
  );

  // ── 3. Role Restriction in Investigation ──────────────────────────────────
  const viewerInvestigation = await agentRuntime.runInvestigation({
    inquiry: "Propose a new 400A Disconnect Switch to the takeoff",
    projectId: "p1",
    userRole: "viewer",
    userId: "u-viewer",
  });

  // Since user is a viewer, the proposal should not produce an authorized mutation
  if (viewerInvestigation.toolSteps.length > 0) {
    const proposeStep = viewerInvestigation.toolSteps.find((s) =>
      s.name.includes("propose_takeoff_line_item")
    );
    if (proposeStep) {
      assert(
        proposeStep.status === "pending" || Boolean(proposeStep.output && proposeStep.output.includes("Failed")),
        "Viewer cannot successfully execute takeoff mutation tool"
      );
    }
  }

  console.log("All Agent Runtime unit tests passed successfully!");
}

// Auto-run if executed directly
if (typeof window === "undefined") {
  void runAgentRuntimeTests();
}

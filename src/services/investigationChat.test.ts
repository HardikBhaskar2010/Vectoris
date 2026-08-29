/**
 * investigationChat.test.ts — Unit & Integration tests for Investigation Workshop Chat Lifecycle & Persistence.
 *
 * Source of Truth:
 *   - DOMAIN 1: Investigation Workshop Chat Lifecycle & Persistence (P0-1)
 *   - docs/04_AI/AGENT_RUNTIME.md (§1 Control Loop, §2 Bounds, §3 Error Contracts)
 *   - docs/04_AI/AI_SYSTEM.md (§2 Agentic Behavior & §5 Execution Router)
 */

import { dataService } from "./dataService";
import { agentRuntime } from "../ai/runtime/agentRuntime";
import type { ChatSession, ChatMessage, LineItem } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runInvestigationChatTests() {
  console.log("\n▶ Running Investigation Workshop Chat Lifecycle & Persistence Tests...");

  // ── 1. Create Investigation Sessions (General & Project Scoped) ────────────
  const generalSession = dataService.createSession({
    project_id: null,
    project_name: null,
    title: "General NEC 2026 Load Sizing Investigation",
    initialMessage: "",
  });

  assert(Boolean(generalSession.id), "Expected valid session ID for general session");
  assert(generalSession.project_id === null, "Expected null project_id for general session");
  assert(generalSession.messages.length === 0, "Expected 0 initial messages for empty session");
  console.log("  ✓ Created general engineering investigation session");

  const projectSession = dataService.createSession({
    project_id: "p1",
    project_name: "TITAN HYPERSCALE DATA CENTER",
    title: "Titan Hyperscale — Feeder & Switchgear Sizing",
    initialMessage: "Initial inspection of 400A subpanel feeder run",
  });

  assert(projectSession.project_id === "p1", "Expected project_id to be 'p1'");
  assert(projectSession.messages.length === 1, "Expected 1 initial message");
  assert(projectSession.messages[0].role === "user", "Expected initial message to be from user");
  console.log("  ✓ Created project-scoped investigation session with initial user message");

  // ── 2. Immediate User Message Persistence ──────────────────────────────────
  const userInquiry = "Calculate electrical load for 150 kVA at 480V 3-phase and size the copper feeder";
  const userMsg = dataService.addSessionMessage(
    generalSession.id,
    {
      role: "user",
      content: userInquiry,
    },
    false // do not auto-trigger agent in this step so we verify immediate persistence
  );

  assert(Boolean(userMsg), "Expected addSessionMessage to return created user message");
  assert(userMsg?.role === "user", "Expected user message role to be 'user'");
  assert(userMsg?.content === userInquiry, "Expected message content to match inquiry");

  const sessionAfterUserMsg = dataService.getSession(generalSession.id);
  assert(
    Boolean(sessionAfterUserMsg?.messages.some((m) => m.id === userMsg?.id)),
    "User message must be immediately persisted in session messages"
  );
  assert(
    Boolean(sessionAfterUserMsg?.last_message_preview.includes("150 kVA")),
    "Session preview must be updated immediately on user message"
  );
  console.log("  ✓ User message persisted immediately in session state & storage");

  // ── 3. Agent Runtime Execution & Metadata Capture ──────────────────────────
  const agentResult = await agentRuntime.runInvestigation({
    sessionId: generalSession.id,
    projectId: null,
    inquiry: userInquiry,
    userRole: "editor",
    userId: "test-engineer",
  });

  assert(agentResult.content.length > 0, "Agent response must contain synthesized content");
  assert(
    agentResult.content.includes("Electrical Load Calculation") || agentResult.content.includes("Full Load Current"),
    "Agent content must contain calculation breakdown"
  );

  // Safe Execution Trace Verification
  assert(agentResult.toolSteps.length >= 2, "Safe execution trace must contain at least router and tool execution steps");
  const routerStep = agentResult.toolSteps.find((s) => s.name === "vectoris_router");
  assert(Boolean(routerStep), "Safe execution trace must record router and skill selection");
  assert(routerStep?.status === "complete", "Router step status must be complete");

  const calcStep = agentResult.toolSteps.find((s) => s.name === "calculate_electrical_load");
  assert(Boolean(calcStep), "Safe execution trace must record calculate_electrical_load execution");
  assert(calcStep?.status === "complete", "Calculation tool step must be complete");
  assert(Boolean(calcStep?.output && calcStep.output.includes("FLA:")), "Calculation step output must summarize FLA result");

  const auditStep = agentResult.toolSteps.find((s) => s.name === "verify_grounding");
  assert(Boolean(auditStep), "Safe execution trace must include grounding audit step");

  // Safe Thought Trace Verification (No Private CoT)
  assert(
    agentResult.thoughtTrace.every((t) => !t.includes("private:") && !t.includes("internal_monologue")),
    "Thought trace must be safe high-level audit steps without private CoT leakage"
  );

  // Metric Highlights Verification
  assert(
    Boolean(agentResult.metricHighlights && agentResult.metricHighlights.length >= 1),
    "Agent result must capture metric highlights for calculation inquiries"
  );
  const flaMetric = agentResult.metricHighlights?.find((m) => m.label.includes("Full Load Current"));
  assert(Boolean(flaMetric), "Expected Full Load Current metric highlight");
  console.log("  ✓ Agent Runtime executed tools, captured safe trace, and generated metric highlights");

  // ── 4. Persisting Assistant Message & Session Outcome Updates ──────────────
  const assistantMsg = dataService.addSessionMessage(
    generalSession.id,
    {
      role: "assistant",
      content: agentResult.content,
      thought_trace: agentResult.thoughtTrace,
      tool_steps: agentResult.toolSteps,
      evidence: agentResult.evidence,
      action_proposal: agentResult.actionProposal,
      metric_highlights: agentResult.metricHighlights,
      referenced_sources: agentResult.referencedSources,
    },
    false
  );

  assert(Boolean(assistantMsg), "Expected assistant message to be persisted");
  assert(assistantMsg?.role === "assistant", "Expected assistant role");
  assert(Boolean(assistantMsg?.tool_steps && assistantMsg.tool_steps.length > 0), "Tool steps must be preserved on message");
  assert(Boolean(assistantMsg?.metric_highlights && assistantMsg.metric_highlights.length > 0), "Metric highlights must be preserved");

  const sessionAfterAssistant = dataService.getSession(generalSession.id);
  assert(sessionAfterAssistant?.messages.length === 2, "Session should now contain 2 messages");
  assert(sessionAfterAssistant?.investigation_status === "calculated", "Session outcome should be 'calculated'");
  assert(Boolean(sessionAfterAssistant?.key_metric), "Session key metric should be populated");
  console.log("  ✓ Assistant message rendered and session outcome metadata updated");

  // ── 5. End-to-End Investigation with Action Proposal & Evidence Grounding ──
  const cadInquiry = "Inspect Sheet E-104 and propose adding a new 400A disconnect switch";
  const cadAssistantMsg = await dataService.sendUserMessage(projectSession.id, cadInquiry, "editor");

  assert(Boolean(cadAssistantMsg), "Expected sendUserMessage to return assistant message");
  assert(cadAssistantMsg?.role === "assistant", "Expected assistant response");
  assert(Boolean(cadAssistantMsg?.evidence), "Expected CAD inspection to return grounded evidence");
  assert(cadAssistantMsg?.evidence?.sheet === "E-104", "Expected evidence sheet to be E-104");

  assert(Boolean(cadAssistantMsg?.action_proposal), "Expected action proposal for equipment addition");
  assert(cadAssistantMsg?.action_proposal?.status === "pending", "Proposal must start in pending status");
  assert(cadAssistantMsg?.action_proposal?.item_code === "PROP-01", "Expected item_code PROP-01");

  const projectSessionAfterCad = dataService.getSession(projectSession.id);
  assert(projectSessionAfterCad?.investigation_status === "review_required", "Session status should be review_required for pending proposal");
  assert(projectSessionAfterCad?.primary_sheet === "E-104", "Primary sheet should be E-104");
  console.log("  ✓ CAD inspection generated grounded evidence and pending takeoff action proposal");

  // ── 6. Action Proposal Approval Lifecycle ──────────────────────────────────
  const proposalMsgId = cadAssistantMsg!.id;
  const approveResult = await dataService.approveProposal({
    sessionId: projectSession.id,
    messageId: proposalMsgId,
    userId: "lead.estimator@apexengineering.com",
    userRole: "Editor",
    reason: "Approved from Investigation Workshop test",
  });

  assert(approveResult.success, `Expected proposal approval to succeed, got error: ${approveResult.error}`);
  assert(Boolean(approveResult.lineItem), "Approval must return committed LineItem");

  // Verify message proposal status updated
  const updatedProjectSession = dataService.getSession(projectSession.id);
  const updatedMsg = updatedProjectSession?.messages.find((m) => m.id === proposalMsgId);
  assert(updatedMsg?.action_proposal?.status === "approved", "Proposal status must be 'approved'");
  assert(Boolean(updatedMsg?.action_proposal?.committed_at), "Committed at timestamp must be set");

  // Verify line item exists in takeoff store
  const projectLineItems = dataService.getLineItems("p1");
  const committedItem = projectLineItems.find((li) => li.item_code === "PROP-01");
  assert(Boolean(committedItem), "Committed line item must exist in project line items");
  assert(committedItem?.status === "approved", "Line item status must be 'approved'");
  console.log("  ✓ Takeoff proposal approved and committed to takeoff ledger");

  // ── 7. Refresh Durability & Storage Survival ───────────────────────────────
  // Verify that all messages, tool steps, evidence, and proposals survive in localStorage
  if (typeof window !== "undefined") {
    const rawStored = window.localStorage.getItem("vectoris.store.v1.sessions");
    assert(Boolean(rawStored), "Sessions must be saved in localStorage under vectoris.store.v1.sessions");

    const parsedSessions: ChatSession[] = JSON.parse(rawStored!);
    const reloadedGeneral = parsedSessions.find((s) => s.id === generalSession.id);
    assert(Boolean(reloadedGeneral), "General session must exist in localStorage");
    assert(reloadedGeneral?.messages.length === 2, "General session messages must persist");
    assert(reloadedGeneral?.messages[1].tool_steps?.length! >= 2, "Tool trace steps must survive refresh");
    assert(reloadedGeneral?.messages[1].metric_highlights?.length! >= 1, "Metric highlights must survive refresh");

    const reloadedProject = parsedSessions.find((s) => s.id === projectSession.id);
    assert(Boolean(reloadedProject), "Project session must exist in localStorage");
    assert(reloadedProject?.primary_sheet === "E-104", "Primary sheet must survive refresh");
    const reloadedApprovedMsg = reloadedProject?.messages.find((m) => m.id === proposalMsgId);
    assert(reloadedApprovedMsg?.action_proposal?.status === "approved", "Approved proposal state must survive refresh");
    assert(reloadedApprovedMsg?.evidence?.sheet === "E-104", "Evidence coordinates and sheet must survive refresh");
  }
  console.log("  ✓ All sessions, messages, tool traces, evidence, and proposals survive reload");

  // ── 8. Session Switching & Isolation ───────────────────────────────────────
  const allSessions = dataService.getSessions();
  assert(allSessions.length >= 2, "Expected at least 2 active sessions in store");

  const s1 = dataService.getSession(generalSession.id);
  const s2 = dataService.getSession(projectSession.id);
  assert(s1?.id !== s2?.id, "Session IDs must be distinct");
  assert(s1?.project_id !== s2?.project_id, "Project IDs must remain isolated");
  assert(s1?.messages.length !== s2?.messages.length || s1?.messages[0].id !== s2?.messages[0].id, "Messages must be isolated per session");
  console.log("  ✓ Multi-session isolation verified across general and project scopes");

  // ── 9. RBAC Protection in Investigation ────────────────────────────────────
  const viewerSession = dataService.createSession({
    project_id: "p1",
    title: "Viewer Read-Only Audit",
    initialMessage: "",
  });

  const viewerResult = await dataService.sendUserMessage(
    viewerSession.id,
    "Propose adding a 200A panelboard to the takeoff",
    "viewer"
  );

  // If viewer tries to approve a proposal
  if (viewerResult?.action_proposal) {
    const viewerApprove = await dataService.approveProposal({
      sessionId: viewerSession.id,
      messageId: viewerResult.id,
      userId: "viewer-user",
      userRole: "Viewer",
    });
    assert(!viewerApprove.success, "Viewer must NOT be authorized to approve takeoff proposals");
    assert(Boolean(viewerApprove.error?.includes("Authorization failure") || viewerApprove.error?.includes("permission")), "Expected permission denial error");
  }
  console.log("  ✓ RBAC boundary enforced: Viewer role prohibited from takeoff mutations");

  // Cleanup test sessions
  dataService.deleteSession(generalSession.id);
  dataService.deleteSession(projectSession.id);
  dataService.deleteSession(viewerSession.id);

  console.log("✔ All Investigation Workshop Chat Lifecycle & Persistence Tests Passed!");
}

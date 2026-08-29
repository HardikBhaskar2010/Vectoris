/**
 * humanInTheLoop.test.ts — Verification suite for Human-In-The-Loop AI Mutation Workflow.
 *
 * Tests:
 * 1. AI Tool create_line_item produces status "pending_human_approval" without direct database mutation.
 * 2. Below-the-model RBAC authorization (Viewer role denied execution).
 * 3. Agent Runtime construction of ActionProposal UI payload.
 * 4. Human Approval workflow:
 *    - RBAC re-validation (Viewer rejected, Editor/Admin allowed).
 *    - Domain mutation creating real LineItem in Takeoff store.
 *    - Immutable audit record / CorrectionRecord generation.
 *    - Proposal state update to "approved".
 *    - Takeoff summary and ledger synchronization.
 * 5. Human Rejection workflow:
 *    - RBAC re-validation.
 *    - Proposal state update to "rejected" with rejection reason.
 * 6. Offline sync executor registration and replay.
 */

import { toolRegistry } from "./tools/toolRegistry";
import { agentRuntime } from "./runtime/agentRuntime";
import { dataService } from "../services/dataService";
import { offlineSyncService } from "../services/offlineSyncService";
import type { LineItem, ActionProposal } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runHumanInTheLoopTests() {
  console.log("Starting Human-In-The-Loop AI Mutation Workflow unit & integration tests...");

  // Create an isolated sample project for test determinism
  const testProject = dataService.seedSampleProject();
  const testProjectId = testProject.id;
  const initialLineItems = dataService.getLineItems(testProjectId);
  const initialCount = initialLineItems.length;

  // ── 1. Tool-Level Proposal Generation & Below-The-Model Authorization ───────
  console.log("  Testing tool-level proposal generation and authorization boundary...");

  // Viewer role must be denied
  const viewerToolRes = await toolRegistry.executeTool(
    "create_line_item",
    {
      name: "100A Automatic Transfer Switch",
      category: "Power Distribution",
      quantity: 1,
      unit: "EA",
      sourceSheet: "E-104",
      itemCode: "ATS-100",
    },
    {
      projectId: testProjectId,
      userRole: "viewer",
      userId: "u-viewer",
    }
  );

  assert(viewerToolRes.success === false, "Viewer role must not be able to execute create_line_item");
  assert(
    viewerToolRes.error_code === "permission_denied",
    `Expected error_code 'permission_denied', got '${viewerToolRes.error_code}'`
  );

  // Editor role executes tool
  const editorToolRes = await toolRegistry.executeTool(
    "create_line_item",
    {
      name: "400A Heavy Duty Disconnect Switch",
      category: "Power Distribution",
      quantity: 2,
      unit: "NOS",
      sourceSheet: "E-104",
      itemCode: "DSW-400A",
      description: "Grounded in Sheet E-104 inspection",
    },
    {
      projectId: testProjectId,
      userRole: "editor",
      userId: "u-editor",
    }
  );

  assert(editorToolRes.success === true, `create_line_item failed: ${editorToolRes.message}`);
  const toolData = editorToolRes.data as {
    proposal_type: string;
    item: Record<string, unknown>;
    status: string;
  };
  assert(toolData.proposal_type === "create_line_item", "Expected proposal_type 'create_line_item'");
  assert(toolData.status === "pending_human_approval", "Expected status 'pending_human_approval'");
  assert(toolData.item.name === "400A Heavy Duty Disconnect Switch", "Item name mismatch");
  assert(toolData.item.quantity === 2, "Item quantity mismatch");
  assert(toolData.item.source_sheet === "E-104", "Source sheet mismatch");

  // Invariant: Tool execution MUST NOT have directly inserted the line item
  const afterToolItems = dataService.getLineItems(testProjectId);
  assert(
    afterToolItems.length === initialCount,
    "Tool execution must NOT directly mutate the database or line items store without human approval"
  );

  // ── 2. Agent Runtime ActionProposal Construction ───────────────────────────
  console.log("  Testing agent runtime ActionProposal payload synthesis...");

  const session = dataService.createSession({
    project_id: testProjectId,
    project_name: "ABC Data Center",
    title: "Takeoff Addition Investigation",
  });

  const execResult = await agentRuntime.runInvestigation({
    sessionId: session.id,
    projectId: testProjectId,
    inquiry: "Propose adding 2 nos 400A disconnect switches on sheet E-104 to takeoff",
    userRole: "editor",
    userId: "u-lead-estimator",
  });

  assert(Boolean(execResult.actionProposal), "Expected agent runtime to produce an actionProposal");
  const proposal = execResult.actionProposal!;
  assert(proposal.status === "pending", `Expected proposal status 'pending', got '${proposal.status}'`);
  assert(proposal.category === "Power Distribution", "Expected category 'Power Distribution'");
  assert(Boolean(proposal.source_sheet), "Expected source_sheet to be populated");
  assert(Boolean(proposal.evidence_provenance), "Expected evidence_provenance to be populated");

  // Append assistant message with actionProposal to session
  const msg = dataService.addSessionMessage(session.id, {
    role: "assistant",
    content: execResult.content,
    thought_trace: execResult.thoughtTrace,
    tool_steps: execResult.toolSteps,
    evidence: execResult.evidence,
    action_proposal: proposal,
  });

  assert(Boolean(msg && msg.id), "Expected message to be created in session");
  const validMsgId = msg!.id;

  // ── 3. Human Approval Workflow & RBAC Re-validation ────────────────────────
  console.log("  Testing human approval workflow and RBAC re-validation...");

  // Viewer role must be denied approval
  const viewerApproveRes = await dataService.approveProposal({
    sessionId: session.id,
    messageId: validMsgId,
    userId: "Viewer User",
    userRole: "Viewer",
  });

  assert(viewerApproveRes.success === false, "Viewer role must NOT be permitted to approve proposals");
  assert(
    viewerApproveRes.error?.includes("Authorization failure") ?? false,
    `Expected authorization failure message, got: ${viewerApproveRes.error}`
  );

  // Authorized Editor/Admin approves the proposal
  const editorApproveRes = await dataService.approveProposal({
    sessionId: session.id,
    messageId: validMsgId,
    userId: "Elena Rostova",
    userRole: "Editor",
    reason: "Verified against sheet E-104 panel schedule",
  });

  assert(editorApproveRes.success === true, `Approve proposal failed: ${editorApproveRes.error}`);
  assert(Boolean(editorApproveRes.lineItem), "Expected created LineItem from approval");

  // Verify proposal state updated to 'approved'
  const updatedSession = dataService.getSession(session.id);
  const updatedMsg = updatedSession?.messages.find((m) => m.id === validMsgId);
  assert(
    updatedMsg?.action_proposal?.status === "approved",
    `Expected proposal status 'approved', got '${updatedMsg?.action_proposal?.status}'`
  );
  assert(
    updatedMsg?.action_proposal?.committed_by === "Elena Rostova",
    "Expected committed_by 'Elena Rostova'"
  );

  // Verify real LineItem created in Takeoff Ledger
  const currentLineItems = dataService.getLineItems(testProjectId);
  assert(
    currentLineItems.length === initialCount + 1,
    `Expected ${initialCount + 1} line items, got ${currentLineItems.length}`
  );

  const createdItem = currentLineItems.find((li) => li.item_code === proposal.item_code);
  assert(Boolean(createdItem), `Created line item '${proposal.item_code}' not found in takeoff store`);
  assert(createdItem!.status === "approved", "Created line item status must be 'approved'");
  assert(createdItem!.reviewed_by === "Elena Rostova", "Reviewed by mismatch");

  // Verify immutable audit history / CorrectionRecord
  assert(
    Array.isArray(createdItem!.correction_history) && createdItem!.correction_history.length > 0,
    "Expected correction history audit record on created line item"
  );
  const corr = createdItem!.correction_history![0];
  assert(corr.user === "Elena Rostova", "Correction user mismatch");
  assert(corr.new_value === "approved", "Correction new_value mismatch");
  assert(
    Boolean(corr.reason && corr.reason.includes("Verified against sheet E-104 panel schedule")),
    "Correction reason mismatch"
  );
  assert(corr.model_version === "v2.4-native", "Correction model_version mismatch");

  // Double approval must be rejected gracefully
  const secondApprove = await dataService.approveProposal({
    sessionId: session.id,
    messageId: validMsgId,
    userId: "Elena Rostova",
    userRole: "Editor",
  });
  assert(secondApprove.success === false, "Second approval on already approved proposal must fail");

  // ── 4. Human Rejection Workflow ────────────────────────────────────────────
  console.log("  Testing human rejection workflow and reason logging...");

  // Create a second session & proposal for rejection testing
  const rejectSession = dataService.createSession({
    project_id: testProjectId,
    project_name: "ABC Data Center",
    title: "Rejection Test Session",
  });

  const rejectProposalPayload: ActionProposal = {
    id: `prop-reject-${Date.now()}`,
    title: "Add 10x Fluorescent Troffers",
    description: "Proposed troffers",
    item_code: "FL-TROFFER",
    item_name: "Fluorescent Troffers",
    category: "Lighting",
    quantity: 10,
    unit: "EA",
    source_sheet: "E-101",
    evidence_provenance: "Detected on E-101",
    action_type: "create_line_item",
    status: "pending",
  };

  const rejectMsg = dataService.addSessionMessage(rejectSession.id, {
    role: "assistant",
    content: "Here is a proposed addition for fluorescent troffers.",
    action_proposal: rejectProposalPayload,
  });

  assert(Boolean(rejectMsg && rejectMsg.id), "Expected rejectMsg to be created");
  const validRejectMsgId = rejectMsg!.id;

  // Viewer cannot reject
  const viewerRejectRes = await dataService.rejectProposal({
    sessionId: rejectSession.id,
    messageId: validRejectMsgId,
    userId: "Viewer User",
    userRole: "Viewer",
  });
  assert(viewerRejectRes.success === false, "Viewer must not be able to reject proposals");

  // Authorized Lead Engineer rejects proposal with reason
  const rejectionReasonText = "False positive detection — room already converted to LED fixtures.";
  const editorRejectRes = await dataService.rejectProposal({
    sessionId: rejectSession.id,
    messageId: validRejectMsgId,
    userId: "Marcus Vance",
    userRole: "Owner",
    reason: rejectionReasonText,
  });

  assert(editorRejectRes.success === true, `Reject proposal failed: ${editorRejectRes.error}`);

  const reloadedRejectSession = dataService.getSession(rejectSession.id);
  const reloadedRejectMsg = reloadedRejectSession?.messages.find((m) => m.id === validRejectMsgId);
  assert(
    reloadedRejectMsg?.action_proposal?.status === "rejected",
    "Expected proposal status 'rejected'"
  );
  assert(
    reloadedRejectMsg?.action_proposal?.rejection_reason === rejectionReasonText,
    "Rejection reason mismatch"
  );
  assert(
    reloadedRejectMsg?.action_proposal?.committed_by === "Marcus Vance",
    "Committed by mismatch on rejection"
  );

  // ── 5. Offline Sync Queue Integration ─────────────────────────────────────
  console.log("  Testing offline mutation queue execution for proposal_status...");

  const offlineSession = dataService.createSession({
    project_id: testProjectId,
    project_name: "ABC Data Center",
    title: "Offline Sync Session",
  });

  const offlineProposalPayload: ActionProposal = {
    id: `prop-offline-${Date.now()}`,
    title: "Add 1x Surge Protective Device",
    description: "Proposed SPD",
    item_code: "SPD-01",
    item_name: "Surge Protective Device",
    category: "Power Distribution",
    quantity: 1,
    unit: "EA",
    source_sheet: "E-104",
    status: "pending",
  };

  const offlineMsg = dataService.addSessionMessage(offlineSession.id, {
    role: "assistant",
    content: "Proposed SPD line item.",
    action_proposal: offlineProposalPayload,
  });

  assert(Boolean(offlineMsg && offlineMsg.id), "Expected offlineMsg to be created");
  const validOfflineMsgId = offlineMsg!.id;

  // Enqueue offline proposal approval mutation
  const queuedMut = offlineSyncService.enqueue("proposal_status", {
    sessionId: offlineSession.id,
    messageId: validOfflineMsgId,
    status: "approved",
    user: "Offline Sync Worker",
    role: "Editor",
    reason: "Replayed offline approval",
  });

  assert(queuedMut.status === "pending", "Expected queued mutation status 'pending'");

  // Replay pending mutations
  const replayResult = await offlineSyncService.replayPendingMutations();
  assert(replayResult.replayed >= 1, "Expected at least 1 mutation to be replayed");

  const reloadedOfflineSession = dataService.getSession(offlineSession.id);
  const reloadedOfflineMsg = reloadedOfflineSession?.messages.find((m) => m.id === validOfflineMsgId);
  assert(
    reloadedOfflineMsg?.action_proposal?.status === "approved",
    "Offline replayed proposal must be approved"
  );

  // Clean up isolated test project
  dataService.deleteProject(testProjectId);

  console.log("All Human-In-The-Loop AI Mutation Workflow unit & integration tests passed successfully!");
}

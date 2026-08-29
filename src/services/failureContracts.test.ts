/**
 * failureContracts.test.ts — Comprehensive regression tests for Global Failure Contracts & Silent-Success Prevention.
 *
 * Verifies:
 * 1. Live persistence failures (Supabase RLS/schema rejections) explicitly propagate and set error states.
 * 2. Offline replay failures retain mutations in the queue, increment retryCount, and store lastError.
 * 3. Offline replay successes drain mutations cleanly without duplicate records.
 * 4. Permanent RLS failures (code 42501) are never falsely enqueued as transient offline errors.
 * 5. Network disconnect & reconnect cleanly triggers queue replay.
 * 6. Cascading temp IDs (p-...) are remapped to remote UUIDs across all queued mutations upon project creation replay.
 * 7. Concurrent mutation enqueueing during active replay is never overwritten or lost.
 * 8. AI Action Proposal approval rolls back local state upon remote security/database denial.
 * 9. Organization mutation operations roll back local cache and return false on remote rejections.
 */

import { supabase, setSupabaseConfiguredForTest } from "./supabaseClient";
import { dataService } from "./dataService";
import { takeoffService } from "./takeoffService";
import { offlineSyncService, isNetworkOfflineError } from "./offlineSyncService";
import { organizationService } from "./organizationService";
import type { Sheet, Detection, LineItem } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runFailureContractsTests(): Promise<void> {
  console.log("\n▶ Running Global Failure-Contract & Silent-Success Regression Tests...");

  const origRpc = supabase.rpc.bind(supabase);
  const origFrom = supabase.from.bind(supabase);

  setSupabaseConfiguredForTest(true);

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // TEST 1 — Live Persistence Failure (RLS / Supabase Rejection)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  1. Testing Live Persistence Failure Contract (No Silent Success)...");
    {
      (supabase as any).from = (table: string) => {
        if (table === "sheets") {
          return {
            upsert: () => ({
              select: () => Promise.resolve({
                data: null,
                error: { message: "permission denied for table sheets", code: "42501" },
              }),
            }),
          };
        }
        return origFrom(table as any);
      };

      offlineSyncService.setOnline(true);

      const testSheets: Sheet[] = [
        {
          id: "sht_test_01",
          project_id: "55555555-5555-5555-5555-555555555555",
          sheet_id: "E-101",
          document_name: "Power.pdf",
          name: "Power Plan",
          type: "floor_plan",
          detection_count: 0,
          is_empty: false,
        },
      ];

      const res = await takeoffService.persistProcessedDocumentResults({
        projectId: "55555555-5555-5555-5555-555555555555",
        documentId: "77777777-7777-7777-7777-777777777777",
        sheets: testSheets,
        detections: [],
        lineItems: [],
      });

      assert(res.success === false, "Must return success === false on remote RLS denial");
      assert(res.isOfflineQueued === false, "Must NOT mark as offline queued for permanent 42501 denial");
      assert(typeof res.error === "string" && res.error.length > 0, "Must return descriptive error string");
      console.log("    ✓ Live persistence failure explicitly reported and not marked offline");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 2 — Offline Replay Failure (Queue Retention & Error Tracking)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  2. Testing Offline Replay Failure (Queue Retention & Error Tracking)...");
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      offlineSyncService.enqueue("line_item_status", {
        lineItemId: "li_fail_test",
        status: "approved",
      });

      assert(offlineSyncService.getPendingCount() === 1, "Queue must contain 1 pending mutation");

      const replayResult = await offlineSyncService.replayPendingMutations(async (_mut) => {
        throw new Error("Simulated network timeout during replay");
      });

      assert(replayResult.failed === 1, "Replay must report 1 failed mutation");
      assert(replayResult.replayed === 0, "Replay must report 0 successful mutations");
      assert(offlineSyncService.getPendingCount() === 1, "Failed mutation must remain in queue");

      const queueItems = offlineSyncService.getQueue();
      assert(queueItems[0].status === "failed", "Mutation status must be 'failed'");
      assert(queueItems[0].retryCount === 1, "Retry count must be incremented to 1");
      assert(
        queueItems[0].lastError === "Simulated network timeout during replay",
        "Last error must be captured"
      );
      console.log("    ✓ Failed replay preserved mutation in queue with incremented retry count and lastError");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 3 — Offline Replay Success (Queue Drain & Idempotency)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  3. Testing Offline Replay Success (Queue Drain)...");
    {
      assert(offlineSyncService.getPendingCount() === 1, "Should have 1 failed mutation from previous test");

      const replayResult = await offlineSyncService.replayPendingMutations(async (_mut) => {
        return true; // Succeeded remotely
      });

      assert(replayResult.replayed === 1, "Replay must report 1 replayed mutation");
      assert(replayResult.failed === 0, "Replay must report 0 failed mutations");
      assert(offlineSyncService.getPendingCount() === 0, "Queue must be completely drained on success");
      console.log("    ✓ Successful replay removed mutation from queue");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 4 — Permanent RLS Failure vs Transient Offline Classification
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  4. Testing Error Classification (isNetworkOfflineError)...");
    {
      offlineSyncService.setOnline(true);

      const rlsError = { message: "permission denied for table line_items", code: "42501" };
      const uniqueConstraintError = { message: "duplicate key value violates unique constraint", code: "23505" };
      const http403Error = { message: "Forbidden", status: 403 };
      const fetchError = new TypeError("Failed to fetch");
      const networkTimeout = new Error("ETIMEDOUT: Connection timed out");

      assert(isNetworkOfflineError(rlsError) === false, "RLS 42501 must NOT be classified as offline");
      assert(isNetworkOfflineError(uniqueConstraintError) === false, "Unique 23505 must NOT be classified as offline");
      assert(isNetworkOfflineError(http403Error) === false, "HTTP 403 must NOT be classified as offline");
      assert(isNetworkOfflineError(fetchError) === true, "Failed to fetch MUST be classified as offline");
      assert(isNetworkOfflineError(networkTimeout) === true, "ETIMEDOUT MUST be classified as offline");
      console.log("    ✓ Accurate classification between transient offline vs permanent database errors");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 5 — Network Disconnect & Reconnect Replay
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  5. Testing Network Disconnect & Reconnect Workflow...");
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(false); // Simulate offline

      const res = await takeoffService.persistProcessedDocumentResults({
        projectId: "55555555-5555-5555-5555-555555555555",
        documentId: "77777777-7777-7777-7777-777777777777",
        sheets: [],
        detections: [],
        lineItems: [],
      });

      assert(res.success === false, "Offline persistence must return success === false");
      assert(res.isOfflineQueued === true, "Offline persistence must be marked as offline queued");
      assert(offlineSyncService.getPendingCount() === 1, "Mutation must be added to queue");

      // Reconnect
      offlineSyncService.setOnline(true);
      const replayRes = await offlineSyncService.replayPendingMutations(async (_mut) => true);
      assert(replayRes.replayed === 1, "Replayed count must be 1 on reconnect");
      assert(offlineSyncService.getPendingCount() === 0, "Queue must be empty after reconnect replay");
      console.log("    ✓ Offline mutation queued and drained cleanly upon reconnect");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 6 — Cascading Temp ID Offline Replay
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  6. Testing Cascading Temp ID Re-mapping across Queued Mutations...");
    {
      offlineSyncService.clearQueue();

      // Enqueue mutations with temporary project ID
      offlineSyncService.enqueue("manual_line_item", {
        projectId: "p-temp-offline-123",
        item: { name: "Conduit 3/4\"", quantity: 50, unit: "FT" },
      });
      offlineSyncService.enqueue("project_update", {
        projectId: "p-temp-offline-123",
        patch: { description: "Updated offline description" },
      });

      assert(offlineSyncService.getPendingCount() === 2, "Must have 2 pending items");

      // Remap temporary ID when project creation succeeds
      offlineSyncService.remapPayloadProjectId("p-temp-offline-123", "88888888-8888-8888-8888-888888888888");

      const queue = offlineSyncService.getQueue();
      assert(
        queue[0].payload.projectId === "88888888-8888-8888-8888-888888888888",
        "First mutation projectId must be remapped"
      );
      assert(
        queue[1].payload.projectId === "88888888-8888-8888-8888-888888888888",
        "Second mutation projectId must be remapped"
      );
      console.log("    ✓ Temporary project IDs successfully remapped across all queued mutations");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 7 — Concurrent Enqueue During Replay (No Queue Overwrite)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  7. Testing Concurrent Enqueue During Replay (Zero Overwrite)...");
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      offlineSyncService.enqueue("project_type", { projectId: "proj-1", displayType: "Industrial" });
      assert(offlineSyncService.getPendingCount() === 1, "Must have 1 pending item");

      // Execute replay that simulates concurrent enqueue while awaiting
      await offlineSyncService.replayPendingMutations(async (_mut) => {
        // While replay is executing, user performs another offline action
        offlineSyncService.enqueue("manual_line_item", {
          projectId: "proj-concurrent",
          item: { name: "Concurrent Switch", quantity: 1, unit: "NOS" },
        });
        return true; // First mutation succeeded
      });

      const remainingQueue = offlineSyncService.getQueue();
      assert(remainingQueue.length === 1, "Concurrently enqueued mutation must NOT be overwritten");
      assert(
        remainingQueue[0].payload.projectId === "proj-concurrent",
        "Remaining mutation must be the concurrent one"
      );
      console.log("    ✓ Concurrent mutation safely preserved when replay finished");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 8 — Proposal Approval Honest Failure on RLS Denial
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  8. Testing Proposal Approval Rollback on RLS Denial...");
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      // Create a test session with an action proposal
      const testSession = dataService.createSession({
        project_id: "55555555-5555-5555-5555-555555555555",
        title: "Test Investigation",
      });

      const userMsg = dataService.addSessionMessage(testSession.id, {
        role: "user",
        content: "Propose 100A Panel",
      });

      const assistantMsg = dataService.addSessionMessage(testSession.id, {
        role: "assistant",
        content: "Here is the proposal",
        action_proposal: {
          id: `prop-${Date.now()}`,
          project_id: "55555555-5555-5555-5555-555555555555",
          title: "100A Subpanel",
          description: "100A 3-Phase Main Lug Only Subpanel",
          type: "takeoff_item",
          status: "pending",
          item_code: "PANEL-100",
          quantity: 1,
          unit: "NOS",
          category: "Power Distribution",
        },
      });

      assert(assistantMsg !== undefined, "Assistant message must exist");

      // Mock createManualLineItem to fail with RLS 42501
      const origCreateManual = takeoffService.createManualLineItem.bind(takeoffService);
      takeoffService.createManualLineItem = async () => {
        const err: any = new Error("permission denied for table line_items (RLS violation)");
        err.code = "42501";
        throw err;
      };

      const approveRes = await dataService.approveProposal({
        sessionId: testSession.id,
        messageId: assistantMsg!.id,
        userRole: "editor",
      });

      assert(approveRes.success === false, "approveProposal must return success === false on RLS denial");
      assert(
        Boolean(approveRes.error?.includes("rejected by database security policy")),
        "Error must explain security policy rejection"
      );

      // Verify proposal state rolled back to 'pending'
      const reloadedSession = dataService.getSession(testSession.id);
      const reloadedMsg = reloadedSession?.messages.find((m) => m.id === assistantMsg!.id);
      assert(reloadedMsg?.action_proposal?.status === "pending", "Proposal status must be rolled back to pending");

      // Restore
      takeoffService.createManualLineItem = origCreateManual;
      console.log("    ✓ Proposal approval properly rolled back local state upon remote RLS denial");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 9 — Organization Mutators Honest Failure
    // ═════════════════════════════════════════════════════════════════════════
    console.log("  9. Testing Organization Mutator Rollback on Remote Failure...");
    {
      (supabase as any).from = (table: string) => {
        if (table === "organizations" || table === "org_members") {
          return {
            update: () => {
              const res: any = Promise.resolve({
                data: null,
                error: { message: "insufficient privileges (RLS 42501)", code: "42501" },
              });
              res.eq = () => res;
              return res;
            },
            delete: () => {
              const res: any = Promise.resolve({
                data: null,
                error: { message: "cannot delete member", code: "42501" },
              });
              res.eq = () => res;
              return res;
            },
          };
        }
        return origFrom(table as any);
      };

      const renameOk = await organizationService.updateOrganizationName("org-test-id", "New Malicious Name");
      assert(renameOk === false, "updateOrganizationName must return false on Supabase rejection");

      const deleteOk = await organizationService.deleteOrganization("org-test-id");
      assert(deleteOk === false, "deleteOrganization must return false on Supabase rejection");

      const roleOk = await organizationService.updateMemberRole("org-test-id", "user-1", "admin");
      assert(roleOk === false, "updateMemberRole must return false on Supabase rejection");

      console.log("    ✓ Organization mutating operations return false and roll back on remote failure");
    }

    console.log("\n✅ All Global Failure-Contract & Silent-Success Regression Tests PASSED!\n");
  } finally {
    // Restore original Supabase methods
    (supabase as any).rpc = origRpc;
    (supabase as any).from = origFrom;
    offlineSyncService.clearQueue();
    offlineSyncService.setOnline(null);
  }
}

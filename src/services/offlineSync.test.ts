/**
 * offlineSync.test.ts — Unit & Integration tests for Offline Mutation Queue.
 *
 * Tests:
 * 1. Enqueuing offline mutations with stable UUIDs
 * 2. Mutation Executor Registry Pattern
 * 3. Idempotent sequential replay
 * 4. Failure handling and error retention in queue
 */

import { offlineSyncService, type QueuedMutation } from "./offlineSyncService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runOfflineSyncTests(): Promise<void> {
  console.log("Starting Offline Mutation Queue unit tests...");

  // Test 1: Enqueue mutation with UUID
  const initialCount = offlineSyncService.getPendingCount();
  const mut = offlineSyncService.enqueue("line_item_status", {
    lineItemId: "li-test-1",
    status: "approved",
    reason: "Verified by lead engineer",
  });

  assert(Boolean(mut.id), "Expected mutation to have an ID");
  assert(Boolean(mut.mutation_id), "Expected mutation to have a stable mutation_id");
  assert(mut.status === "pending", "Expected mutation status to be 'pending'");
  assert(
    offlineSyncService.getPendingCount() === initialCount + 1,
    "Expected pending count to increment"
  );

  // Test 2: Register domain executor and replay
  const replayedMutations: QueuedMutation[] = [];
  offlineSyncService.registerExecutor("line_item_status", async (m) => {
    replayedMutations.push(m);
    return true; // Simulate successful Supabase write
  });

  const replayResult = await offlineSyncService.replayPendingMutations();
  assert(replayResult.replayed >= 1, "Expected at least 1 mutation replayed");
  assert(
    replayedMutations.some((m) => m.id === mut.id),
    "Expected registered executor to receive the queued mutation"
  );
  assert(offlineSyncService.getPendingCount() === 0, "Expected pending count to be 0 after successful replay");

  // Test 3: Failure handling and error retention
  const failMut = offlineSyncService.enqueue("manual_line_item", {
    projectId: "p1",
    lineItem: { id: "li-fail", name: "Broken Item" },
  });

  offlineSyncService.registerExecutor("manual_line_item", async () => {
    throw new Error("Simulated Supabase 503 Network Timeout");
  });

  const failResult = await offlineSyncService.replayPendingMutations();
  assert(failResult.failed >= 1, "Expected at least 1 mutation replay failure");
  assert(offlineSyncService.getPendingCount() === 1, "Expected failed mutation to remain in queue");

  // Test 4: Re-register working executor and verify recovery (Idempotency)
  offlineSyncService.registerExecutor("manual_line_item", async () => {
    return true;
  });

  const recoveryResult = await offlineSyncService.replayPendingMutations();
  assert(recoveryResult.replayed === 1, "Expected 1 recovered mutation replay");
  assert(offlineSyncService.getPendingCount() === 0, "Expected queue to be empty after recovery");

  console.log("All Offline Mutation Queue unit tests passed successfully!");
}

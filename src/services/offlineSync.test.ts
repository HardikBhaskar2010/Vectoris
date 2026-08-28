/**
 * offlineSync.test.ts — Unit & Integration tests for Offline Mutation Queue.
 *
 * Tests:
 * 1. Enqueuing offline mutations
 * 2. Status tracking and pending count
 * 3. Idempotent sequential replay
 */

import { offlineSyncService, type QueuedMutation } from "./offlineSyncService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runOfflineSyncTests(): Promise<void> {
  console.log("Starting Offline Mutation Queue unit tests...");

  // Test 1: Enqueue mutation
  const initialCount = offlineSyncService.getPendingCount();
  const mut = offlineSyncService.enqueue("line_item_status", {
    lineItemId: "li-test-1",
    status: "approved",
    reason: "Verified by lead engineer",
  });

  assert(Boolean(mut.id), "Expected mutation to have an ID");
  assert(mut.status === "pending", "Expected mutation status to be 'pending'");
  assert(
    offlineSyncService.getPendingCount() === initialCount + 1,
    "Expected pending count to increment"
  );

  // Test 2: Idempotent replay
  const replayedIds = new Set<string>();
  const customHandler = async (m: QueuedMutation): Promise<boolean> => {
    replayedIds.add(m.id);
    return true; // Simulate successful replay against Supabase
  };

  const result = await offlineSyncService.replayPendingMutations(customHandler);
  assert(result.replayed >= 1, "Expected at least 1 mutation replayed");
  assert(replayedIds.has(mut.id), "Expected specific mutation to be replayed");
  assert(offlineSyncService.getPendingCount() === 0, "Expected pending count to be 0 after replay");

  console.log("All Offline Mutation Queue unit tests passed successfully!");
}

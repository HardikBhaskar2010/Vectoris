/**
 * testRunner.ts — Unified Test Runner for Vectoris Subsystem Verification.
 *
 * Runs:
 * 1. Auth & Password Reset tests (src/services/auth.test.ts)
 * 2. Project Plan state machine & claim diff tests (src/services/projectPlan.test.ts)
 * 3. AI Tool Registry & RBAC tests (src/ai/tools/toolRegistry.test.ts)
 * 4. Agent Runtime & Router tests (src/ai/runtime/agentRuntime.test.ts)
 */

import { runAuthTests } from "./services/auth.test";
import { runProjectPlanTests } from "./services/projectPlan.test";
import { runToolRegistryTests } from "./ai/tools/toolRegistry.test";
import { runAgentRuntimeTests } from "./ai/runtime/agentRuntime.test";
import { runDocumentPipelineTests } from "./services/documentPipeline.test";
import { runOfflineSyncTests } from "./services/offlineSync.test";

export async function runAllTests() {
  console.log("==================================================");
  console.log("VECTORIS COMPREHENSIVE TEST SUITE EXECUTION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // 1. Auth Tests
  try {
    await runAuthTests();
    passed++;
  } catch (err) {
    console.error("❌ Auth test failure:", err);
    failed++;
  }

  // 2. Project Plan Tests
  try {
    runProjectPlanTests();
    passed++;
  } catch (err) {
    console.error("❌ Project Plan test failure:", err);
    failed++;
  }

  // 3. Tool Registry Tests
  try {
    await runToolRegistryTests();
    passed++;
  } catch (err) {
    console.error("❌ Tool Registry test failure:", err);
    failed++;
  }

  // 4. Agent Runtime Tests
  try {
    await runAgentRuntimeTests();
    passed++;
  } catch (err) {
    console.error("❌ Agent Runtime test failure:", err);
    failed++;
  }

  // 5. Document Pipeline & Perception Tests
  try {
    await runDocumentPipelineTests();
    passed++;
  } catch (err) {
    console.error("❌ Document Pipeline test failure:", err);
    failed++;
  }

  // 6. Offline Mutation Queue & Replay Tests
  try {
    await runOfflineSyncTests();
    passed++;
  } catch (err) {
    console.error("❌ Offline Sync test failure:", err);
    failed++;
  }

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    throw new Error(`Test run completed with ${failed} failure(s).`);
  }
}

if (typeof window === "undefined") {
  void runAllTests();
}

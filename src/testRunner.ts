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
import { runDataServiceUXTests } from "./services/dataServiceUX.test";
import { runOrganizationServiceTests } from "./services/organizationService.test";
import { runSecurityBoundaryTests } from "./services/securityBoundary.test";
import { runEvidenceProvenanceTests } from "./services/evidenceProvenance.test";
import { runHumanInTheLoopTests } from "./ai/humanInTheLoop.test";
import { runInvestigationChatTests } from "./services/investigationChat.test";
import { runPersistenceHonestyTests } from "./services/persistenceHonesty.test";
import { runFailureContractsTests } from "./services/failureContracts.test";
import { runE2EForensicAudit } from "./services/e2eForensicAudit.test";
import { runPilotValidation } from "./services/pilotValidation.test";

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

  // 7. UX Interactivity & DataService Tests
  try {
    await runDataServiceUXTests();
    passed++;
  } catch (err) {
    console.error("❌ DataService UX test failure:", err);
    failed++;
  }

  // 8. Organization & Multi-Tenant Workspace Tests
  try {
    const orgPass = await runOrganizationServiceTests();
    if (orgPass) {
      passed++;
    } else {
      failed++;
    }
  } catch (err) {
    console.error("❌ Organization & Workspace test failure:", err);
    failed++;
  }

  // 9. Security Boundary & Zero Client Secrets Tests
  try {
    const secPass = await runSecurityBoundaryTests();
    if (secPass) {
      passed++;
    } else {
      failed++;
    }
  } catch (err) {
    console.error("❌ Security Boundary test failure:", err);
    failed++;
  }

  // 10. Evidence & Geometry Provenance Tests
  try {
    await runEvidenceProvenanceTests();
    passed++;
  } catch (err) {
    console.error("❌ Evidence & Geometry Provenance test failure:", err);
    failed++;
  }

  // 11. Human-In-The-Loop AI Mutation Workflow Tests
  try {
    await runHumanInTheLoopTests();
    passed++;
  } catch (err) {
    console.error("❌ Human-In-The-Loop test failure:", err);
    failed++;
  }

  // 12. Investigation Workshop Chat Lifecycle & Durability Tests
  try {
    await runInvestigationChatTests();
    passed++;
  } catch (err) {
    console.error("❌ Investigation Workshop Chat test failure:", err);
    failed++;
  }

  // 13. Honest Persistence & Offline Semantics Tests (Domain 2)
  try {
    await runPersistenceHonestyTests();
    passed++;
  } catch (err) {
    console.error("❌ Honest Persistence & Offline Semantics test failure:", err);
    failed++;
  }

  // 14. Global Failure-Contract & Silent-Success Regression Tests
  try {
    await runFailureContractsTests();
    passed++;
  } catch (err) {
    console.error("❌ Global Failure-Contract test failure:", err);
    failed++;
  }

  // 15. E2E Forensic Reality Audit (10 Real-World Chains)
  try {
    await runE2EForensicAudit();
    passed++;
  } catch (err) {
    console.error("❌ E2E Forensic Reality Audit failure:", err);
    failed++;
  }

  // 16. Real-World Electrical Engineer Pilot Validation (12 Steps)
  try {
    await runPilotValidation();
    passed++;
  } catch (err) {
    console.error("❌ Pilot Validation failure:", err);
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

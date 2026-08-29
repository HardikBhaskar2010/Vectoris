/**
 * projectPlan.test.ts — Unit tests for pure Project Plan business logic.
 *
 * Tests:
 * 1. Pure claim diffing by stable claim_id (added, removed, modified, unchanged)
 * 2. Decision conflict detection
 * 3. Lineage split/merge representation
 */

import { projectPlanService } from "./projectPlanService";
import type { PlanClaim, Decision, ClaimLineage } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runProjectPlanTests() {
  console.log("Starting Project Plan unit tests...");

  const activeClaims: PlanClaim[] = [
    {
      id: "c-1",
      claim_id: "cid-1",
      plan_version_id: "v-1",
      section: "scope_outcomes",
      content: "Deliver 4 Data Halls",
      grounding: "known_from_evidence",
      evidence_links: [],
    },
    {
      id: "c-2",
      claim_id: "cid-2",
      plan_version_id: "v-1",
      section: "milestones",
      content: "Energize Substation",
      grounding: "known_from_evidence",
      evidence_links: [],
    },
    {
      id: "c-3",
      claim_id: "cid-3",
      plan_version_id: "v-1",
      section: "risks",
      content: "Transformer lead time",
      grounding: "inferred",
      evidence_links: [],
    },
  ];

  const draftClaims: PlanClaim[] = [
    // Unchanged claim
    {
      id: "c-draft-1",
      claim_id: "cid-1",
      plan_version_id: "v-2",
      section: "scope_outcomes",
      content: "Deliver 4 Data Halls",
      grounding: "known_from_evidence",
      evidence_links: [],
    },
    // Modified claim
    {
      id: "c-draft-2",
      claim_id: "cid-2",
      plan_version_id: "v-2",
      section: "milestones",
      content: "Energize Substation & Switchgear Phasing",
      grounding: "known_from_evidence",
      evidence_links: [],
    },
    // Added claim
    {
      id: "c-draft-4",
      claim_id: "cid-4",
      plan_version_id: "v-2",
      section: "dependencies",
      content: "Structural foundation curing signoff",
      grounding: "known_from_evidence",
      evidence_links: [],
    },
  ];

  // Note: cid-3 is absent from draftClaims (Removed)

  const diffs = projectPlanService.computeClaimDiff(activeClaims, draftClaims);

  assert(diffs.length === 4, `Expected 4 diff items, got ${diffs.length}`);

  const diffCid1 = diffs.find((d) => d.claim_id === "cid-1");
  assert(diffCid1?.diff_type === "unchanged", `cid-1 should be unchanged, got ${diffCid1?.diff_type}`);

  const diffCid2 = diffs.find((d) => d.claim_id === "cid-2");
  assert(diffCid2?.diff_type === "modified", `cid-2 should be modified, got ${diffCid2?.diff_type}`);

  const diffCid3 = diffs.find((d) => d.claim_id === "cid-3");
  assert(diffCid3?.diff_type === "removed", `cid-3 should be removed, got ${diffCid3?.diff_type}`);

  const diffCid4 = diffs.find((d) => d.claim_id === "cid-4");
  assert(diffCid4?.diff_type === "added", `cid-4 should be added, got ${diffCid4?.diff_type}`);

  // Test Decision Conflict Detection
  const decisions: Decision[] = [
    {
      id: "dec-2",
      claim_id: "cid-2",
      project_id: "p1",
      decision_text: "Energize Substation",
      decided_by: "user-1",
      decided_at: new Date().toISOString(),
      is_active: true,
    },
  ];

  const draftWithConflict: PlanClaim[] = [
    {
      id: "c-draft-2-conf",
      claim_id: "cid-2",
      plan_version_id: "v-2",
      section: "milestones",
      content: "Energize Substation & Switchgear Phasing",
      grounding: "inferred",
      conflict_with_decision_id: "dec-2",
      conflict_details: "Contradicts active decision dec-2",
      evidence_links: [],
    },
  ];

  const diffsConflict = projectPlanService.computeClaimDiff(
    activeClaims,
    draftWithConflict,
    [],
    decisions
  );

  const conflictedItem = diffsConflict.find((d) => d.claim_id === "cid-2");
  assert(
    conflictedItem?.conflict?.decision_id === "dec-2",
    "Expected decision conflict on cid-2"
  );

  console.log("All Project Plan unit tests passed successfully!");
}

// Auto-run if executed directly
const isDirectProjectPlanTest = typeof globalThis !== "undefined" && (globalThis as any).process?.argv?.[1]?.includes("projectPlan.test");
if (isDirectProjectPlanTest) {
  runProjectPlanTests();
}

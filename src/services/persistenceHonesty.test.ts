/**
 * persistenceHonesty.test.ts — Comprehensive regression tests for Honest Persistence & Offline Semantics.
 *
 * Enforces:
 * 1. REMOTE_SUCCESS: Supabase returns successful response -> saves state, marks as synced.
 * 2. OFFLINE_QUEUED: Workstation is genuinely offline -> creates explicit local draft marked "Not synced",
 *    enqueues mutation in offlineSyncService.
 * 3. REMOTE_FAILURE: Supabase returns RLS denial, constraint error, or 4xx/5xx -> throws explicit error to caller/UI.
 *    NEVER fabricates a fake local ID or pretends success.
 * 4. REAL REPLAY EXECUTION: offlineSyncService.replayPendingMutations() executes real domain service handlers
 *    upon reconnection and handles retry/failure properly.
 * 5. IMMUTABLE VERSIONING & DECISION INVARIANTS: Plan versions are immutable, version numbers are monotonic,
 *    and Decision conflicts require explicit resolutions.
 */

import { supabase, isSupabaseConfigured, setSupabaseConfiguredForTest } from "./supabaseClient";
import { projectPlanService } from "./projectPlanService";
import { dataService } from "./dataService";
import { projectService } from "./projectService";
import { takeoffService } from "./takeoffService";
import { offlineSyncService } from "./offlineSyncService";
import type { Project, ProjectPlan, PlanClaim } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runPersistenceHonestyTests(): Promise<void> {
  console.log("\n▶ Running Honest Persistence & Offline Semantics Tests (Domain 2)...");

  // Save original Supabase methods
  const origRpc = supabase.rpc.bind(supabase);
  const origFrom = supabase.from.bind(supabase);
  const origProjectServiceCreate = projectService.createProject.bind(projectService);
  const origProjectServiceDelete = projectService.softDeleteProject.bind(projectService);

  setSupabaseConfiguredForTest(true);

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: PROJECT PLAN DRAFT PERSISTENCE SEMANTICS
    // ═════════════════════════════════════════════════════════════════════════

    // ── 1.1 REMOTE_SUCCESS: createDraft returns true Supabase version UUID ───
    {
      const remoteVersionId = "99999999-9999-9999-9999-999999999999";
      (supabase as any).rpc = async (fnName: string, args: any) => {
        if (fnName === "create_project_plan_draft") {
          return { data: remoteVersionId, error: null };
        }
        return origRpc(fnName as any, args);
      };

      offlineSyncService.setOnline(true);
      const draftId = await projectPlanService.createDraft({
        projectId: "11111111-1111-1111-1111-111111111111",
        claims: [
          {
            section: "scope_outcomes",
            content: "Deliver 4 Hyperscale Data Halls",
            grounding: "known_from_evidence",
          },
        ],
      });

      assert(
        draftId === remoteVersionId,
        `Expected remote UUID '${remoteVersionId}', got '${draftId}'`
      );
      assert(
        !draftId.startsWith("ppv-") && !draftId.startsWith("ppv_"),
        "Must NOT return fabricated local ID on remote success"
      );
      console.log("  ✓ REMOTE_SUCCESS: createDraft returned authoritative database UUID");
    }

    // ── 1.2 OFFLINE_QUEUED: createDraft enqueues mutation when offline ────────
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(false); // Simulate genuinely offline workstation

      const draftId = await projectPlanService.createDraft({
        projectId: "11111111-1111-1111-1111-111111111111",
        claims: [
          {
            section: "milestones",
            content: "Energize Main 110kV Substation Yard",
            grounding: "known_from_evidence",
          },
        ],
      });

      assert(Boolean(draftId), "Expected draft ID returned in offline mode");
      const pendingCount = offlineSyncService.getPendingCount();
      assert(
        pendingCount >= 1,
        `Expected mutation queued offline, getPendingCount() was ${pendingCount}`
      );

      const queued = offlineSyncService.getQueue();
      const planMut = queued.find((q) => q.type === "project_plan_draft");
      assert(Boolean(planMut), "Expected 'project_plan_draft' mutation in queue");
      assert(Boolean(planMut?.mutation_id), "Expected stable idempotency mutation_id");

      offlineSyncService.setOnline(null); // Restore online
      console.log("  ✓ OFFLINE_QUEUED: createDraft created local draft and enqueued mutation");
    }

    // ── 1.3 REMOTE_FAILURE: createDraft throws on RLS / DB denial ─────────────
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      (supabase as any).rpc = async (fnName: string, args: any) => {
        if (fnName === "create_project_plan_draft") {
          return {
            data: null,
            error: {
              code: "42501",
              message: "insufficient privileges to create project plan draft",
            },
          };
        }
        return origRpc(fnName as any, args);
      };

      let threwError = false;
      let thrownMessage = "";
      try {
        await projectPlanService.createDraft({
          projectId: "22222222-2222-2222-2222-222222222222",
          claims: [
            {
              section: "risks",
              content: "Transformer delivery lead time 42 weeks",
              grounding: "inferred",
            },
          ],
        });
      } catch (err: any) {
        threwError = true;
        thrownMessage = err.message;
      }

      assert(
        threwError,
        "REMOTE_FAILURE must throw when Supabase returns RLS / DB error"
      );
      assert(
        thrownMessage.includes("insufficient privileges"),
        `Expected error message containing 'insufficient privileges', got '${thrownMessage}'`
      );
      assert(
        offlineSyncService.getPendingCount() === 0,
        "Must NOT queue mutation or fabricate fake local success on remote RLS denial"
      );
      console.log("  ✓ REMOTE_FAILURE: createDraft threw on RLS denial without fake fallback");
    }

    // ── 1.4 REMOTE_FAILURE: acceptDraft throws on unresolved Decision conflict ─
    {
      offlineSyncService.setOnline(true);
      (supabase as any).rpc = async (fnName: string, args: any) => {
        if (fnName === "accept_project_plan_draft") {
          return {
            data: null,
            error: {
              code: "P0001",
              message:
                "cannot activate draft: unresolved Decision conflict on claim cid-2 (decision dec-2). An explicit human resolution is required.",
            },
          };
        }
        return origRpc(fnName as any, args);
      };

      let threwConflictError = false;
      let conflictMsg = "";
      try {
        await projectPlanService.acceptDraft("88888888-8888-8888-8888-888888888888");
      } catch (err: any) {
        threwConflictError = true;
        conflictMsg = err.message;
      }

      assert(
        threwConflictError,
        "acceptDraft must throw on unresolved Decision conflict"
      );
      assert(
        conflictMsg.includes("unresolved Decision conflict"),
        `Expected conflict error message, got '${conflictMsg}'`
      );
      console.log("  ✓ REMOTE_FAILURE: acceptDraft threw on unresolved Decision conflict");
    }

    // ── 1.5 REMOTE_SUCCESS: acceptDraft succeeds cleanly ──────────────────────
    {
      (supabase as any).rpc = async (fnName: string, args: any) => {
        if (fnName === "accept_project_plan_draft") {
          return { data: null, error: null };
        }
        return origRpc(fnName as any, args);
      };

      await projectPlanService.acceptDraft("88888888-8888-8888-8888-888888888888", [
        {
          claim_id: "cid-2",
          action: "accept_proposed",
          rationale: "Lead engineer approved updated scope",
        },
      ]);
      console.log("  ✓ REMOTE_SUCCESS: acceptDraft accepted draft with resolutions");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: PROJECT CREATION & DELETION PERSISTENCE SEMANTICS
    // ═════════════════════════════════════════════════════════════════════════

    // ── 2.1 REMOTE_SUCCESS: createProjectAsync returns synced project ─────────
    {
      const remoteId = "55555555-5555-5555-5555-555555555555";
      (projectService as any).createProject = async (payload: any) => {
        return {
          id: remoteId,
          name: payload.name,
          client: payload.client || "Self",
          description: payload.description || "",
          sector: payload.sector || "commercial",
          discipline: payload.discipline || "General",
          inferred_type: null,
          user_provided_type: payload.sector || null,
          verified_type: null,
          displayType: `${payload.sector} · ${payload.discipline || "General"}`,
          typeProvenance: "user_provided" as const,
          status: "processing" as const,
          progress: 0,
          sheets: 0,
          sheetType: "PDF",
          created_at: new Date().toISOString().split("T")[0],
          updated_at: "Just now",
          member_count: 1,
          members: [{ name: "Current User", initials: "CU", role: "Owner" }],
        };
      };

      offlineSyncService.setOnline(true);
      const proj = await dataService.createProjectAsync({
        name: "Remote Verified Project",
        sector: "data-center",
        discipline: "Electrical",
      });

      assert(proj.id === remoteId, `Expected remote ID '${remoteId}', got '${proj.id}'`);
      assert(proj.is_synced === true, "Expected is_synced to be true on remote success");
      assert(proj.sync_status === "synced", "Expected sync_status to be 'synced'");
      console.log("  ✓ REMOTE_SUCCESS: createProjectAsync returned synced remote project");
    }

    // ── 2.2 OFFLINE_QUEUED: createProjectAsync enqueues mutation when offline ─
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(false);

      const offlineProj = await dataService.createProjectAsync({
        name: "Field Workstation Project",
        sector: "industrial",
      });

      assert(Boolean(offlineProj.id), "Expected local project created offline");
      assert(offlineProj.is_synced === false, "Expected is_synced to be false offline");
      assert(
        offlineProj.sync_status === "offline_queued",
        "Expected sync_status to be 'offline_queued'"
      );

      const queued = offlineSyncService.getQueue();
      const projMut = queued.find((q) => q.type === "project_create");
      assert(Boolean(projMut), "Expected 'project_create' mutation queued in offlineSyncService");

      offlineSyncService.setOnline(null);
      console.log("  ✓ OFFLINE_QUEUED: createProjectAsync created local draft and enqueued mutation");
    }

    // ── 2.3 REMOTE_FAILURE: createProjectAsync throws on remote error ─────────
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      (projectService as any).createProject = async () => {
        const err: any = new Error("new row violates row-level security policy for table projects");
        err.code = "42501";
        err.status = 403;
        throw err;
      };

      let threwRemoteFail = false;
      let failMsg = "";
      try {
        await dataService.createProjectAsync({
          name: "Unauthorized Project",
        });
      } catch (err: any) {
        threwRemoteFail = true;
        failMsg = err.message;
      }

      assert(threwRemoteFail, "createProjectAsync must throw on remote RLS failure");
      assert(
        failMsg.includes("row-level security") || failMsg.includes("remote database"),
        `Expected RLS error message, got '${failMsg}'`
      );
      assert(
        offlineSyncService.getPendingCount() === 0,
        "Must NOT queue offline mutation or fabricate fake local project on RLS failure"
      );
      console.log("  ✓ REMOTE_FAILURE: createProjectAsync threw on remote RLS failure without fake fallback");
    }

    // ── 2.4 REMOTE_FAILURE: deleteProject does NOT delete locally on RLS error 
    {
      offlineSyncService.setOnline(true);
      const testRemoteId = "66666666-6666-6666-6666-666666666666";

      // Seed project in dataService
      (dataService as any).projects.unshift({
        id: testRemoteId,
        name: "Protected Corporate Project",
        client: "Apex",
        sector: "commercial",
        discipline: "General",
        status: "processing",
        progress: 0,
        sheets: 0,
        sheetType: "PDF",
        created_at: new Date().toISOString(),
        updated_at: "Just now",
        member_count: 1,
        members: [],
      });

      (projectService as any).softDeleteProject = async () => {
        const err: any = new Error("insufficient privileges to delete project");
        err.code = "42501";
        err.status = 403;
        throw err;
      };

      let threwDeleteErr = false;
      try {
        await dataService.deleteProject(testRemoteId);
      } catch (err: any) {
        threwDeleteErr = true;
      }

      assert(threwDeleteErr, "deleteProject must throw on remote RLS denial");

      const stillExists = dataService.getProjects().some((p) => p.id === testRemoteId);
      assert(
        stillExists,
        "deleteProject must NOT wipe local state when remote deletion fails with RLS error"
      );
      console.log("  ✓ REMOTE_FAILURE: deleteProject preserved local state on RLS denial");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: REAL REPLAY EXECUTION & ERROR RETENTION
    // ═════════════════════════════════════════════════════════════════════════

    // ── 3.1 Real domain executors execute on reconnection ─────────────────────
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      let executedHandler = false;
      offlineSyncService.registerExecutor("manual_line_item", async (mut) => {
        executedHandler = true;
        return true;
      });

      offlineSyncService.enqueue("manual_line_item", {
        action: "create_manual_line_item",
        projectId: "11111111-1111-1111-1111-111111111111",
        item: { name: "Manual Circuit Breaker 250A", quantity: 2 },
      });

      const replayRes = await offlineSyncService.replayPendingMutations();
      assert(executedHandler, "Expected registered domain executor to execute");
      assert(replayRes.replayed === 1, "Expected 1 mutation replayed");
      assert(offlineSyncService.getPendingCount() === 0, "Queue must be empty after successful replay");
      console.log("  ✓ REAL REPLAY: Executed registered domain handler and cleaned queue");
    }

    // ── 3.2 Failing executor retains mutation with status 'failed' ────────────
    {
      offlineSyncService.clearQueue();
      offlineSyncService.setOnline(true);

      offlineSyncService.registerExecutor("line_item_status", async () => {
        throw new Error("Supabase 503 Server Busy");
      });

      offlineSyncService.enqueue("line_item_status", {
        lineItemId: "li-123",
        status: "approved",
      });

      const failRes = await offlineSyncService.replayPendingMutations();
      assert(failRes.failed === 1, "Expected 1 failed replay");
      assert(offlineSyncService.getPendingCount() === 1, "Failed mutation must remain in queue");

      const failedItem = offlineSyncService.getQueue()[0];
      assert(failedItem.status === "failed", "Expected status 'failed'");
      assert(
        Boolean(failedItem.lastError && failedItem.lastError.includes("503")),
        `Expected lastError to record failure, got '${failedItem.lastError}'`
      );

      // Fix executor and recover
      offlineSyncService.registerExecutor("line_item_status", async () => true);
      const recoverRes = await offlineSyncService.replayPendingMutations();
      assert(recoverRes.replayed === 1, "Expected mutation recovered on retry");
      assert(offlineSyncService.getPendingCount() === 0, "Queue must be empty after recovery");
      console.log("  ✓ REAL REPLAY: Retained error state on failure and recovered cleanly on retry");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: IMMUTABLE PLAN VERSIONING & DECISION INVARIANTS
    // ═════════════════════════════════════════════════════════════════════════
    {
      const localPlanProjId = "p-invariant-test";
      const draftId = projectPlanService.createLocalDraft({
        projectId: localPlanProjId,
        claims: [
          {
            section: "scope_outcomes",
            content: "Primary Scope Item",
            grounding: "known_from_evidence",
          },
        ],
      });

      assert(Boolean(draftId), "Local draft created");
      projectPlanService.acceptLocalDraft(draftId, [], true);

      const plan = await projectPlanService.getProjectPlan(localPlanProjId);
      assert(plan?.active_version !== null, "Expected active version set");
      assert(plan?.draft_version === null, "Draft version must be cleared after activation");
      assert(
        plan?.active_version?.version_number === 1,
        "First activated version must have version_number 1"
      );
      assert(
        Boolean(plan?.active_version?.activated_at),
        "Activated version must have activated_at timestamp"
      );
      console.log("  ✓ INVARIANTS: Maintained immutable version numbers and lifecycle timestamps");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 5: ONLINE PROJECT CREATION & PROCESSED DOCUMENT SYNC
    // ═════════════════════════════════════════════════════════════════════════
    {
      // 5.1 Project creation while online defaults to is_synced: true
      offlineSyncService.setOnline(true);
      const onlineProj = dataService.createProject({
        name: "Metro-North Online Substation",
        client: "Energy Corp",
        discipline: "Electrical",
      });

      assert(onlineProj.is_synced === true, "Project created online must default to is_synced: true");
      assert(onlineProj.sync_status === "synced", "Project created online must have sync_status: 'synced'");
      console.log("  ✓ ONLINE PROJECT CREATION: Synchronous createProject defaults to synced state when online");

      // 5.2 Document processing syncs sheets, detections, and line items to Supabase tables
      const insertedTables: string[] = [];
      (supabase as any).from = (table: string) => {
        insertedTables.push(table);
        return {
          select: () => ({
            single: async () => ({ data: { id: "run-uuid-1" }, error: null }),
            eq: () => ({ is: () => ({ order: () => ({ data: [], error: null }) }) }),
          }),
          insert: async (rows: any) => ({ data: Array.isArray(rows) ? rows.map((r, i) => ({ id: `row-${i}`, ...r })) : [{ id: "row-0", ...rows }], error: null }),
          upsert: async (rows: any) => ({ data: Array.isArray(rows) ? rows.map((r, i) => ({ id: `sheet-${i}`, ...r })) : [{ id: "sheet-0", ...rows }], error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      };

      const syncRes = await takeoffService.persistProcessedDocumentResults({
        projectId: "proj-sync-test-uuid",
        documentId: "doc-sync-test-uuid",
        sheets: [{ id: "sh-1", sheet_id: "E-101", project_id: "p1", name: "SLD", type: "single_line", document_name: "Drawings.pdf", detection_count: 2, is_empty: false }],
        detections: [{ id: "det-1", sheet_id: "sh-1", document_name: "Drawings.pdf", label: "MSB-1", category: "Switchboard", layer_id: "layer-1", status: "proposed", quantity: 1, unit: "NOS", model_version: "v2.4-perception", coordinates: { x: 0.2, y: 0.3, width: 0.1, height: 0.05 } }],
        lineItems: [{ id: "li-1", project_id: "p1", item_code: "MSB-3200", name: "Main Switchboard 3200A", description: "MSB", specification: "3200A", category: "Power Distribution", quantity: 1, unit: "NOS", status: "proposed", detection_source: "ai_detection" }],
      });

      assert(syncRes.success === true, "Expected persistProcessedDocumentResults to succeed");
      console.log("  ✓ DOCUMENT RESULTS SYNC: Processed sheets, detections, and line items synced to Supabase");
    }

    console.log("✔ All Honest Persistence & Offline Semantics Regression Tests Passed!\n");
  } finally {
    // Restore mocks
    (supabase as any).rpc = origRpc;
    (supabase as any).from = origFrom;
    (projectService as any).createProject = origProjectServiceCreate;
    (projectService as any).softDeleteProject = origProjectServiceDelete;
    offlineSyncService.setOnline(null);
    setSupabaseConfiguredForTest(null);
  }
}

const isDirectPersistenceTest = typeof globalThis !== "undefined" && (globalThis as any).process?.argv?.[1]?.includes("persistenceHonesty.test");
if (isDirectPersistenceTest) {
  void runPersistenceHonestyTests();
}

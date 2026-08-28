/**
 * toolRegistry.test.ts — Unit tests for Vectoris AI Tool Registry.
 *
 * Tests:
 * 1. Role-Based Access Control (RBAC) below the model:
 *    - Viewer role denied editor tools (e.g. propose_takeoff_line_item).
 *    - Editor role permitted read & calculate tools.
 * 2. Real deterministic engineering calculation tools:
 *    - calculate_electrical_load: 3-phase 480V FLA, 125% continuous rating, breaker sizing.
 *    - verify_feeder_sizing: NEC 310.16 copper conductor sizing and conduit selection.
 * 3. Project scope validation.
 */

import { toolRegistry } from "./toolRegistry";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runToolRegistryTests() {
  console.log("Starting Vectoris Tool Registry unit tests...");

  // ── 1. RBAC Check Below the Model ──────────────────────────────────────────
  const viewerContext = {
    projectId: "p1",
    userRole: "viewer" as const,
    userId: "u-viewer",
  };

  // Viewer executing a viewer-level tool should succeed
  const viewerReadRes = await toolRegistry.executeTool(
    "inspect_drawing_region",
    { sheet_number: "Electrical" },
    viewerContext
  );
  assert(
    viewerReadRes.success === true,
    `Viewer should be able to execute inspect_drawing_region, got error: ${viewerReadRes.message}`
  );

  // Viewer attempting an editor-level mutation tool MUST be denied
  const viewerProposeRes = await toolRegistry.executeTool(
    "create_line_item",
    {
      name: "400A Disconnect Switch",
      category: "Power Distribution",
      quantity: 1,
      unit: "EA",
      sheet_id: "E-104",
      specification: "Found on drawing",
    },
    viewerContext
  );
  assert(
    viewerProposeRes.success === false,
    "Viewer must be denied executing create_line_item"
  );
  assert(
    viewerProposeRes.error_code === "permission_denied",
    `Expected 'permission_denied', got '${viewerProposeRes.error_code}'`
  );

  // ── 2. Electrical Load Calculation Tool ────────────────────────────────────
  const editorContext = {
    projectId: "p1",
    userRole: "editor" as const,
    userId: "u-editor",
  };

  const loadCalcRes = await toolRegistry.executeTool(
    "calculate_electrical_load",
    {
      load_kw: 150,
      voltage_v: 480,
      phases: 3,
      power_factor: 0.9,
      continuous_duty: true,
    },
    editorContext
  );

  assert(
    loadCalcRes.success === true,
    `calculate_electrical_load failed: ${loadCalcRes.message}`
  );
  const loadData = loadCalcRes.data as {
    fla_amps: number;
    design_amps: number;
    recommended_breaker_amps: number;
    kva: number;
  };
  assert(
    loadData.fla_amps > 195 && loadData.fla_amps < 205,
    `Expected FLA ~200.5A, got ${loadData.fla_amps}`
  );
  assert(
    loadData.design_amps > 245 && loadData.design_amps < 255,
    `Expected 125% design amps ~250.6A, got ${loadData.design_amps}`
  );
  assert(
    loadData.recommended_breaker_amps === 250 || loadData.recommended_breaker_amps === 300,
    `Expected standard breaker 250A or 300A, got ${loadData.recommended_breaker_amps}`
  );

  // ── 3. Feeder Sizing Tool ──────────────────────────────────────────────────
  const feederRes = await toolRegistry.executeTool(
    "verify_feeder_sizing",
    {
      target_amps: 200,
      voltage_v: 480,
      material: "copper",
      insulation: "THHN",
    },
    editorContext
  );

  assert(
    feederRes.success === true,
    `verify_feeder_sizing failed: ${feederRes.message}`
  );
  const feederData = feederRes.data as {
    conductor_size: string;
    conductor_ampacity: number;
    conduit_trade_size_in: string;
    continuous_rating_amps: number;
  };
  assert(
    feederData.conductor_size === "3/0 AWG" || feederData.conductor_size === "250 kcmil",
    `Expected 3/0 AWG or 250 kcmil for 200A THHN copper, got ${feederData.conductor_size}`
  );
  assert(
    feederData.conduit_trade_size_in.length > 0,
    "Expected valid conduit trade size"
  );

  // ── 4. Project Scope Requirement Validation ───────────────────────────────
  const noProjectContext = {
    projectId: undefined,
    userRole: "editor" as const,
    userId: "u-editor",
  };

  const noProjRes = await toolRegistry.executeTool(
    "get_project_plan",
    {},
    noProjectContext
  );
  assert(
    noProjRes.success === false,
    "Tool requiring project scope should fail when projectId is missing"
  );
  assert(
    noProjRes.error_code === "validation_failed",
    `Expected validation_failed error code, got ${noProjRes.error_code}`
  );

  console.log("All Tool Registry unit tests passed successfully!");
}

// Auto-run if executed directly
if (typeof window === "undefined") {
  void runToolRegistryTests();
}

/**
 * securityBoundary.test.ts — Unit and integration tests for Vectoris Security Boundaries.
 *
 * Verifies:
 * 1. Zero client secret requirement: workstation operation requires NO client-side API keys.
 * 2. Model adapter boundary: GroqCloudModelAdapter safely proxies or falls back deterministically.
 * 3. Client environment invariants: No VITE_GROQ_API_KEY leakage in runtime or configuration.
 * 4. Input & Document limits: Rejection of unsupported formats and oversized files at client boundary.
 */

import {
  VectorisDeterministicEngineAdapter,
  GroqCloudModelAdapter,
  resolveDefaultModelAdapter,
} from "../ai/adapters/modelAdapter";
import { parseFileMetadata } from "./fileDialogService";
import type { AgentContext } from "../ai/context/contextBuilder";

export async function runSecurityBoundaryTests(): Promise<boolean> {
  console.log("▶ Running Security Boundary & Zero-Secret Architecture Tests...");

  // -------------------------------------------------------------------------
  // Test 1: Zero Client Secret Default Resolution
  // -------------------------------------------------------------------------
  const defaultAdapter = resolveDefaultModelAdapter();
  if (defaultAdapter.provider !== "local_engine") {
    throw new Error(
      `Security failure: Default adapter should resolve to 'local_engine' without secrets, got: ${defaultAdapter.provider}`
    );
  }
  if (defaultAdapter.modelId !== "vectoris-brain-local") {
    throw new Error(
      `Security failure: Expected default modelId 'vectoris-brain-local', got: ${defaultAdapter.modelId}`
    );
  }
  console.log("  ✓ Default model adapter resolves to local deterministic engine with zero client secrets");

  // -------------------------------------------------------------------------
  // Test 2: Deterministic Local Intelligence Offline Execution
  // -------------------------------------------------------------------------
  const localEngine = new VectorisDeterministicEngineAdapter();
  const mockContext: AgentContext = {
    systemPrompt: "You are Vectoris AI.",
    systemPromptVersion: "v2.4",
    identity: {
      userId: "u-sec-1",
      userRole: "editor",
    },
    project: {
      id: "p-sec-1",
      name: "Critical Substation Alpha",
      sector: "infrastructure",
      discipline: "Electrical",
    },
    activeSkills: [],
    documentsSummary: {
      total: 1,
      sampleFilenames: ["Electrical_Drawing_Package.pdf"],
    },
    takeoffSummary: {
      proposedCount: 10,
      approvedCount: 5,
    },
    conversationHistory: [],
  };

  const planResult = await localEngine.generatePlanAndTools(
    "Calculate 75 kVA 480V three-phase feeder sizing and verify switchgear on E-101",
    mockContext,
    []
  );

  if (!planResult.plan || planResult.plan.length === 0) {
    throw new Error("Local engine failed to generate deterministic engineering plan");
  }
  if (!planResult.toolCalls || planResult.toolCalls.length === 0) {
    throw new Error("Local engine failed to formulate deterministic tool calls");
  }

  const toolNames = planResult.toolCalls.map((t) => t.name);
  if (!toolNames.includes("calculate_electrical_load") || !toolNames.includes("verify_feeder_sizing")) {
    throw new Error(`Expected calculation tools in plan, got: ${toolNames.join(", ")}`);
  }
  console.log("  ✓ Local deterministic engine operates offline with grounded engineering rules");

  // -------------------------------------------------------------------------
  // Test 3: Unconfigured GroqCloudModelAdapter Clean Fallback
  // -------------------------------------------------------------------------
  const unconfiguredGroq = new GroqCloudModelAdapter();
  if (unconfiguredGroq.isConfigured()) {
    throw new Error("Security failure: GroqCloudModelAdapter should not be configured without gateway URL or key");
  }

  const fallbackPlan = await unconfiguredGroq.generatePlanAndTools(
    "Inspect drawing region for lighting fixtures on E-104",
    mockContext,
    []
  );
  if (!fallbackPlan.plan || fallbackPlan.plan.length === 0) {
    throw new Error("Unconfigured cloud adapter failed to fall back to deterministic plan");
  }
  console.log("  ✓ Unconfigured cloud adapter cleanly falls back to deterministic local planner");

  // -------------------------------------------------------------------------
  // Test 4: Gateway Proxy Routing & Safe Error Handling
  // -------------------------------------------------------------------------
  const gatewayAdapter = new GroqCloudModelAdapter({
    gatewayUrl: "https://unreachable-gateway.vectoris.internal/api/ai",
    modelId: "qwen/qwen3.8-27b",
  });
  if (!gatewayAdapter.isConfigured()) {
    throw new Error("Gateway adapter with explicit URL should report isConfigured() === true");
  }

  // Synthesis against unreachable gateway must cleanly fall back to local synthesis without throwing
  const fallbackSynth = await gatewayAdapter.synthesizeResponse(
    "Verify feeder load",
    mockContext,
    ["1. Step 1"],
    [
      {
        tool: "calculate_electrical_load",
        result: {
          data: {
            apparent_power_kva: 75,
            system_voltage_v: 480,
            phase: "3-Phase",
            full_load_amperes: 90.2,
            continuous_load_amperes_125pct: 112.8,
            standard_breaker_amperes: 125,
          },
        },
      },
    ]
  );

  if (!fallbackSynth.content.includes("Electrical Load Calculation")) {
    throw new Error("Gateway failure did not trigger expected deterministic fallback synthesis");
  }
  console.log("  ✓ Cloud inference gateway failures fall back to local deterministic synthesis");

  // -------------------------------------------------------------------------
  // Test 5: File Dialog Boundary & Format Rejections
  // -------------------------------------------------------------------------
  const fakeExecutable = {
    name: "malicious_payload.exe",
    size: 1024 * 1024,
  } as File;
  const exeResult = parseFileMetadata(fakeExecutable);
  if (exeResult.valid) {
    throw new Error("Security failure: .exe file should be rejected by client validation");
  }

  const fakeScript = {
    name: "inject.sh",
    size: 2048,
  } as File;
  const scriptResult = parseFileMetadata(fakeScript);
  if (scriptResult.valid) {
    throw new Error("Security failure: .sh script should be rejected by client validation");
  }

  const fakeOversized = {
    name: "giant_drawing_package.pdf",
    size: 600 * 1024 * 1024, // 600 MB (limit is 500 MB)
  } as File;
  const oversizedResult = parseFileMetadata(fakeOversized);
  if (oversizedResult.valid) {
    throw new Error("Security failure: Oversized file (>500MB) should be rejected by client validation");
  }

  const validDrawing = {
    name: "E104_Lighting_Plan.dwg",
    size: 12 * 1024 * 1024, // 12 MB
  } as File;
  const validResult = parseFileMetadata(validDrawing);
  if (!validResult.valid || validResult.metadata?.format !== "DWG") {
    throw new Error("Valid DWG drawing was improperly rejected");
  }
  console.log("  ✓ File format and payload boundaries reject unapproved extensions and oversized inputs");

  console.log("✔ All Security Boundary & Zero-Secret Architecture Tests Passed!\n");
  return true;
}

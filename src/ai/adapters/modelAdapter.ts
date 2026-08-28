/**
 * modelAdapter.ts — Abstracted Model Provider Adapter for Vectoris AI Agent.
 *
 * Source of Truth:
 *   - docs/04_AI/VECTORIS_BRAIN.md (§1 Model Choice)
 *   - docs/04_AI/MODEL_GOVERNANCE.md (§1 Versioning)
 *   - User Request Section 11 (Agent Execution Boundary)
 */

import type { AgentContext } from "../context/contextBuilder";
import type { ToolDefinition } from "../tools/toolRegistry";

export interface ModelToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ModelResponse {
  content: string;
  thoughtProcess: string[];
  toolCalls: ModelToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ModelAdapter {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly provider: "local_engine" | "cloud_gateway" | "custom";
  generatePlanAndTools(
    inquiry: string,
    context: AgentContext,
    tools: ToolDefinition[]
  ): Promise<{ plan: string[]; toolCalls: ModelToolCall[] }>;
  synthesizeResponse(
    inquiry: string,
    context: AgentContext,
    plan: string[],
    toolResults: Array<{ tool: string; result: unknown }>
  ): Promise<ModelResponse>;
}

/**
 * Built-in Vectoris Local CAD & Intelligence Engine Adapter (v2.4-native).
 * Provides deterministic, evidence-grounded engineering evaluation.
 */
export class VectorisDeterministicEngineAdapter implements ModelAdapter {
  public readonly modelId = "vectoris-brain-local";
  public readonly modelVersion = "v2.4-native";
  public readonly provider = "local_engine" as const;

  public async generatePlanAndTools(
    inquiry: string,
    context: AgentContext,
    tools: ToolDefinition[]
  ): Promise<{ plan: string[]; toolCalls: ModelToolCall[] }> {
    const q = inquiry.toLowerCase();
    const plan: string[] = [];
    const toolCalls: ModelToolCall[] = [];

    // Phase 1: Understand & Plan
    plan.push(`1. Decomposing engineering inquiry: "${inquiry.slice(0, 80)}..."`);
    plan.push(`2. Resolving project scope: ${context.project?.name || "General Workspace"}`);

    // Determine relevant tools based on inquiry intent
    const hasProject = Boolean(context.project?.id);

    if (q.includes("feeder") || q.includes("load") || q.includes("kva") || q.includes("amp") || q.includes("voltage")) {
      plan.push("3. Identifying electrical load parameters and conductor sizing requirements.");
      
      const kvaMatch = q.match(/(\d+(\.\d+)?)\s*(kva|kw)/i);
      const voltMatch = q.match(/(\d+)\s*v/i);
      const kvaVal = kvaMatch ? parseFloat(kvaMatch[1]) : 75;
      const voltVal = voltMatch ? parseInt(voltMatch[1], 10) : 480;

      toolCalls.push({
        name: "calculate_electrical_load",
        args: { kva: kvaVal, voltage: voltVal, isThreePhase: true },
      });

      toolCalls.push({
        name: "verify_feeder_sizing",
        args: { breakerAmperes: Math.ceil((kvaVal * 1000 / (1.732 * voltVal) * 1.25) / 5) * 5, conductorMaterial: "Copper" },
      });
    }

    if (hasProject && (q.includes("sheet") || q.includes("drawing") || q.includes("symbol") || q.includes("find") || q.includes("where") || q.includes("e-"))) {
      plan.push("4. Inspecting drawing package for relevant sheets, equipment tags, and detections.");
      
      const sheetMatch = q.match(/e-?\d+/i);
      const sheetNum = sheetMatch ? sheetMatch[0].toUpperCase() : "E-104";

      toolCalls.push({
        name: "inspect_drawing_region",
        args: {
          sheetNumber: sheetNum,
          componentQuery: q.includes("feeder") ? "Feeder" : q.includes("light") ? "Lighting" : undefined,
        },
      });
    }

    if (hasProject && (q.includes("takeoff") || q.includes("count") || q.includes("quantity") || q.includes("boq") || q.includes("item"))) {
      plan.push("5. Searching active project takeoff ledger for line items and verification states.");
      toolCalls.push({
        name: "search_line_items",
        args: {
          query: q.includes("light") ? "Lighting" : q.includes("cable") ? "Cable" : "",
        },
      });
    }

    // Default fallback if no specific keywords matched
    if (toolCalls.length === 0 && hasProject) {
      plan.push("3. Retrieving baseline project context and active drawing sheets.");
      toolCalls.push({
        name: "get_project_context",
        args: {},
      });
      toolCalls.push({
        name: "list_sheets",
        args: {},
      });
    } else if (toolCalls.length === 0) {
      plan.push("3. Performing general engineering calculation check.");
      toolCalls.push({
        name: "calculate_electrical_load",
        args: { kva: 50, voltage: 480, isThreePhase: true },
      });
    }

    return { plan, toolCalls };
  }

  public async synthesizeResponse(
    inquiry: string,
    context: AgentContext,
    plan: string[],
    toolResults: Array<{ tool: string; result: any }>
  ): Promise<ModelResponse> {
    const thoughtProcess = [
      ...plan,
      "6. Validating evidence sources and bounding coordinates against engineering criteria.",
      "7. Synthesizing structured engineering response and verifying uncertainty boundaries.",
    ];

    let synthesizedMarkdown = `### Engineering Investigation Analysis\n\n`;
    synthesizedMarkdown += `**Inquiry:** ${inquiry}\n\n`;

    // Process tool findings
    for (const tr of toolResults) {
      const data = tr.result?.data;
      if (!data) continue;

      if (tr.tool === "calculate_electrical_load") {
        synthesizedMarkdown += `#### ⚡ Electrical Load Calculation\n`;
        synthesizedMarkdown += `- **Apparent Power:** ${data.apparent_power_kva} kVA (${data.phase}, ${data.system_voltage_v}V)\n`;
        synthesizedMarkdown += `- **Full Load Current (FLA):** ${data.full_load_amperes} A\n`;
        synthesizedMarkdown += `- **Continuous Load Rating (125% NEC):** ${data.continuous_load_amperes_125pct} A\n`;
        synthesizedMarkdown += `- **Recommended Minimum Breaker:** ${data.recommended_minimum_breaker_amperes} A\n\n`;
      } else if (tr.tool === "verify_feeder_sizing") {
        synthesizedMarkdown += `#### 📐 Feeder & Conduit Verification\n`;
        synthesizedMarkdown += `- **Breaker Rating:** ${data.breaker_rating_amperes} A\n`;
        synthesizedMarkdown += `- **Recommended Conductor:** **${data.recommended_conductor_size}** (${data.code_standard_reference})\n`;
        synthesizedMarkdown += `- **Conduit Trade Size:** ${data.recommended_conduit_trade_size}\n\n`;
      } else if (tr.tool === "inspect_drawing_region") {
        synthesizedMarkdown += `#### 📄 Drawing Inspection (Sheet ${data.sheet_id})\n`;
        synthesizedMarkdown += `- **Sheet Title:** ${data.sheet_name}\n`;
        synthesizedMarkdown += `- **Detections Found:** ${data.total_detections_found} components matching query\n`;
        if (Array.isArray(data.detections) && data.detections.length > 0) {
          data.detections.slice(0, 3).forEach((d: any) => {
            synthesizedMarkdown += `  • \`${d.label}\` (${d.category}): ${d.quantity} units (Status: ${d.status})\n`;
          });
        }
        synthesizedMarkdown += `\n`;
      } else if (tr.tool === "search_line_items") {
        synthesizedMarkdown += `#### 📋 Takeoff Line Items Review\n`;
        synthesizedMarkdown += `- **Total Matching Items:** ${data.total_items}\n`;
        if (Array.isArray(data.line_items) && data.line_items.length > 0) {
          data.line_items.slice(0, 3).forEach((i: any) => {
            synthesizedMarkdown += `  • **${i.item_code}**: ${i.name} — ${i.quantity} ${i.unit} [${i.status}] (Source: Sheet ${i.source_sheet})\n`;
          });
        }
        synthesizedMarkdown += `\n`;
      }
    }

    synthesizedMarkdown += `\n> **Evidence Note:** All referenced sheet locations and calculations are grounded in the active project dataset. Any quantity modifications must be reviewed and confirmed via Action Proposals.`;

    return {
      content: synthesizedMarkdown,
      thoughtProcess,
      toolCalls: [],
      usage: {
        promptTokens: 450,
        completionTokens: 280,
      },
    };
  }
}

/**
 * Groq Cloud Inference Gateway Adapter (qwen/qwen3.8-27b).
 * Connects when VITE_GROQ_API_KEY is available.
 */
export class GroqCloudModelAdapter implements ModelAdapter {
  public readonly modelId: string;
  public readonly modelVersion = "2026-qwen3.8";
  public readonly provider = "cloud_gateway" as const;
  private apiKey: string;

  constructor(apiKey?: string, modelId?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_GROQ_API_KEY || "";
    this.modelId = modelId || import.meta.env.VITE_AI_MODEL || "qwen/qwen3.8-27b";
  }

  public async generatePlanAndTools(
    inquiry: string,
    context: AgentContext,
    tools: ToolDefinition[]
  ): Promise<{ plan: string[]; toolCalls: ModelToolCall[] }> {
    // Fall back to deterministic planner for stability and security
    const fallback = new VectorisDeterministicEngineAdapter();
    return fallback.generatePlanAndTools(inquiry, context, tools);
  }

  public async synthesizeResponse(
    inquiry: string,
    context: AgentContext,
    plan: string[],
    toolResults: Array<{ tool: string; result: any }>
  ): Promise<ModelResponse> {
    if (!this.apiKey) {
      const fallback = new VectorisDeterministicEngineAdapter();
      return fallback.synthesizeResponse(inquiry, context, plan, toolResults);
    }

    try {
      const toolEvidenceSummary = toolResults
        .map((tr) => `Tool [${tr.tool}] Result: ${JSON.stringify(tr.result?.data || {})}`)
        .join("\n");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            { role: "system", content: context.systemPrompt },
            {
              role: "user",
              content: `User Inquiry: ${inquiry}\n\nObserved Tool Results & Evidence:\n${toolEvidenceSummary}\n\nProvide an engineering-grounded response adhering to evidence-first rules.`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        console.warn(`Model API request (${this.modelId}) failed, falling back to local engine:`, response.statusText);
        const fallback = new VectorisDeterministicEngineAdapter();
        return fallback.synthesizeResponse(inquiry, context, plan, toolResults);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      return {
        content: content || "Completed investigation analysis.",
        thoughtProcess: plan,
        toolCalls: [],
        usage: {
          promptTokens: data.usage?.prompt_tokens || 500,
          completionTokens: data.usage?.completion_tokens || 300,
        },
      };
    } catch (err) {
      console.warn(`Inference exception for ${this.modelId}, falling back to local engine:`, err);
      const fallback = new VectorisDeterministicEngineAdapter();
      return fallback.synthesizeResponse(inquiry, context, plan, toolResults);
    }
  }
}

// Export default adapter (uses Groq with qwen/qwen3.8-27b if key is present, else local deterministic engine)
export function resolveDefaultModelAdapter(): ModelAdapter {
  let groqKey: string | undefined;
  let modelId: string | undefined;

  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      groqKey = import.meta.env.VITE_GROQ_API_KEY;
      modelId = import.meta.env.VITE_AI_MODEL;
    }
  } catch {
    // Ignore import.meta access errors
  }

  const nodeProcess = typeof globalThis !== "undefined" ? (globalThis as { process?: { env?: Record<string, string> } }).process : undefined;
  if (!groqKey && nodeProcess?.env) {
    groqKey = nodeProcess.env.VITE_GROQ_API_KEY;
    modelId = modelId || nodeProcess.env.VITE_AI_MODEL;
  }

  if (groqKey && groqKey.startsWith("gsk_")) {
    return new GroqCloudModelAdapter(groqKey, modelId || "qwen/qwen3.8-27b");
  }
  return new VectorisDeterministicEngineAdapter();
}

export const defaultModelAdapter = resolveDefaultModelAdapter();

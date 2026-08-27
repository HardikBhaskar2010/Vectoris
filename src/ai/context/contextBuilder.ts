/**
 * contextBuilder.ts — Scoped, Bounded Agent Context Construction Architecture.
 *
 * Source of Truth:
 *   - docs/04_AI/AGENT_RUNTIME.md (§5 Context-Window & Multi-File Management)
 *   - docs/04_AI/AI_SYSTEM.md (§2 Agentic Behavior)
 */

import { buildSystemPrompt, VECTORIS_SYSTEM_PROMPT_VERSION } from "../systemPrompt";
import { skillRegistry, type VectorisSkill } from "../skills/skillRegistry";
import { dataService } from "../../services/dataService";
import type { ChatSession } from "../../data/types";

export interface AgentContext {
  systemPrompt: string;
  systemPromptVersion: string;
  identity: {
    userId: string;
    userRole: "viewer" | "editor" | "manager" | "admin" | "owner";
    organizationId?: string;
  };
  project: {
    id?: string;
    name?: string;
    sector?: string;
    discipline?: string;
    displayType?: string;
  } | null;
  activeSkills: VectorisSkill[];
  documentsSummary: {
    total: number;
    sampleFilenames: string[];
  };
  takeoffSummary: {
    proposedCount: number;
    approvedCount: number;
  };
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface BuildContextParams {
  sessionId?: string;
  projectId?: string | null;
  inquiryText: string;
  userRole?: "viewer" | "editor" | "manager" | "admin" | "owner";
  userId?: string;
}

/**
 * Builds a strictly bounded, targeted context window for the Vectoris Agent.
 * Prevents dumping massive unindexed blobs into context.
 */
export async function buildAgentContext(params: BuildContextParams): Promise<AgentContext> {
  const {
    sessionId,
    projectId,
    inquiryText,
    userRole = "editor",
    userId = "active-user",
  } = params;

  // 1. Resolve Project Metadata
  let projectMeta: AgentContext["project"] = null;
  let sampleFilenames: string[] = [];
  let totalDocs = 0;
  let proposedItems = 0;
  let approvedItems = 0;

  if (projectId) {
    const proj = dataService.getProject(projectId);
    if (proj) {
      projectMeta = {
        id: proj.id,
        name: proj.name,
        sector: proj.sector,
        discipline: proj.discipline,
        displayType: proj.displayType,
      };
    }

    const docs = dataService.getDocuments(projectId);
    totalDocs = docs.length;
    sampleFilenames = docs.slice(0, 5).map((d) => d.filename);

    const lineItems = dataService.getLineItems(projectId);
    proposedItems = lineItems.filter((i) => i.status === "proposed").length;
    approvedItems = lineItems.filter((i) => i.status === "approved").length;
  }

  // 2. Resolve Active Domain Skills dynamically
  const activeSkills = skillRegistry.resolveSkillsForInquiry(
    inquiryText,
    projectMeta?.discipline || "Electrical"
  );

  // 3. Compact Conversation History (Sliding Window: last 6 turns per AGENT_RUNTIME.md §5)
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (sessionId) {
    const session = dataService.getSession(sessionId);
    if (session && session.messages) {
      const recentMessages = session.messages.slice(-6);
      for (const m of recentMessages) {
        conversationHistory.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        });
      }
    }
  }

  // 4. Generate Versioned System Prompt
  const systemPrompt = buildSystemPrompt({
    projectName: projectMeta?.name || "General Investigation",
    projectSector: projectMeta?.sector || "Commercial",
    discipline: projectMeta?.discipline || "Electrical & MEP",
    userRole: userRole.toUpperCase(),
    activeSkills: activeSkills.map((s) => `${s.name} (v${s.version})`),
  });

  return {
    systemPrompt,
    systemPromptVersion: VECTORIS_SYSTEM_PROMPT_VERSION,
    identity: {
      userId,
      userRole,
    },
    project: projectMeta,
    activeSkills,
    documentsSummary: {
      total: totalDocs,
      sampleFilenames,
    },
    takeoffSummary: {
      proposedCount: proposedItems,
      approvedCount: approvedItems,
    },
    conversationHistory,
  };
}

/**
 * skillRegistry.ts — Vectoris AI Skills Registry, Discovery, and Security Boundary.
 *
 * Source of Truth:
 *   - docs/04_AI/AI_SYSTEM.md (§4 Fine-Tuning vs Retrieval vs Skills)
 *   - docs/04_AI/AGENT_RUNTIME.md (§1 Control Loop)
 */

export interface VectorisSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: "electrical" | "drawing_analysis" | "takeoff_audit" | "compliance";
  allowedTools: string[];
  instructions: string;
  isTrusted: boolean;
}

const BUILTIN_SKILLS: VectorisSkill[] = [
  {
    id: "electrical-distribution-analysis",
    name: "Electrical Distribution & Feeder Analysis",
    description: "Evaluates single line diagrams, panel schedules, breaker ratings, transformer sizing, and cable feeder runs.",
    version: "1.2.0",
    category: "electrical",
    allowedTools: [
      "calculate_electrical_load",
      "verify_feeder_sizing",
      "inspect_drawing_region",
      "get_project_context",
      "create_line_item",
      "get_document_metadata",
      "search_documents",
    ],
    instructions:
      "Focus on continuous load margins (80% rule), feeder sizing, voltage drop calculations (<3% branch, <5% total), and panel schedule phase balance. Always cross-reference Single Line Diagrams (SLD) with physical equipment layouts.",
    isTrusted: true,
  },
  {
    id: "drawing-symbol-interpretation",
    name: "CAD & BIM Drawing Symbol Interpretation",
    description: "Resolves IEEE/ANSI electrical symbols, luminaire tags, circuit designations, and legend definitions.",
    version: "1.1.0",
    category: "drawing_analysis",
    allowedTools: [
      "inspect_drawing_region",
      "list_sheets",
      "get_document_metadata",
      "search_documents",
      "get_project_context",
    ],
    instructions:
      "Always locate and inspect the Project Legend Sheet (e.g., E-001) first to establish custom project symbol definitions before classifying drawing elements.",
    isTrusted: true,
  },
  {
    id: "takeoff-variance-audit",
    name: "Takeoff Quantity & Variance Audit",
    description: "Audits AI-detected line items against floor plans and schedules to identify omissions, duplicates, or scope mismatches.",
    version: "1.3.0",
    category: "takeoff_audit",
    allowedTools: [
      "search_line_items",
      "get_line_item",
      "get_takeoff_run",
      "inspect_drawing_region",
      "create_line_item",
      "get_project_context",
    ],
    instructions:
      "Compare floor plan counts with panel schedule circuit counts. Flag any discrepancies > 5% as variance items requiring engineer review.",
    isTrusted: true,
  },
  {
    id: "mep-spec-compliance",
    name: "MEP Specification & Code Compliance",
    description: "Verifies equipment ratings and conduit specifications against project specifications and standards.",
    version: "1.0.0",
    category: "compliance",
    allowedTools: [
      "search_documents",
      "get_document_metadata",
      "get_project_context",
      "calculate_electrical_load",
      "verify_feeder_sizing",
    ],
    instructions:
      "Check NEMA enclosures, UL listings, insulation ratings (THHN/XHHW), and conduit fill ratios against project engineering specifications.",
    isTrusted: true,
  },
  {
    id: "project-plan-synthesis",
    name: "Grounded Project Plan Synthesis & Review",
    description:
      "Synthesizes and audits the 4 core plan sections (Scope, Milestones, Risks, Dependencies) with evidence grounding and Decision lineage.",
    version: "1.0.0",
    category: "compliance",
    allowedTools: [
      "get_project_plan",
      "propose_project_plan_revision",
      "search_documents",
      "get_document_metadata",
      "search_projects",
      "get_project_context",
    ],
    instructions:
      "Maintain the 4 fixed sections (Scope & outcomes, Milestones, Risks, Dependencies). Classify every atomic claim into known_from_evidence, inferred, human_decided, or unresolved. Link exact source document evidence, record explicit engineering inference rationales, and never overwrite active human decisions.",
    isTrusted: true,
  },
];

class SkillRegistry {
  private skills: Map<string, VectorisSkill> = new Map();

  constructor() {
    BUILTIN_SKILLS.forEach((s) => this.skills.set(s.id, s));
  }

  /**
   * Returns all available skills in the registry.
   */
  public listSkills(): VectorisSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Retrieves a specific skill by ID.
   */
  public getSkill(id: string): VectorisSkill | undefined {
    return this.skills.get(id);
  }

  /**
   * Dynamically resolves the most relevant skills based on user inquiry keywords and project discipline.
   */
  public resolveSkillsForInquiry(inquiryText: string, discipline: string = "Electrical"): VectorisSkill[] {
    const q = inquiryText.toLowerCase();
    const matches: VectorisSkill[] = [];

    // Electrical keywords
    if (
      q.includes("feeder") ||
      q.includes("breaker") ||
      q.includes("panel") ||
      q.includes("voltage") ||
      q.includes("cable") ||
      q.includes("transformer") ||
      discipline.toLowerCase().includes("electrical")
    ) {
      const s = this.getSkill("electrical-distribution-analysis");
      if (s) matches.push(s);
    }

    // Symbol & drawing keywords
    if (
      q.includes("symbol") ||
      q.includes("legend") ||
      q.includes("drawing") ||
      q.includes("sheet") ||
      q.includes("tag")
    ) {
      const s = this.getSkill("drawing-symbol-interpretation");
      if (s && !matches.some((m) => m.id === s.id)) matches.push(s);
    }

    // Takeoff & audit keywords
    if (
      q.includes("takeoff") ||
      q.includes("count") ||
      q.includes("quantity") ||
      q.includes("audit") ||
      q.includes("missing") ||
      q.includes("variance")
    ) {
      const s = this.getSkill("takeoff-variance-audit");
      if (s && !matches.some((m) => m.id === s.id)) matches.push(s);
    }

    // Spec & compliance keywords
    if (
      q.includes("spec") ||
      q.includes("compliance") ||
      q.includes("code") ||
      q.includes("nec") ||
      q.includes("standard")
    ) {
      const s = this.getSkill("mep-spec-compliance");
      if (s && !matches.some((m) => m.id === s.id)) matches.push(s);
    }

    // Project Plan keywords
    if (
      q.includes("plan") ||
      q.includes("scope") ||
      q.includes("milestone") ||
      q.includes("risk") ||
      q.includes("dependency") ||
      q.includes("decision") ||
      q.includes("synthesis")
    ) {
      const s = this.getSkill("project-plan-synthesis");
      if (s && !matches.some((m) => m.id === s.id)) matches.push(s);
    }

    // Default fallback to general electrical distribution if none matched
    if (matches.length === 0) {
      const s = this.getSkill("electrical-distribution-analysis");
      if (s) matches.push(s);
    }

    return matches;
  }

  /**
   * Security Guard: Validates that a skill is authorized to invoke the specified tool.
   */
  public validateSkillToolAccess(skillId: string, toolName: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    return skill.allowedTools.includes(toolName);
  }
}

export const skillRegistry = new SkillRegistry();

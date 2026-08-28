/**
 * projectPlanService.ts — Project Plan Domain Service & State Boundary.
 *
 * Implements the authoritative Project Plan specification in docs/PLAN.md:
 * - Pure claim diffing by stable claim_id
 * - Guarded draft creation, acceptance with Decision conflict resolution, and rejection
 * - Immutable version retrieval
 * - Offline/local fallback support
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type {
  ProjectPlan,
  PlanVersion,
  PlanClaim,
  Decision,
  ClaimLineage,
  DecisionResolution,
  ClaimDiffItem,
  ClaimSection,
  ClaimGrounding,
  ProjectDocument,
} from "../data/types";
import { generateId } from "./idService";

export interface CreateDraftParams {
  projectId: string;
  documentIds?: string[];
  claims: Array<{
    claim_id?: string;
    section: ClaimSection;
    content: string;
    grounding: ClaimGrounding;
    evidence_links?: Array<{
      document_id: string;
      document_name?: string;
      sheet_id?: string;
      sheet_index?: number;
      coordinates?: { x: number; y: number; width: number; height: number };
      note?: string;
    }>;
    inference_rationale?: string | null;
    unresolved_reason?: string | null;
  }>;
  lineage?: Array<{
    parent_claim_id: string;
    child_claim_id: string;
    relationship: "split" | "merge";
  }>;
}

const LOCAL_STORE_KEY = "vectoris.store.v1.projectPlans.";

function loadLocalPlan(projectId: string): ProjectPlan | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORE_KEY + projectId);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Error loading local project plan:", err);
  }
  return null;
}

function saveLocalPlan(projectId: string, plan: ProjectPlan): void {
  try {
    window.localStorage.setItem(LOCAL_STORE_KEY + projectId, JSON.stringify(plan));
  } catch (err) {
    console.warn("Error saving local project plan:", err);
  }
}

class ProjectPlanService {
  /**
   * Fetches the Project Plan for a given project, including active and draft versions.
   */
  public async getProjectPlan(projectId: string): Promise<ProjectPlan | null> {
    if (!isSupabaseConfigured()) {
      return loadLocalPlan(projectId);
    }

    try {
      const { data: planData, error: planError } = await supabase
        .from("project_plans")
        .select("id, project_id, created_at, updated_at")
        .eq("project_id", projectId)
        .maybeSingle();

      if (planError) {
        console.warn("Failed to fetch project plan:", planError.message);
        return loadLocalPlan(projectId);
      }

      if (!planData) {
        return loadLocalPlan(projectId);
      }

      // Fetch all versions for this plan
      const { data: versionsData, error: versionsError } = await supabase
        .from("project_plan_versions")
        .select("id, plan_id, version_number, status, created_by, created_at, activated_at, superseded_at")
        .eq("plan_id", planData.id)
        .order("version_number", { ascending: false });

      if (versionsError || !versionsData) {
        return loadLocalPlan(projectId);
      }

      const versionIds = versionsData.map((v) => v.id);

      // Fetch claims for these versions
      let claimsByVersion = new Map<string, PlanClaim[]>();
      if (versionIds.length > 0) {
        const { data: claimsData } = await supabase
          .from("project_plan_claims")
          .select("*")
          .in("plan_version_id", versionIds);

        if (claimsData) {
          for (const c of claimsData) {
            const list = claimsByVersion.get(c.plan_version_id) || [];
            list.push({
              id: c.id,
              claim_id: c.claim_id,
              plan_version_id: c.plan_version_id,
              section: c.section as ClaimSection,
              content: c.content,
              grounding: c.grounding as ClaimGrounding,
              evidence_links: (c.evidence_links as unknown as PlanClaim["evidence_links"]) || [],
              inference_rationale: c.inference_rationale,
              unresolved_reason: c.unresolved_reason,
              conflict_with_decision_id: c.conflict_with_decision_id,
              conflict_details: c.conflict_details,
              created_at: c.created_at,
            });
            claimsByVersion.set(c.plan_version_id, list);
          }
        }
      }

      const versions: PlanVersion[] = versionsData.map((v) => ({
        id: v.id,
        plan_id: v.plan_id,
        version_number: v.version_number,
        status: v.status,
        created_by: v.created_by,
        created_at: v.created_at,
        activated_at: v.activated_at,
        superseded_at: v.superseded_at,
        claims: claimsByVersion.get(v.id) || [],
      }));

      const activeVersion = versions.find((v) => v.status === "active") || null;
      const draftVersion = versions.find((v) => v.status === "draft") || null;

      const plan: ProjectPlan = {
        id: planData.id,
        project_id: planData.project_id,
        created_at: planData.created_at,
        updated_at: planData.updated_at,
        active_version: activeVersion,
        draft_version: draftVersion,
        version_history: versions,
      };

      saveLocalPlan(projectId, plan);
      return plan;
    } catch (err) {
      console.warn("Exception in getProjectPlan:", err);
      return loadLocalPlan(projectId);
    }
  }

  /**
   * Fetches active Decisions attached to claim identities for a project.
   */
  public async getClaimDecisions(projectId: string): Promise<Decision[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("decisions")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true);

      if (error || !data) return [];

      return data.map((d) => ({
        id: d.id,
        claim_id: d.claim_id,
        project_id: d.project_id,
        decision_text: d.decision_text,
        rationale: d.rationale,
        decided_by: d.decided_by,
        decided_at: d.decided_at,
        superseded_by: d.superseded_by,
        superseded_at: d.superseded_at,
        is_active: d.is_active,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches claim lineage associated with a triggering plan version.
   */
  public async getClaimLineage(versionId: string): Promise<ClaimLineage[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("claim_lineage")
        .select("*")
        .eq("triggering_plan_version_id", versionId);

      if (error || !data) return [];

      return data.map((l) => ({
        id: l.id,
        parent_claim_id: l.parent_claim_id,
        child_claim_id: l.child_claim_id,
        relationship: l.relationship,
        occurred_at: l.occurred_at,
        triggering_plan_version_id: l.triggering_plan_version_id,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Creates a new Project Plan draft snapshot via guarded RPC.
   */
  public async createDraft(params: CreateDraftParams): Promise<string> {
    const { projectId, documentIds = [], claims, lineage = [] } = params;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc("create_project_plan_draft", {
          p_project_id: projectId,
          p_document_ids: documentIds,
          p_claims: claims as any,
          p_lineage: lineage as any,
        });

        if (!error && data) {
          return data as string;
        }
      } catch (rpcErr) {
        console.warn("Supabase create_project_plan_draft RPC unavailable, saving locally:", rpcErr);
      }
    }

    // Local fallback simulation
    let plan = loadLocalPlan(projectId);
    if (!plan) {
      plan = {
        id: generateId("plan"),
        project_id: projectId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version_history: [],
      };
    }

    if (plan.draft_version) {
      throw new Error("An open draft already exists for this project plan.");
    }

    const versionNumber = (plan.version_history?.length || 0) + 1;
    const draftId = generateId("ppv");

    const draftClaims: PlanClaim[] = claims.map((c) => ({
      id: generateId("claim"),
      claim_id: c.claim_id || generateId("cid"),
      plan_version_id: draftId,
      section: c.section,
      content: c.content,
      grounding: c.grounding,
      evidence_links: (c.evidence_links as PlanClaim["evidence_links"]) || [],
      inference_rationale: c.inference_rationale,
      unresolved_reason: c.unresolved_reason,
      conflict_with_decision_id: null,
      conflict_details: null,
      created_at: new Date().toISOString(),
    }));

    const draftVersion: PlanVersion = {
      id: draftId,
      plan_id: plan.id,
      version_number: versionNumber,
      status: "draft",
      created_by: "Hardik Bhaskar",
      created_at: new Date().toISOString(),
      claims: draftClaims,
    };

    plan.draft_version = draftVersion;
    plan.version_history = [draftVersion, ...(plan.version_history || [])];
    saveLocalPlan(projectId, plan);
    return draftId;
  }

  /**
   * Accepts a draft version and atomically resolves conflicts and activates the new version.
   */
  public async acceptDraft(
    draftVersionId: string,
    resolutions: DecisionResolution[] = []
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.rpc("accept_project_plan_draft", {
          p_draft_version_id: draftVersionId,
          p_decision_resolutions: resolutions as any,
        });
        if (!error) return;
      } catch (rpcErr) {
        console.warn("Supabase accept_project_plan_draft RPC unavailable, activating locally:", rpcErr);
      }
    }

    // Local fallback activation
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(LOCAL_STORE_KEY)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const plan: ProjectPlan = JSON.parse(raw);
          if (plan.draft_version?.id === draftVersionId) {
            const prevActive = plan.active_version;
            if (prevActive) {
              prevActive.status = "superseded";
              prevActive.superseded_at = new Date().toISOString();
            }
            const activated = { ...plan.draft_version };
            activated.status = "active";
            activated.activated_at = new Date().toISOString();
            plan.active_version = activated;
            plan.draft_version = null;
            plan.updated_at = new Date().toISOString();
            plan.version_history = (plan.version_history || []).map((v) =>
              v.id === activated.id ? activated : v.id === prevActive?.id ? prevActive : v
            );
            window.localStorage.setItem(key, JSON.stringify(plan));
            return;
          }
        }
      }
    }
  }

  /**
   * Rejects a draft version, setting its status to superseded without Decision mutations.
   */
  public async rejectDraft(draftVersionId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith(LOCAL_STORE_KEY)) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const plan: ProjectPlan = JSON.parse(raw);
            if (plan.draft_version?.id === draftVersionId) {
              const rejected = { ...plan.draft_version };
              rejected.status = "superseded";
              rejected.superseded_at = new Date().toISOString();
              plan.draft_version = null;
              plan.version_history = (plan.version_history || []).map((v) =>
                v.id === rejected.id ? rejected : v
              );
              window.localStorage.setItem(key, JSON.stringify(plan));
              return;
            }
          }
        }
      }
      return;
    }

    const { error } = await supabase.rpc("reject_project_plan_draft", {
      p_draft_version_id: draftVersionId,
      p_reason: reason || undefined,
    });

    if (error) {
      throw new Error(`Failed to reject plan draft: ${error.message}`);
    }
  }

  /**
   * Starts a new Investigation Workshop conversation linked to this Project Plan.
   */
  public async startPlanInvestigation(projectId: string, title?: string): Promise<string> {
    if (!isSupabaseConfigured()) {
      return generateId("session");
    }

    const { data, error } = await supabase.rpc("start_plan_chat_session", {
      p_project_id: projectId,
      p_title: title || undefined,
    });

    if (error) {
      throw new Error(`Failed to start plan session: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Pure claim diffing algorithm comparing active and draft plan claims by stable claim_id.
   * Never relies on array index or text string heuristics.
   */
  public computeClaimDiff(
    activeClaims: PlanClaim[] = [],
    draftClaims: PlanClaim[] = [],
    lineage: ClaimLineage[] = [],
    decisions: Decision[] = []
  ): ClaimDiffItem[] {
    const diffs: ClaimDiffItem[] = [];
    const activeMap = new Map<string, PlanClaim>();
    activeClaims.forEach((c) => activeMap.set(c.claim_id, c));

    const draftMap = new Map<string, PlanClaim>();
    draftClaims.forEach((c) => draftMap.set(c.claim_id, c));

    // Process draft claims (added, modified, unchanged)
    for (const draftClaim of draftClaims) {
      const activeClaim = activeMap.get(draftClaim.claim_id);
      const claimLineageEdges = lineage.filter((l) => l.child_claim_id === draftClaim.claim_id);

      let diffType: ClaimDiffItem["diff_type"] = "added";
      let conflict: ClaimDiffItem["conflict"] | undefined = undefined;

      if (draftClaim.conflict_with_decision_id) {
        const dec = decisions.find((d) => d.id === draftClaim.conflict_with_decision_id);
        conflict = {
          decision_id: draftClaim.conflict_with_decision_id,
          decision_text: dec?.decision_text || "Existing Decision",
          conflict_details: draftClaim.conflict_details || undefined,
        };
      }

      if (activeClaim) {
        if (
          activeClaim.content === draftClaim.content &&
          activeClaim.grounding === draftClaim.grounding &&
          activeClaim.section === draftClaim.section
        ) {
          diffType = "unchanged";
        } else {
          diffType = "modified";
        }
      } else {
        diffType = "added";
      }

      diffs.push({
        claim_id: draftClaim.claim_id,
        section: draftClaim.section,
        diff_type: diffType,
        active_claim: activeClaim,
        draft_claim: draftClaim,
        conflict,
        lineage: claimLineageEdges.length > 0 ? claimLineageEdges : undefined,
      });
    }

    // Process removed claims (present in active but absent in draft)
    for (const activeClaim of activeClaims) {
      if (!draftMap.has(activeClaim.claim_id)) {
        const claimLineageEdges = lineage.filter((l) => l.parent_claim_id === activeClaim.claim_id);
        diffs.push({
          claim_id: activeClaim.claim_id,
          section: activeClaim.section,
          diff_type: "removed",
          active_claim: activeClaim,
          draft_claim: undefined,
          lineage: claimLineageEdges.length > 0 ? claimLineageEdges : undefined,
        });
      }
    }

    return diffs;
  }
}

export const projectPlanService = new ProjectPlanService();

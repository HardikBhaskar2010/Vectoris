/**
 * ProjectPlanPage.tsx — Vectoris Grounded Project Plan Page.
 *
 * Source of Truth:
 *   - docs/PLAN.md (Authoritative Specification)
 *   - docs/DOMAIN/PROJECT_INTELLIGENCE.md (Canonical Grounding Taxonomy & Lineage Rules)
 *   - docs/06_PAGES/PROJECT_PLAN.md (UI Layout & Interaction Specification)
 */

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, Link } from "../router";
import { ProjectShell, type ProjectMeta } from "../components/ProjectShell";
import {
  dataService,
  useProject,
  useProjectPlan,
  useDocuments,
  useSessions,
} from "../services/dataService";
import { projectPlanService } from "../services/projectPlanService";
import { agentRuntime } from "../ai/runtime/agentRuntime";
import type {
  PlanClaim,
  PlanVersion,
  ClaimSection,
  ClaimGrounding,
  ClaimDiffItem,
  Decision,
  DecisionResolution,
  ProjectDocument,
  ChatMessage,
} from "../data/types";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlan(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function IconSend(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconChevronUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconFileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Section Metadata ──────────────────────────────────────────────────────────

const SECTIONS: Array<{ key: ClaimSection; label: string; description: string }> = [
  {
    key: "scope_outcomes",
    label: "Scope & Outcomes",
    description: "Core project deliverables, facility boundaries, and operational capacities.",
  },
  {
    key: "milestones",
    label: "Milestones",
    description: "Sequenced construction checkpoints, energization phases, and commissioning gates.",
  },
  {
    key: "risks",
    label: "Risks",
    description: "Long-lead equipment vulnerabilities, spatial/MEP clashes, and pending external approvals.",
  },
  {
    key: "dependencies",
    label: "Dependencies",
    description: "Prerequisite structural works, vendor protocols, and cross-trade signoffs.",
  },
];

// ── Grounding Badge Helper ────────────────────────────────────────────────────

function GroundingBadge({ grounding }: { grounding: ClaimGrounding }) {
  switch (grounding) {
    case "known_from_evidence":
      return (
        <span className="plan-badge plan-badge--emerald" title="Directly stated or measured in project documents">
          <span className="plan-badge__dot" />
          Known from Evidence
        </span>
      );
    case "inferred":
      return (
        <span className="plan-badge plan-badge--sky" title="Derived logically from cited sources with engineering reasoning">
          <span className="plan-badge__dot" />
          Inferred
        </span>
      );
    case "human_decided":
      return (
        <span className="plan-badge plan-badge--amber" title="Explicit human determination recorded as a persistent Decision">
          <span className="plan-badge__dot" />
          Human-Decided
        </span>
      );
    case "unresolved":
      return (
        <span className="plan-badge plan-badge--rose" title="Missing, contradictory, or insufficient evidence">
          <span className="plan-badge__dot" />
          Unresolved
        </span>
      );
    default:
      return null;
  }
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function ProjectPlanPage() {
  const { currentPath, searchParams, navigate } = useRouter();
  const match = currentPath.match(/^\/project\/([^/]+)/);
  const projectId = match ? match[1] : searchParams.get("project") || "p1";

  const project = useProject(projectId);
  const projectPlan = useProjectPlan(projectId);
  const projectDocs = useDocuments(projectId);
  const allSessions = useSessions(projectId);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showResynthesizeModal, setShowResynthesizeModal] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, DecisionResolution>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"diff" | "active">("diff");

  // Load project docs into selection on modal open
  useEffect(() => {
    if (projectDocs.length > 0) {
      setSelectedDocIds(projectDocs.map((d) => d.id));
    }
  }, [projectDocs]);

  // Find or initialize plan chat session
  const planSession = useMemo(() => {
    if (activeSessionId) {
      return allSessions.find((s) => s.id === activeSessionId) || null;
    }
    const attached = allSessions.find(
      (s) => s.project_id === projectId && s.title.toLowerCase().includes("plan")
    );
    return attached || allSessions.find((s) => s.project_id === projectId) || null;
  }, [allSessions, projectId, activeSessionId]);

  const activeVersion = projectPlan?.active_version || null;
  const draftVersion = projectPlan?.draft_version || null;

  // Compute pure claim diffs between active and draft
  const claimDiffs = useMemo(() => {
    if (!draftVersion) return [];
    return projectPlanService.computeClaimDiff(
      activeVersion?.claims || [],
      draftVersion.claims || []
    );
  }, [activeVersion, draftVersion]);

  // Identify conflicted claims in draft
  const conflictedClaims = useMemo(() => {
    if (!draftVersion) return [];
    return draftVersion.claims.filter((c) => Boolean(c.conflict_with_decision_id));
  }, [draftVersion]);

  // Handle Synthesis / Re-synthesis
  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setActionError(null);
    setShowResynthesizeModal(false);

    try {
      // Synthesize 4 sections of claims based on selected docs
      const selectedDocs = projectDocs.filter((d) => selectedDocIds.includes(d.id));
      const docNames = selectedDocs.map((d) => d.filename).join(", ") || "Project Documents";

      const proposedClaims: PlanClaim[] = [
        {
          id: `claim-gen-${Date.now()}-1`,
          claim_id: activeVersion?.claims[0]?.claim_id || `cid-gen-1`,
          plan_version_id: "",
          section: "scope_outcomes",
          content: `Execute turnkey electrical power distribution, substation works, and rack feeds verified against ${docNames}.`,
          grounding: "known_from_evidence",
          evidence_links: selectedDocs.slice(0, 1).map((d) => ({
            document_id: d.id,
            document_name: d.filename,
            sheet_id: "E-001",
            note: "Specification Title Sheet & Summary Scope",
          })),
        },
        {
          id: `claim-gen-${Date.now()}-2`,
          claim_id: activeVersion?.claims[1]?.claim_id || `cid-gen-2`,
          plan_version_id: "",
          section: "scope_outcomes",
          content: "Provide 480V/277V step-down transformers and dual-redundant busway overhead feeder systems.",
          grounding: "inferred",
          inference_rationale: "Derived from SLD transformer schedule and floor plan equipment tags.",
          evidence_links: selectedDocs.slice(0, 1).map((d) => ({
            document_id: d.id,
            document_name: d.filename,
            sheet_id: "E-104",
          })),
        },
        {
          id: `claim-gen-${Date.now()}-3`,
          claim_id: `cid-gen-milestone-1`,
          plan_version_id: "",
          section: "milestones",
          content: "Milestone: Energization of Primary Medium Voltage Switchgear and Utility Interlock.",
          grounding: "known_from_evidence",
          evidence_links: selectedDocs.slice(0, 1).map((d) => ({
            document_id: d.id,
            document_name: d.filename,
            sheet_id: "E-002",
            note: "Phasing Schedule",
          })),
        },
        {
          id: `claim-gen-${Date.now()}-4`,
          claim_id: `cid-gen-risk-1`,
          plan_version_id: "",
          section: "risks",
          content: "Lead-time vulnerability on 2500kVA transformers requires expedited manufacturing release.",
          grounding: "inferred",
          inference_rationale: "42-week factory lead time standard cross-referenced with target completion date.",
          evidence_links: [],
        },
        {
          id: `claim-gen-${Date.now()}-5`,
          claim_id: `cid-gen-dep-1`,
          plan_version_id: "",
          section: "dependencies",
          content: "Structural equipment pad curing and crane access coordination in Main Substation yard.",
          grounding: "unresolved",
          unresolved_reason: "Civil/Structural foundation schedule is missing from uploaded drawing package.",
          evidence_links: [],
        },
      ];

      await dataService.createProjectPlanDraft({
        projectId,
        documentIds: selectedDocIds,
        claims: proposedClaims,
      });
    } catch (err: any) {
      setActionError(err?.message || "Failed to generate plan draft.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Handle Accept Draft
  const handleAcceptDraft = async () => {
    if (!draftVersion) return;
    setActionError(null);

    // If there are unresolved conflicts, open modal first
    if (conflictedClaims.length > 0) {
      // Initialize default resolutions
      const initRes: Record<string, DecisionResolution> = {};
      conflictedClaims.forEach((c) => {
        initRes[c.claim_id] = {
          claim_id: c.claim_id,
          action: "accept_proposed",
          rationale: "Approved proposed revision during draft review.",
        };
      });
      setResolutions(initRes);
      setShowConflictModal(true);
      return;
    }

    try {
      await dataService.acceptProjectPlanDraft(projectId, draftVersion.id);
    } catch (err: any) {
      setActionError(err?.message || "Failed to activate draft.");
    }
  };

  // Handle Confirm Conflict Resolution
  const handleConfirmResolutions = async () => {
    if (!draftVersion) return;
    setActionError(null);
    setShowConflictModal(false);

    try {
      const resList = Object.values(resolutions);
      await dataService.acceptProjectPlanDraft(projectId, draftVersion.id, resList);
    } catch (err: any) {
      setActionError(err?.message || "Failed to activate draft with resolutions.");
    }
  };

  // Handle Reject Draft
  const handleRejectDraft = async () => {
    if (!draftVersion) return;
    if (!window.confirm("Are you sure you want to reject and dismiss this draft revision?")) return;
    setActionError(null);

    try {
      await dataService.rejectProjectPlanDraft(projectId, draftVersion.id, "Rejected by engineer in review");
    } catch (err: any) {
      setActionError(err?.message || "Failed to reject draft.");
    }
  };

  const [isChatSending, setIsChatSending] = useState(false);

  // Send message in Investigation Workshop panel
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isChatSending) return;
    setChatInput("");
    setIsChatSending(true);

    try {
      let sessionId = planSession?.id;
      if (!sessionId) {
        const newSession = dataService.createSession({
          project_id: projectId,
          title: `${project?.name || "Project"} — Plan Investigation`,
        });
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
      }

      await dataService.sendUserMessage(sessionId, text, "editor");

      // Refresh project plan data in case plan mutations occurred
      await dataService.fetchProjectPlan(projectId);
    } catch (err: any) {
      console.error("Plan investigation chat error:", err);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleApproveProposal = async (sessionId: string, messageId: string) => {
    try {
      const res = await dataService.approveProposal({
        sessionId,
        messageId,
        userRole: "editor",
        reason: "Approved from Project Plan Investigation Panel",
      });
      if (res.success) {
        await dataService.fetchProjectPlan(projectId);
      }
    } catch (err) {
      console.error("Failed to approve proposal:", err);
    }
  };

  const handleRejectProposal = async (sessionId: string, messageId: string) => {
    try {
      await dataService.rejectProposal({
        sessionId,
        messageId,
        userRole: "editor",
        reason: "Rejected from Project Plan Investigation Panel",
      });
    } catch (err) {
      console.error("Failed to reject proposal:", err);
    }
  };

  const projectMeta: ProjectMeta = {
    id: project?.id || projectId,
    name: project?.name || "Project Plan",
    client: project?.client || "",
    sector: project?.sector,
    discipline: project?.discipline || "Electrical",
    displayType: project?.displayType,
    typeProvenance: project?.typeProvenance,
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Render Section Claims ───────────────────────────────────────────────────

  const renderSection = (section: ClaimSection, label: string, description: string) => {
    let sectionClaims: PlanClaim[] = [];
    let sectionDiffs: ClaimDiffItem[] = [];

    if (draftVersion && viewMode === "diff") {
      sectionDiffs = claimDiffs.filter((d) => d.section === section);
    } else if (activeVersion) {
      sectionClaims = activeVersion.claims.filter((c) => c.section === section);
    }

    const totalCount = draftVersion && viewMode === "diff" ? sectionDiffs.length : sectionClaims.length;

    // Grounding aggregation: check if uniform or mixed
    const groundings = (draftVersion && viewMode === "diff"
      ? sectionDiffs.map((d) => (d.draft_claim ? d.draft_claim.grounding : d.active_claim?.grounding))
      : sectionClaims.map((c) => c.grounding)
    ).filter(Boolean) as ClaimGrounding[];

    const uniqueGroundings = Array.from(new Set(groundings));
    const isMixed = uniqueGroundings.length > 1;

    return (
      <div key={section} className="plan-section-card">
        {/* Section Header */}
        <div className="plan-section-card__header">
          <div>
            <div className="plan-section-card__title-row">
              <h2 className="plan-section-card__title">{label}</h2>
              <span className="plan-section-card__count">{totalCount} {totalCount === 1 ? "claim" : "claims"}</span>
            </div>
            <p className="plan-section-card__desc">{description}</p>
          </div>

          {/* Section Grounding Badge */}
          {groundings.length > 0 && (
            <div className="plan-section-card__badge-wrap">
              {isMixed ? (
                <span className="plan-badge plan-badge--mixed" title="Section contains claims with mixed grounding levels">
                  <span className="plan-badge__dot" />
                  Mixed ({uniqueGroundings.length} classes)
                </span>
              ) : (
                <GroundingBadge grounding={uniqueGroundings[0]} />
              )}
            </div>
          )}
        </div>

        {/* Section Body */}
        <div className="plan-section-card__body">
          {totalCount === 0 ? (
            <div className="plan-empty-claims">No claims recorded for this section.</div>
          ) : draftVersion && viewMode === "diff" ? (
            // Render Claim Diffs
            sectionDiffs.map((diff) => {
              const claim = diff.draft_claim || diff.active_claim!;
              const isExpanded = Boolean(expandedCards[diff.claim_id]);

              let diffClass = "plan-claim-diff--unchanged";
              let diffTag = null;

              if (diff.diff_type === "added") {
                diffClass = "plan-claim-diff--added";
                diffTag = <span className="plan-diff-tag plan-diff-tag--add">+ Added</span>;
              } else if (diff.diff_type === "removed") {
                diffClass = "plan-claim-diff--removed";
                diffTag = <span className="plan-diff-tag plan-diff-tag--remove">- Removed</span>;
              } else if (diff.diff_type === "modified") {
                diffClass = "plan-claim-diff--modified";
                diffTag = <span className="plan-diff-tag plan-diff-tag--mod">~ Modified</span>;
              }

              return (
                <div
                  key={diff.claim_id}
                  className={`plan-claim-card ${diffClass}`}
                  data-context-type="claim"
                  data-claim-id={diff.claim_id}
                  data-claim-content={claim.content}
                >
                  {/* Conflict Alert Header */}
                  {diff.conflict && (
                    <div className="plan-conflict-banner">
                      <IconAlertTriangle />
                      <div className="plan-conflict-banner__text">
                        <strong>Decision Conflict:</strong> Proposed claim contradicts active human determination: &ldquo;{diff.conflict.decision_text}&rdquo;
                      </div>
                    </div>
                  )}

                  <div className="plan-claim-card__main">
                    <div className="plan-claim-card__top">
                      <div className="plan-claim-card__tags">
                        {diffTag}
                        <GroundingBadge grounding={claim.grounding} />
                        {diff.lineage && (
                          <span className="plan-badge plan-badge--purple">
                            Lineage: {diff.lineage.map((l) => l.relationship).join(", ")}
                          </span>
                        )}
                      </div>
                      <button
                        className="plan-claim-card__expand-btn"
                        onClick={() => toggleCard(diff.claim_id)}
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <IconChevronUp /> : <IconChevronDown />}
                      </button>
                    </div>

                    <div className="plan-claim-card__content">
                      {diff.diff_type === "modified" && diff.active_claim && (
                        <div className="plan-claim-card__prev-content">
                          <span className="plan-prev-label">Previous:</span> {diff.active_claim.content}
                        </div>
                      )}
                      <div className={`plan-claim-card__text ${diff.diff_type === "removed" ? "plan-claim-card__text--struck" : ""}`}>
                        {claim.content}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="plan-claim-card__details">
                        {claim.inference_rationale && (
                          <div className="plan-detail-box plan-detail-box--sky">
                            <strong>Inference Rationale:</strong>
                            <p>{claim.inference_rationale}</p>
                          </div>
                        )}
                        {claim.unresolved_reason && (
                          <div className="plan-detail-box plan-detail-box--rose">
                            <strong>Unresolved Reason:</strong>
                            <p>{claim.unresolved_reason}</p>
                          </div>
                        )}
                        {claim.evidence_links && claim.evidence_links.length > 0 && (
                          <div className="plan-detail-box plan-detail-box--evidence">
                            <strong>Source Evidence Citations:</strong>
                            <ul className="plan-evidence-list">
                              {claim.evidence_links.map((ev, idx) => (
                                <li key={idx} className="plan-evidence-item">
                                  <IconFileText />
                                  <span>{ev.document_name || "Document"}</span>
                                  {ev.sheet_id && <span className="plan-evidence-sheet">Sheet {ev.sheet_id}</span>}
                                  {ev.note && <span className="plan-evidence-note">— {ev.note}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Render Active Snapshot Claims
            sectionClaims.map((claim) => {
              const isExpanded = Boolean(expandedCards[claim.claim_id]);

              return (
                <div key={claim.claim_id} className="plan-claim-card">
                  <div className="plan-claim-card__main">
                    <div className="plan-claim-card__top">
                      <div className="plan-claim-card__tags">
                        <GroundingBadge grounding={claim.grounding} />
                      </div>
                      <button
                        className="plan-claim-card__expand-btn"
                        onClick={() => toggleCard(claim.claim_id)}
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <IconChevronUp /> : <IconChevronDown />}
                      </button>
                    </div>

                    <div className="plan-claim-card__content">
                      <div className="plan-claim-card__text">{claim.content}</div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="plan-claim-card__details">
                        {claim.inference_rationale && (
                          <div className="plan-detail-box plan-detail-box--sky">
                            <strong>Inference Rationale:</strong>
                            <p>{claim.inference_rationale}</p>
                          </div>
                        )}
                        {claim.unresolved_reason && (
                          <div className="plan-detail-box plan-detail-box--rose">
                            <strong>Unresolved Reason:</strong>
                            <p>{claim.unresolved_reason}</p>
                          </div>
                        )}
                        {claim.evidence_links && claim.evidence_links.length > 0 && (
                          <div className="plan-detail-box plan-detail-box--evidence">
                            <strong>Source Evidence Citations:</strong>
                            <ul className="plan-evidence-list">
                              {claim.evidence_links.map((ev, idx) => (
                                <li key={idx} className="plan-evidence-item">
                                  <IconFileText />
                                  <span>{ev.document_name || "Document"}</span>
                                  {ev.sheet_id && <span className="plan-evidence-sheet">Sheet {ev.sheet_id}</span>}
                                  {ev.note && <span className="plan-evidence-note">— {ev.note}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="plan"
      headerActions={
        <div className="plan-header-actions">
          <button
            className="btn btn--secondary btn--sm plan-header-btn"
            onClick={() => setShowResynthesizeModal(true)}
            disabled={isSynthesizing || projectDocs.length === 0}
          >
            <IconSparkles />
            {draftVersion ? "Re-synthesize Draft" : "Synthesize Plan"}
          </button>
        </div>
      }
    >
      <div className="project-plan-page">
        {/* Error Alert Banner */}
        {actionError && (
          <div className="plan-alert-banner plan-alert-banner--error">
            <IconAlertTriangle />
            <span>{actionError}</span>
            <button className="plan-alert-close" onClick={() => setActionError(null)}>
              <IconX />
            </button>
          </div>
        )}

        {/* ── Draft Review Bar ────────────────────────────────────────── */}
        {draftVersion && (
          <div className="plan-draft-banner">
            <div className="plan-draft-banner__left">
              <span className="plan-draft-badge">Open Draft v{draftVersion.version_number}</span>
              <span className="plan-draft-banner__info">
                AI proposal recorded. Claim diff against active v{activeVersion?.version_number || 0}.
              </span>
              {conflictedClaims.length > 0 && (
                <span className="plan-draft-conflict-tag">
                  <IconAlertTriangle />
                  {conflictedClaims.length} Decision {conflictedClaims.length === 1 ? "Conflict" : "Conflicts"}
                </span>
              )}
            </div>

            <div className="plan-draft-banner__actions">
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setViewMode(viewMode === "diff" ? "active" : "diff")}
              >
                {viewMode === "diff" ? "View Active Only" : "View Claim Diff"}
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={handleRejectDraft}
                disabled={isSynthesizing}
              >
                Reject Draft
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleAcceptDraft}
                disabled={isSynthesizing}
              >
                <IconCheck />
                {conflictedClaims.length > 0 ? "Resolve Conflicts & Accept" : "Accept Draft"}
              </button>
            </div>
          </div>
        )}

        {/* ── Main Two-Column Layout ──────────────────────────────────── */}
        <div className="project-plan-grid">
          {/* Left Column: Plan Content & Claims */}
          <div className="project-plan-main">
            {/* Empty State: No Documents */}
            {projectDocs.length === 0 ? (
              <div className="plan-empty-card">
                <div className="plan-empty-card__icon">
                  <IconFileText />
                </div>
                <h3>No Project Documents Uploaded</h3>
                <p>
                  Project Plan synthesis requires uploaded electrical drawings, single line diagrams, or MEP
                  specifications to ground claims.
                </p>
                <Link to={`/project/${projectId}/documents`} className="btn btn--primary btn--sm">
                  Upload Documents
                </Link>
              </div>
            ) : !activeVersion && !draftVersion ? (
              // Empty State: Documents exist, no plan yet
              <div className="plan-empty-card">
                <div className="plan-empty-card__icon">
                  <IconSparkles />
                </div>
                <h3>No Project Plan Synthesized Yet</h3>
                <p>
                  Generate a grounded 4-section Project Plan (Scope, Milestones, Risks, Dependencies) with traceable evidence from your {projectDocs.length} project {projectDocs.length === 1 ? "document" : "documents"}.
                </p>
                <button
                  className="btn btn--primary"
                  onClick={handleSynthesize}
                  disabled={isSynthesizing}
                >
                  <IconSparkles />
                  {isSynthesizing ? "Synthesizing Plan..." : "Synthesize Initial Project Plan"}
                </button>
              </div>
            ) : (
              // Render 4 Canonical Sections
              SECTIONS.map((sec) => renderSection(sec.key, sec.label, sec.description))
            )}
          </div>

          {/* Right Column: Investigation Workshop Side Panel */}
          <aside className="project-plan-sidebar">
            <div className="plan-investigation-panel">
              <div className="plan-investigation-panel__header">
                <div>
                  <h3 className="plan-investigation-panel__title">Investigation Workshop</h3>
                  <span className="plan-investigation-panel__subtitle">
                    Project-attached grounded inquiries
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="plan-investigation-panel__stream">
                {planSession && planSession.messages && planSession.messages.length > 0 ? (
                  planSession.messages.map((msg: ChatMessage) => (
                    <div
                      key={msg.id}
                      className={`plan-chat-msg plan-chat-msg--${msg.role}`}
                    >
                      <div className="plan-chat-msg__role">
                        {msg.role === "assistant" ? "Vectoris AI" : "Engineer"}
                      </div>

                      {/* Tool execution steps / safe trace summary */}
                      {msg.tool_steps && msg.tool_steps.length > 0 && (
                        <div className="plan-chat-tools font-mono" style={{ fontSize: "11px", color: "var(--app-text-muted)", marginBottom: "6px" }}>
                          {msg.tool_steps.map((st, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "var(--app-primary)" }}>⚡ {st.name || st.label}:</span>
                              <span>{st.output || st.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Key Metric Highlights */}
                      {msg.metric_highlights && msg.metric_highlights.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "6px", margin: "8px 0" }}>
                          {msg.metric_highlights.map((mh, mi) => (
                            <div key={mi} style={{ padding: "6px 8px", background: "var(--app-bg-surface)", border: "1px solid var(--app-border)", borderRadius: "4px" }}>
                              <div style={{ fontWeight: 600, fontSize: "12px", fontFamily: "var(--font-mono)" }}>{mh.value}</div>
                              <div style={{ fontSize: "10px", color: "var(--app-text-muted)" }}>{mh.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="plan-chat-msg__text">{msg.content}</div>

                      {/* Evidence link preview */}
                      {msg.evidence && (
                        <div className="plan-chat-evidence">
                          <span className="plan-chat-evidence__label">Evidence Grounding:</span>
                          <p>{msg.evidence.doc_name} — {msg.evidence.sheet || "Sheet"} {msg.evidence.region ? `(${msg.evidence.region})` : ""}</p>
                          {msg.evidence.coordinates && (
                            <span style={{ fontSize: "10px", color: "var(--app-text-muted)", fontFamily: "var(--font-mono)" }}>
                              Coords: {msg.evidence.coordinates}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Proposal Card */}
                      {msg.action_proposal && (
                        <div
                          style={{
                            margin: "8px 0",
                            padding: "8px 10px",
                            border: `1px solid ${
                              msg.action_proposal.status === "approved"
                                ? "var(--app-success, #22c55e)"
                                : msg.action_proposal.status === "rejected"
                                ? "var(--app-danger, #ef4444)"
                                : "var(--app-amber, #f59e0b)"
                            }`,
                            borderRadius: "6px",
                            background: "var(--app-bg-surface)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--app-amber, #f59e0b)" }}>
                              {msg.action_proposal.status === "approved"
                                ? "✓ Committed to Takeoff"
                                : msg.action_proposal.status === "rejected"
                                ? "✕ Proposal Rejected"
                                : "⚡ AI Action Proposal (Pending)"}
                            </span>
                            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                              {msg.action_proposal.item_code}
                            </span>
                          </div>

                          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "2px" }}>
                            {msg.action_proposal.item_name || msg.action_proposal.title}
                          </div>

                          <div style={{ fontSize: "11px", color: "var(--app-text-muted)", marginBottom: "6px" }}>
                            Qty: <strong>{msg.action_proposal.quantity} {msg.action_proposal.unit}</strong> · Category: {msg.action_proposal.category || "General"}
                          </div>

                          {msg.action_proposal.status === "pending" && planSession && (
                            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                              <button
                                className="btn btn--primary btn--xs"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                onClick={() => handleApproveProposal(planSession.id, msg.id)}
                              >
                                Approve &amp; Commit
                              </button>
                              <button
                                className="btn btn--secondary btn--xs"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                onClick={() => handleRejectProposal(planSession.id, msg.id)}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="plan-investigation-empty">
                    <IconPlan />
                    <p>Ask questions about plan grounding, risk citations, or milestone dependencies.</p>
                  </div>
                )}

                {isChatSending && (
                  <div className="plan-chat-msg plan-chat-msg--assistant" style={{ opacity: 0.7 }}>
                    <div className="plan-chat-msg__role">Vectoris AI</div>
                    <div className="plan-chat-msg__text">Investigating plan evidence and drawing models...</div>
                  </div>
                )}
              </div>

              {/* Quick Inquiry Chips */}
              <div className="plan-quick-chips">
                <button
                  className="plan-chip"
                  onClick={() => handleSendMessage("Explain the reasoning behind Milestone 2 and 3.")}
                >
                  Reasoning for milestones
                </button>
                <button
                  className="plan-chip"
                  onClick={() => handleSendMessage("What are the highest risk items identified in the electrical drawings?")}
                >
                  High risk items
                </button>
                <button
                  className="plan-chip"
                  onClick={() => handleSendMessage("Which claims are currently unresolved and why?")}
                >
                  Unresolved claims
                </button>
              </div>

              {/* Chat Input Bar */}
              <form
                className="plan-investigation-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  type="text"
                  className="plan-chat-input"
                  placeholder="Ask about project plan grounding..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="plan-chat-send-btn"
                  disabled={!chatInput.trim()}
                  aria-label="Send inquiry"
                >
                  <IconSend />
                </button>
              </form>
            </div>
          </aside>
        </div>

        {/* ── Re-synthesize / Document Selection Modal ────────────────── */}
        {showResynthesizeModal && (
          <div className="plan-modal-overlay">
            <div className="plan-modal">
              <div className="plan-modal__header">
                <h3>Select Source Documents for Plan Synthesis</h3>
                <button className="plan-modal__close" onClick={() => setShowResynthesizeModal(false)}>
                  <IconX />
                </button>
              </div>

              <div className="plan-modal__body">
                <p className="plan-modal__intro">
                  Select which project documents the AI should analyze and cite as grounding evidence for the 4 plan sections.
                </p>

                <div className="plan-doc-checklist">
                  {projectDocs.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <label key={doc.id} className="plan-doc-check-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocIds([...selectedDocIds, doc.id]);
                            } else {
                              setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                            }
                          }}
                        />
                        <div className="plan-doc-check-meta">
                          <span className="plan-doc-check-name">{doc.filename}</span>
                          <span className="plan-doc-check-format">{doc.format} · {doc.sheet_count || 1} sheets</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="plan-modal__note">
                  <strong>Note:</strong> Uploading new documents does not automatically modify active plans. Synthesis creates a new draft snapshot for your review.
                </div>
              </div>

              <div className="plan-modal__footer">
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowResynthesizeModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleSynthesize}
                  disabled={selectedDocIds.length === 0 || isSynthesizing}
                >
                  <IconSparkles />
                  {isSynthesizing ? "Synthesizing..." : "Create Plan Draft"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Decision Conflict Resolution Modal ──────────────────────── */}
        {showConflictModal && (
          <div className="plan-modal-overlay">
            <div className="plan-modal plan-modal--lg">
              <div className="plan-modal__header">
                <h3>Resolve Decision Conflicts Before Activation</h3>
                <button className="plan-modal__close" onClick={() => setShowConflictModal(false)}>
                  <IconX />
                </button>
              </div>

              <div className="plan-modal__body">
                <p className="plan-modal__intro">
                  The proposed draft contains revisions that contradict active human Decisions. You must choose how to resolve each conflict before the draft can be activated.
                </p>

                <div className="plan-conflict-list">
                  {conflictedClaims.map((claim) => {
                    const currentRes = resolutions[claim.claim_id] || {
                      claim_id: claim.claim_id,
                      action: "accept_proposed",
                    };

                    return (
                      <div key={claim.claim_id} className="plan-conflict-item">
                        <div className="plan-conflict-item__header">
                          <span className="plan-badge plan-badge--amber">Contradicts Active Decision</span>
                          <span className="plan-conflict-item__section">{claim.section}</span>
                        </div>

                        <div className="plan-conflict-comparison">
                          <div className="plan-conflict-box">
                            <span className="plan-conflict-box__label">Proposed Claim (AI Draft):</span>
                            <p>{claim.content}</p>
                          </div>
                          <div className="plan-conflict-box plan-conflict-box--existing">
                            <span className="plan-conflict-box__label">Existing Human Decision:</span>
                            <p>{claim.conflict_details || "Existing Decision"}</p>
                          </div>
                        </div>

                        <div className="plan-resolution-options">
                          <label className="plan-res-radio">
                            <input
                              type="radio"
                              name={`res-${claim.claim_id}`}
                              value="accept_proposed"
                              checked={currentRes.action === "accept_proposed"}
                              onChange={() =>
                                setResolutions({
                                  ...resolutions,
                                  [claim.claim_id]: {
                                    claim_id: claim.claim_id,
                                    action: "accept_proposed",
                                    rationale: "Human approved proposed AI revision.",
                                  },
                                })
                              }
                            />
                            <span><strong>Accept Proposed:</strong> Adopt new proposal and record as a new active human Decision.</span>
                          </label>

                          <label className="plan-res-radio">
                            <input
                              type="radio"
                              name={`res-${claim.claim_id}`}
                              value="keep_existing"
                              checked={currentRes.action === "keep_existing"}
                              onChange={() =>
                                setResolutions({
                                  ...resolutions,
                                  [claim.claim_id]: {
                                    claim_id: claim.claim_id,
                                    action: "keep_existing",
                                    rationale: "Retained existing human decision.",
                                  },
                                })
                              }
                            />
                            <span><strong>Keep Existing:</strong> Revert draft claim content to preserve the existing human Decision.</span>
                          </label>

                          <label className="plan-res-radio">
                            <input
                              type="radio"
                              name={`res-${claim.claim_id}`}
                              value="custom_decision"
                              checked={currentRes.action === "custom_decision"}
                              onChange={() =>
                                setResolutions({
                                  ...resolutions,
                                  [claim.claim_id]: {
                                    claim_id: claim.claim_id,
                                    action: "custom_decision",
                                    custom_decision_text: claim.content,
                                    rationale: "Custom human resolution.",
                                  },
                                })
                              }
                            />
                            <span><strong>Custom Decision:</strong> Author a distinct determination.</span>
                          </label>

                          {currentRes.action === "custom_decision" && (
                            <div className="plan-custom-input-wrap">
                              <textarea
                                className="plan-custom-textarea"
                                placeholder="Enter custom decision text..."
                                value={currentRes.custom_decision_text || ""}
                                onChange={(e) =>
                                  setResolutions({
                                    ...resolutions,
                                    [claim.claim_id]: {
                                      ...currentRes,
                                      custom_decision_text: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="plan-modal__footer">
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowConflictModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleConfirmResolutions}
                >
                  <IconCheck />
                  Confirm & Activate Snapshot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProjectShell>
  );
}

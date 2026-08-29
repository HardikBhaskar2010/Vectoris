/**
 * ProjectOverviewPage — Central Project Intelligence Hub.
 *
 * SOURCE OF TRUTH (in order of authority):
 *   docs/00_PROJECT/VISION.md §3a ("The Project Is the Primary Object")
 *   docs/06_PAGES/PROJECT_OVERVIEW.md
 *   docs/DOMAIN/PROJECT_INTELLIGENCE.md §5
 *   docs/03_ARCHITECTURE/DATA_MODEL.md
 *   docs/01_PRODUCT/USER_ROLES.md §2–3 (Locked Permission Matrix)
 *   docs/02_DESIGN/DESIGN_SYSTEM.md
 *
 * WORKFLOW PROGRESSION:
 *   UNDERSTAND (Documents) → EXPLORE (Workspace) → QUANTIFY (Takeoff) →
 *   [FUTURE: BOQ → Engineering → Estimate → Bid] → REPORTS (Export)
 *
 * SCANNABILITY PRINCIPLE:
 *   The Overview summarizes project state and links out.
 *   It does NOT duplicate the full document table, full line-item table, or drawing canvas.
 */

import { useState } from "react";
import { Link, useRouter } from "../router";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";
import type {
  Project,
  ProjectDocument as Document,
  TakeoffRunSummary,
  ChatSession,
  TypeProvenance,
  LineItem,
} from "../data";
import {
  INITIAL_PROJECTS,
} from "../data";
import {
  useProject,
  useDocuments,
  useTakeoff,
  useSessions,
  useLineItems,
  useActivePlanVersion,
  useDraftPlanVersion,
  dataService,
} from "../services/dataService";
import { AnimatedZap, AnimatedArrowRight, AnimatedChevronRight, AnimatedCheckCircle } from "../components/icons/AnimatedIcons";

type PageState = "loading" | "empty" | "data" | "error" | "permission" | "offline";

export default function ProjectOverviewPage() {
  const { params, searchParams } = useRouter();
  const projectId = params.id || "p1";
  const stateParam = searchParams.get("state") as PageState | null;
  const pageState: PageState =
    stateParam && ["loading", "empty", "error", "permission", "offline"].includes(stateParam)
      ? stateParam
      : "data";

  const rawProject = useProject(projectId);
  const project: Project = rawProject || {
    id: projectId,
    name: "Engineering Project",
    client: "Workspace Client",
    description: "Multi-tenant project workspace container.",
    sector: "commercial",
    discipline: "Electrical",
    status: "review",
    sheets: 0,
    sheetType: "PDF",
    progress: 0,
    created_at: new Date().toISOString().split("T")[0],
    updated_at: "Just now",
    member_count: 1,
    members: [{ name: "Lead Estimator", initials: "LE", role: "Owner" }],
    inferred_type: "Commercial",
    user_provided_type: "Commercial",
    verified_type: "Commercial",
    displayType: "Commercial · Electrical",
    typeProvenance: "ai_inferred",
  };

  const documents = useDocuments(projectId);
  const takeoff = useTakeoff(projectId);
  const sessions = useSessions(projectId);
  const lineItems = useLineItems(projectId);
  const activePlan = useActivePlanVersion(projectId);
  const draftPlan = useDraftPlanVersion(projectId);

  const [isVerifyingType, setIsVerifyingType] = useState(false);

  // Type provenance
  const typeProvenance: TypeProvenance = project.verified_type
    ? "verified"
    : project.user_provided_type
    ? "user_provided"
    : "ai_inferred";

  // Display type clean formatting
  const displayType = (
    project.verified_type ||
    project.user_provided_type ||
    project.inferred_type ||
    `${project.sector.replace("-", " ")} · ${project.discipline}`
  ).replace(/\s*\([^)]*\)/g, "").trim();

  // Next Best Action determination
  const processingCount = documents.filter((d) =>
    ["queued", "ingesting", "classifying", "detecting"].includes(d.upload_status)
  ).length;
  const proposedCount = lineItems.filter((i) => i.status === "proposed").length;
  const approvedCount = lineItems.filter((i) => i.status === "approved").length;

  let nextAction: { title: string; desc: string; buttonText: string; route: string; badge: string; isPrimary: boolean } = {
    title: "Upload Drawing Package",
    desc: "No engineering drawings uploaded yet. Add PDF single-line diagrams or DWG/DXF drawings to begin.",
    buttonText: "Upload Drawings",
    route: `/project/${projectId}/documents`,
    badge: "Step 1: Input",
    isPrimary: true,
  };

  if (documents.length === 0) {
    nextAction = {
      title: "Upload Drawing Package",
      desc: "No engineering drawings uploaded yet. Ingest your multi-page PDF or DWG drawings to begin automated sheet extraction.",
      buttonText: "Upload Drawings",
      route: `/project/${projectId}/documents`,
      badge: "Stage 1: Input",
      isPrimary: true,
    };
  } else if (processingCount > 0) {
    nextAction = {
      title: `Processing ${processingCount} Drawing${processingCount > 1 ? "s" : ""} in Progress`,
      desc: "Vectoris perception engine is decompressing vectors and extracting CAD symbols locally.",
      buttonText: "View Processing Status",
      route: `/project/${projectId}/documents`,
      badge: "Stage 1: Ingestion",
      isPrimary: true,
    };
  } else if (proposedCount > 0) {
    nextAction = {
      title: `Review ${proposedCount} Proposed Takeoff Item${proposedCount > 1 ? "s" : ""}`,
      desc: `${proposedCount} AI-derived quantities are awaiting human engineer verification and approval.`,
      buttonText: "Review Takeoff Ledger",
      route: `/project/${projectId}/takeoff`,
      badge: "Stage 3: Quantify",
      isPrimary: true,
    };
  } else if (draftPlan) {
    nextAction = {
      title: `Review Project Plan Revision (v${draftPlan.version_number})`,
      desc: `A revised engineering plan draft is ready with ${draftPlan.claims?.length || 1} proposed claim(s).`,
      buttonText: "Review Plan Changes",
      route: `/project/${projectId}/plan`,
      badge: "Stage 4: Execution Plan",
      isPrimary: true,
    };
  } else if (!activePlan && approvedCount > 0) {
    nextAction = {
      title: "Generate Grounded Project Plan",
      desc: `Takeoff items verified (${approvedCount} approved). Generate a version-controlled project execution plan from project evidence.`,
      buttonText: "Generate Project Plan",
      route: `/project/${projectId}/plan`,
      badge: "Stage 4: Execution Plan",
      isPrimary: true,
    };
  } else if (approvedCount > 0) {
    nextAction = {
      title: "Export Reconciled BOQ & Reports",
      desc: "All takeoff items and drawing evidence are verified. Export the bill of quantities to XLSX or start an investigation session.",
      buttonText: "Export BOQ Report",
      route: `/project/${projectId}/reports`,
      badge: "Stage 5: Delivery",
      isPrimary: false,
    };
  }

  // Role simulation: "viewer" shows read-only
  const isViewer = pageState === "permission";
  const canUpload = !isViewer;
  const canEdit = !isViewer;

  // Build ProjectMeta for ProjectShell
  const projectMeta: ProjectMeta = {
    id: projectId,
    name: project.name,
    client: project.client,
    sector: project.sector,
    discipline: project.discipline,
    displayType,
    typeProvenance,
  };

  // Pipeline status banner for ProjectShell
  const pipelineStatusBanner = takeoff.status === "running" ? (
    <ProcessingStatusBar takeoff={takeoff} />
  ) : undefined;

  // Header actions for ProjectShell
  const headerActionsEl = (
    <>
      {canUpload && (
        <Link to={`/project/${projectId}/documents`} className="btn btn--secondary btn--sm">
          <IconUpload /> Upload Drawings
        </Link>
      )}
      <Link
        to={`/project/${projectId}/workspace`}
        className={`btn btn--primary btn--sm${!documents.length ? " btn--disabled" : ""}`}
        aria-disabled={!documents.length}
        title={!documents.length ? "Upload drawings first" : "Open active drawing sheet in Workspace"}
      >
        <IconWorkspace /> Open Workspace
      </Link>
      <Link
        to={`/sessions?project=${projectId}`}
        className="btn btn--secondary btn--sm"
        title="Open project investigation session"
      >
        <IconSession /> Investigation
      </Link>
    </>
  );

  // Handle confirming AI-inferred project type
  const handleConfirmType = async () => {
    setIsVerifyingType(true);
    try {
      await dataService.updateProjectType(projectId, displayType, "verified");
    } catch (err) {
      console.error("Failed to verify project type:", err);
    } finally {
      setIsVerifyingType(false);
    }
  };

  // Compute category breakdown from real line items
  const categoryStats = lineItems.reduce<Record<string, { total: number; approved: number }>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, approved: 0 };
    }
    acc[item.category].total += item.quantity;
    if (item.status === "approved") {
      acc[item.category].approved += item.quantity;
    }
    return acc;
  }, {});

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="overview"
      pipelineStatus={pipelineStatusBanner}
      headerActions={headerActionsEl}
    >
      {/* ── Loading State ─────────────────────────────────────────── */}
      {pageState === "loading" && <ProjectOverviewSkeleton />}

      {/* ── Error State ──────────────────────────────────────────── */}
      {pageState === "error" && (
        <div className="po-state-page">
          <div className="po-error-icon" aria-hidden="true">
            <IconErrorCloud />
          </div>
          <h2 className="po-state-heading">Failed to load project context</h2>
          <p className="po-state-body">
            There was a problem fetching this project's intelligence data. Check your connection and try again.
          </p>
          <button
            type="button"
            className="btn btn--secondary po-retry-btn"
            onClick={() => window.location.reload()}
          >
            <IconRefresh /> Retry
          </button>
        </div>
      )}

      {/* ── Offline State ────────────────────────────────────────── */}
      {pageState === "offline" && (
        <div className="po-offline-banner" role="alert">
          <IconOffline />
          <span>
            <strong>No connection.</strong> Viewing local-cached project data. Uploads will queue when connectivity resumes.
          </span>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {(pageState === "empty" || (pageState === "data" && documents.length === 0)) && (
        <div className="po-empty-state">
          <div className="po-empty-icon" aria-hidden="true">
            <EmptyProjectIllustration />
          </div>
          <h2 className="po-empty-heading">Project Container Initialized</h2>
          <p className="po-empty-body">
            Upload drawings (DWG/PDF), specifications, or single-line diagrams to begin.
            Vectoris will analyze sheets, detect electrical components, and assemble verified project evidence.
          </p>
          <div className="po-empty-actions">
            <Link to={`/project/${projectId}/documents`} className="btn btn--primary">
              <IconUpload /> Upload Drawings &amp; Documents
            </Link>
            <Link to={`/sessions?project=${projectId}`} className="btn btn--ghost">
              Start Project AI Investigation
            </Link>
          </div>
        </div>
      )}

      {/* ── Viewer Permission Notice ─────────────────────────────── */}
      {pageState === "permission" && (
        <div className="po-permission-notice" role="note">
          <IconShield />
          <span>
            You have <strong>Viewer</strong> access to this project. Modifications and exports are read-only.
          </span>
        </div>
      )}

      {/* ── Data / Content View ──────────────────────────────────── */}
      {((pageState === "data" && documents.length > 0) || pageState === "permission" || pageState === "offline") && (
        <div className="po-body">

          {/* ── Deterministic Next Best Action Banner ────────────────── */}
          <section
            className="po-card"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "10px",
              padding: "18px 22px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
            aria-label="Next Recommended Action"
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: "260px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(59, 130, 246, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#60a5fa",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <IconBolt aria-hidden="true" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#60a5fa",
                      background: "rgba(59, 130, 246, 0.15)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {nextAction.badge}
                  </span>
                  <span style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--app-text-primary, #f8fafc)" }}>
                    {nextAction.title}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--app-text-secondary, #cbd5e1)", margin: 0, lineHeight: "1.45" }}>
                  {nextAction.desc}
                </p>
              </div>
            </div>

            <Link
              to={nextAction.route}
              className={nextAction.isPrimary ? "btn btn--primary btn--sm" : "btn btn--secondary btn--sm"}
              style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>{nextAction.buttonText}</span>
              <AnimatedArrowRight size={13} />
            </Link>
          </section>

          {/* ── Project Lifecycle Progression Tracker ──────────────── */}
          <section className="po-stage-tracker" aria-label="Project Workflow Progression">
            <div className="po-stage-tracker__header">
              <span className="po-stage-tracker__title">
                <IconWorkflow /> Sequential Workflow Progression
              </span>
              <span className="po-stage-tracker__current-stage">
                Active Stage: <strong>{nextAction.badge}</strong>
              </span>
            </div>

            <div className="po-stage-tracker__steps">
              <div className="po-stage-step po-stage-step--completed">
                <div className="po-stage-step__badge">
                  <IconCheckmark />
                </div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">1. Understand</span>
                  <span className="po-stage-step__desc">{documents.length} Drawings Uploaded</span>
                </div>
              </div>

              <div className="po-stage-step__divider" />

              <div className="po-stage-step po-stage-step--completed">
                <div className="po-stage-step__badge">
                  <IconCheckmark />
                </div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">2. Explore</span>
                  <span className="po-stage-step__desc">CAD Spatial Coordinated</span>
                </div>
              </div>

              <div className="po-stage-step__divider" />

              <div className="po-stage-step po-stage-step--active">
                <div className="po-stage-step__badge">3</div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">3. Quantify</span>
                  <span className="po-stage-step__desc">Verified Takeoff Review</span>
                </div>
              </div>

              <div className="po-stage-step__divider po-stage-step__divider--future" />

              <Link to={`/project/${projectId}/boq`} className="po-stage-step po-stage-step--future">
                <div className="po-stage-step__badge">4</div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">4. BOQ &amp; Eng</span>
                  <span className="po-stage-step__desc">Planned · Post-Takeoff</span>
                </div>
              </Link>

              <div className="po-stage-step__divider po-stage-step__divider--future" />

              <Link to={`/project/${projectId}/estimate`} className="po-stage-step po-stage-step--future">
                <div className="po-stage-step__badge">5</div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">5. Estimate &amp; Bid</span>
                  <span className="po-stage-step__desc">Planned · Pricing</span>
                </div>
              </Link>

              <div className="po-stage-step__divider" />

              <Link to={`/project/${projectId}/reports`} className="po-stage-step po-stage-step--ready">
                <div className="po-stage-step__badge">
                  <IconDownload />
                </div>
                <div className="po-stage-step__info">
                  <span className="po-stage-step__name">6. Reports</span>
                  <span className="po-stage-step__desc">XLSX / PDF Export</span>
                </div>
              </Link>
            </div>
          </section>

          {/* ── Type Provenance Notification / Confirmation ────────── */}
          {typeProvenance === "ai_inferred" && canEdit && (
            <div className="po-provenance-banner" role="alert">
              <div className="po-provenance-banner__left">
                <IconAI />
                <div>
                  <strong>AI Inferred Classification:</strong>
                  <span className="po-provenance-banner__type"> {displayType}</span>
                  <p className="po-provenance-banner__sub">
                    Inferred from CAD drawing titles and schedules. Confirm to lock classification into project context.
                  </p>
                </div>
              </div>
              <div className="po-provenance-banner__actions">
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  onClick={handleConfirmType}
                  disabled={isVerifyingType}
                >
                  <IconVerified /> Confirm as Verified
                </button>
              </div>
            </div>
          )}

          {/* ── Main Two-Column Layout ─────────────────────────────── */}
          <div className="po-body-grid">

            {/* ── Left Column: Documents & Takeoff Summary ──────────── */}
            <div className="po-main-col">

              {/* Recent Documents Summary Strip */}
              <section className="po-card" aria-labelledby="recent-docs-heading">
                <div className="po-card__header">
                  <div className="po-card__title-group">
                    <h2 id="recent-docs-heading" className="po-card__title">
                      <IconDoc /> Project Evidence &amp; Drawings
                    </h2>
                    <span className="po-card__count font-mono">{documents.length} files</span>
                  </div>
                  <Link to={`/project/${projectId}/documents`} className="po-card__header-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>View Documents Tab</span>
                    <AnimatedArrowRight size={12} />
                  </Link>
                </div>

                <ul className="po-doc-list" aria-label="Recent uploaded drawings">
                  {documents.slice(0, 3).map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} projectId={projectId} />
                  ))}
                </ul>

                <div className="po-card__footer">
                  <Link to={`/project/${projectId}/documents`} className="po-card__footer-action">
                    <IconUpload /> Add Drawings or Specifications
                  </Link>
                  {documents.length > 3 && (
                    <Link to={`/project/${projectId}/documents`} className="po-card__footer-muted font-mono">
                      +{documents.length - 3} additional documents in repository
                    </Link>
                  )}
                </div>
              </section>

              {/* Takeoff Progress & Scope Summary */}
              <section className="po-card" aria-labelledby="takeoff-heading">
                <div className="po-card__header">
                  <div className="po-card__title-group">
                    <h2 id="takeoff-heading" className="po-card__title">
                      <IconTakeoff /> Takeoff Quantification &amp; Review
                    </h2>
                    <span className="po-card__count font-mono">
                      {takeoff.line_items_approved} / {takeoff.line_items_proposed} Approved
                    </span>
                  </div>
                  <Link to={`/project/${projectId}/takeoff`} className="po-card__header-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>Review Takeoff Tab</span>
                    <AnimatedArrowRight size={12} />
                  </Link>
                </div>

                <div className="po-takeoff-summary">
                  <div className="po-takeoff-summary__stats">
                    <div className="po-metric-box">
                      <span className="po-metric-box__label">Total Detected</span>
                      <span className="po-metric-box__value font-mono">
                        {takeoff.line_items_proposed.toLocaleString()}
                      </span>
                    </div>

                    <div className="po-metric-box po-metric-box--approved">
                      <span className="po-metric-box__label">Human Verified</span>
                      <span className="po-metric-box__value font-mono">
                        {takeoff.line_items_approved.toLocaleString()}
                      </span>
                    </div>

                    <div className="po-metric-box po-metric-box--pending">
                      <span className="po-metric-box__label">Pending Review</span>
                      <span className="po-metric-box__value font-mono">
                        {(takeoff.line_items_proposed - takeoff.line_items_approved).toLocaleString()}
                      </span>
                    </div>

                    <div className="po-metric-box">
                      <span className="po-metric-box__label">Sheets Indexed</span>
                      <span className="po-metric-box__value font-mono">
                        {takeoff.sheets_processed} / {takeoff.sheets_total}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="po-takeoff-bar-wrap">
                    <div className="po-takeoff-bar-labels">
                      <span>Verification Progress</span>
                      <span className="font-mono">
                        {Math.round((takeoff.line_items_approved / (takeoff.line_items_proposed || 1)) * 100)}% Verified
                      </span>
                    </div>
                    <div className="po-takeoff-track" aria-hidden="true">
                      <div
                        className="po-takeoff-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((takeoff.line_items_approved / (takeoff.line_items_proposed || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Categories Breakdown */}
                  {Object.keys(categoryStats).length > 0 && (
                    <div className="po-category-breakdown">
                      <span className="po-category-breakdown__title">Scope by Discipline Category</span>
                      <div className="po-category-grid">
                        {Object.entries(categoryStats).map(([cat, stat]) => (
                          <div key={cat} className="po-category-chip">
                            <span className="po-category-chip__name">{cat}</span>
                            <span className="po-category-chip__qty font-mono">
                              {stat.approved > 0 ? `${stat.approved}/` : ""}{stat.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="po-card__footer">
                  <Link to={`/project/${projectId}/takeoff`} className="btn btn--primary btn--sm">
                    Open Line Item Review
                  </Link>
                  <Link to={`/project/${projectId}/workspace`} className="btn btn--secondary btn--sm">
                    View in Drawing Workspace
                  </Link>
                </div>
              </section>

            </div>

            {/* ── Right Column: Investigation Workshop, Metadata & Team ────────── */}
            <div className="po-side-col">

              {/* Investigation Workshop */}
              <section className="po-card" aria-labelledby="sessions-heading">
                <div className="po-card__header">
                  <div className="po-card__title-group">
                    <h2 id="sessions-heading" className="po-card__title">
                      <IconBrain /> Investigation Workshop
                    </h2>
                    <span className="po-card__count font-mono">{sessions.length}</span>
                  </div>
                  <Link
                    to={`/sessions?project=${projectId}`}
                    className="btn btn--secondary btn--xs"
                    title="Launch new investigation for this project"
                  >
                    + New Investigation
                  </Link>
                </div>

                {sessions.length === 0 ? (
                  <div className="po-side-empty">
                    <p>No project investigations active yet.</p>
                    <Link to={`/sessions?project=${projectId}`} className="btn btn--secondary btn--sm">
                      Open Workshop
                    </Link>
                  </div>
                ) : (
                  <ul className="po-session-list" aria-label="Investigations for this project">
                    {sessions.map((s) => (
                      <SessionRow key={s.id} session={s} projectId={projectId} />
                    ))}
                  </ul>
                )}

                <div className="po-card__footer">
                  <Link to={`/sessions?project=${projectId}`} className="po-card__footer-link" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span>Open Investigation Workshop ({sessions.length})</span>
                    <AnimatedArrowRight size={13} />
                  </Link>
                </div>
              </section>

              {/* Project Details & Metadata */}
              <section className="po-card" aria-labelledby="meta-heading">
                <div className="po-card__header">
                  <h2 id="meta-heading" className="po-card__title">
                    <IconMeta /> Project Intelligence Metadata
                  </h2>
                </div>

                <dl className="po-meta-dl">
                  <div className="po-meta-row">
                    <dt>Client</dt>
                    <dd>{project.client}</dd>
                  </div>
                  <div className="po-meta-row">
                    <dt>Sector</dt>
                    <dd className="po-meta-sector">{project.sector.replace("-", " ")}</dd>
                  </div>
                  <div className="po-meta-row">
                    <dt>Discipline</dt>
                    <dd>{project.discipline}</dd>
                  </div>
                  <div className="po-meta-row">
                    <dt>Type Provenance</dt>
                    <dd>
                      <span className={`po-prov-badge po-prov-badge--${typeProvenance}`}>
                        {typeProvenance === "verified" && "Human Verified"}
                        {typeProvenance === "user_provided" && "User Provided"}
                        {typeProvenance === "ai_inferred" && "AI Inferred"}
                      </span>
                    </dd>
                  </div>
                  <div className="po-meta-row">
                    <dt>Created</dt>
                    <dd className="font-mono">{project.created_at}</dd>
                  </div>
                  <div className="po-meta-row">
                    <dt>Last Activity</dt>
                    <dd className="font-mono">{project.updated_at}</dd>
                  </div>
                </dl>

                {project.description && (
                  <div className="po-meta-desc">
                    <span className="po-meta-desc__label">Scope Description:</span>
                    <p>{project.description}</p>
                  </div>
                )}
              </section>

              {/* Project Team & Locked Permission Roles */}
              <section className="po-card" aria-labelledby="team-heading">
                <div className="po-card__header">
                  <div className="po-card__title-group">
                    <h2 id="team-heading" className="po-card__title">
                      <IconTeam /> Project Access &amp; Roles
                    </h2>
                    <span className="po-card__count font-mono">{project.members.length}</span>
                  </div>
                </div>

                <ul className="po-team-list" aria-label="Project team members">
                  {project.members.map((m, i) => (
                    <li key={i} className="po-team-item">
                      <div
                        className="po-team-item__avatar"
                        style={{ background: m.avatarColor || "var(--accent-secondary)" }}
                        aria-hidden="true"
                      >
                        {m.initials}
                      </div>
                      <div className="po-team-item__info">
                        <span className="po-team-item__name">{m.name}</span>
                        <span className="po-team-item__role">{m.role}</span>
                      </div>
                      <span className="po-team-item__badge">{m.role}</span>
                    </li>
                  ))}
                </ul>
              </section>

            </div>

          </div>

        </div>
      )}
    </ProjectShell>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ProcessingStatusBar({ takeoff }: { takeoff: TakeoffRunSummary }) {
  const pct = Math.round((takeoff.sheets_processed / (takeoff.sheets_total || 1)) * 100);
  return (
    <div className="po-processing-bar" role="status" aria-label={`Processing: ${pct}% complete`}>
      <div className="po-processing-bar__left">
        <span className="po-processing-bar__pulse" aria-hidden="true" />
        <span className="po-processing-bar__label">CAD AI Extraction in Progress</span>
        <span className="po-processing-bar__detail font-mono">
          Sheet {takeoff.sheets_processed} of {takeoff.sheets_total} · {takeoff.line_items_proposed.toLocaleString()} detections
        </span>
      </div>
      <div className="po-processing-bar__track" aria-hidden="true">
        <div className="po-processing-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="po-processing-bar__pct font-mono">{pct}%</span>
    </div>
  );
}

function DocumentRow({ doc, projectId }: { doc: Document; projectId: string }) {
  const isProcessing = ["ingesting", "classifying", "detecting"].includes(doc.upload_status);

  return (
    <li className="po-doc-row">
      <div className="po-doc-row__icon" aria-hidden="true">
        <DocFormatIcon format={doc.format} />
      </div>

      <div className="po-doc-row__main">
        <span className="po-doc-row__name font-mono">{doc.filename}</span>
        <div className="po-doc-row__meta">
          <span className="font-mono">{doc.size_mb} MB</span>
          {doc.sheet_count !== null && doc.sheet_count > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{doc.sheet_count} sheets</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{doc.uploaded_by}</span>
        </div>
      </div>

      <div className="po-doc-row__status">
        <span className={`po-status-badge po-status-badge--${doc.upload_status}`}>
          {isProcessing && <span className="po-spin-icon" aria-hidden="true"><IconSync /></span>}
          {doc.upload_status === "complete" && <IconCheckmark />}
          {doc.upload_status === "parsed" && <IconCheckmark />}
          {doc.upload_status === "queued" && <IconClock />}
          {doc.upload_status === "error" && <IconError />}
          {doc.upload_status}
        </span>
      </div>

      <div className="po-doc-row__actions">
        <Link
          to={`/project/${projectId}/workspace?doc=${doc.id}`}
          className="po-doc-row__link"
          title="Open drawing in Workspace"
        >
          Open →
        </Link>
      </div>
    </li>
  );
}

function SessionRow({ session, projectId }: { session: ChatSession; projectId: string }) {
  return (
    <li className="po-session-row">
      <Link
        to={`/sessions?project=${projectId}&session=${session.id}`}
        className="po-session-row__link"
        aria-label={`Open AI investigation: ${session.title}`}
      >
        <div className="po-session-row__main">
          <span className="po-session-row__title">{session.title}</span>
          <span className="po-session-row__preview">{session.last_message_preview}</span>
        </div>
        <div className="po-session-row__meta font-mono">
          <span>{session.updated_at}</span>
          <span className="po-session-row__count">{session.message_count} msgs</span>
        </div>
      </Link>
    </li>
  );
}

function ProjectOverviewSkeleton() {
  return (
    <div className="po-skeleton" aria-busy="true" aria-label="Loading project overview">
      <div className="po-skel-bar" style={{ height: 50, marginBottom: 24 }} />
      <div className="po-body-grid">
        <div className="po-main-col">
          <div className="po-skel-bar" style={{ height: 220, marginBottom: 20 }} />
          <div className="po-skel-bar" style={{ height: 240 }} />
        </div>
        <div className="po-side-col">
          <div className="po-skel-bar" style={{ height: 200, marginBottom: 20 }} />
          <div className="po-skel-bar" style={{ height: 180 }} />
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function DocFormatIcon({ format }: { format: string }) {
  const isDwg = format === "DWG" || format === "DXF";
  return (
    <span className={`po-format-pill po-format-pill--${format.toLowerCase()}`}>
      {isDwg ? "CAD" : format}
    </span>
  );
}

function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5v8M4 4.5L7 1.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 11v1A1.5 1.5 0 003 13.5h8A1.5 1.5 0 0012.5 12v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 5.5h11M5.5 5.5v7" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconSession() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M12.5 7A5.5 5.5 0 012.8 10.8L1.5 12.5l1.7-1.3A5.48 5.48 0 011.5 7 5.5 5.5 0 1112.5 7z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.5 2.5a2.5 2.5 0 00-2.5 2.5v.5a2.5 2.5 0 000 5v.5a2.5 2.5 0 002.5 2.5h1v-11h-1zM10.5 2.5a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 010 5v.5a2.5 2.5 0 01-2.5 2.5h-1v-11h1z" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconWorkflow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 7h4" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5"/>
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 1.5h5l4 4v7A1.5 1.5 0 0110.5 14H3A1.5 1.5 0 011.5 12.5v-9.5A1.5 1.5 0 013 1.5z" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1.5V5.5h4" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconTakeoff() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5h10M2 7h7M2 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="10.5" cy="9.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconMeta() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 4.5v.5M7 6.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 12c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="10" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M9 8.5c1.4.3 2.5 1.4 2.5 3" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconVerified() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginRight: 3 }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconAI() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginRight: 3 }}>
      <path d="M6 1l1.2 3.5H11L8.1 6.6l1.1 3.4L6 8.2 2.9 10l1.1-3.4L1 4.5h3.8L6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheckmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconError() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconSync() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M10 6A4 4 0 116 2c1.2 0 2.3.5 3 1.4L10.5 2v3H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 9.5v1h8v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5l5 2v4c0 3-2.5 4.5-5 5.5-2.5-1-5-2.5-5-5.5v-4l5-2z" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconErrorCloud() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M12 28a7 7 0 01-1.5-13.8 10 10 0 0119.5-2A7 7 0 0130 28H12z" stroke="var(--danger)" strokeWidth="2"/>
      <path d="M20 18v5M20 27v.5" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M12 7A5 5 0 117 2c1.5 0 2.8.6 3.8 1.6L12.5 2v4H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconOffline() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 1l12 12M5.5 5.5A6 6 0 001 7a9 9 0 0112 0M7 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function EmptyProjectIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="12" y="16" width="40" height="36" rx="4" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 4"/>
      <path d="M32 26v16M24 34h16" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconBolt(props: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

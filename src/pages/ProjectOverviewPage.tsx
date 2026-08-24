/**
 * ProjectOverviewPage — Per-project hub.
 *
 * SOURCE OF TRUTH (in order of authority):
 *   docs/06_PAGES/PROJECT_OVERVIEW.md
 *   docs/03_ARCHITECTURE/DATA_MODEL.md
 *   docs/01_PRODUCT/APP_FLOW.md
 *   docs/01_PRODUCT/CORE_WORKFLOWS.md
 *   docs/02_DESIGN/DESIGN_SYSTEM.md
 *
 * STATES (per PROJECT_OVERVIEW.md §State Model):
 *   loading       → Skeleton while project data loads.
 *   empty         → Newly created project, no documents yet → prompts Document Upload.
 *   data          → Populated overview with documents, takeoff, sessions.
 *   error         → ErrorState with retry.
 *   permission    → Viewer role: read-only, upload/edit actions hidden.
 *   offline       → Local-cached state; upload may queue.
 *
 * WORKFLOW (CORE_WORKFLOWS.md §1):
 *   Project → Upload Drawings → Processing → Drawing Workspace →
 *   AI Detection / Takeoff → Human Review → BOQ / Reports
 *
 * DATA MODEL (DATA_MODEL.md §2):
 *   Project: id, name, description, inferred_type, user_provided_type, verified_type
 *   Document: id, project_id, filename, format, upload_status, uploaded_at
 *   TakeoffRun: id, project_id, status, started_at, completed_at
 *   ChatSession: id, project_id, title, created_by, created_at
 *
 * DESIGN:
 *   - Urbanist for UI; IBM Plex Mono for technical values (sheet IDs, sizes, coordinates)
 *   - SOLID surfaces for engineering data — no glass on content
 *   - Liquid Glass ONLY for floating controls (per DESIGN_SYSTEM.md §5)
 *   - Racing Red / Vintage Rosewood as accent — NOT "danger" (per DESIGN_SYSTEM.md note)
 *   - 8px base grid (4/8/12/16/20/24/32/40px spacing scale)
 *   - cubic-bezier(0.22, 1, 0.36, 1) for transitions
 *   - scale(0.97) on :active (Emil rule)
 *   - No transition: all; only named props
 *
 * NAVIGATION:
 *   activePath="/projects" so Projects stays active in sidebar.
 *   Breadcrumb: Projects > Project Name shown in-page.
 */

import { useState, useEffect } from "react";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";

// ── Types matching DATA_MODEL.md §2 ──────────────────────────────────────────

type TypeProvenance = "ai_inferred" | "user_provided" | "verified";

interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  sector: string;
  discipline: string;
  inferred_type: string | null;
  user_provided_type: string | null;
  verified_type: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  members: Array<{ name: string; initials: string; role: string; avatarColor?: string }>;
}

interface Document {
  id: string;
  project_id: string;
  filename: string;
  format: "DWG" | "PDF" | "BIM" | "TIFF" | "Excel";
  upload_status: "complete" | "processing" | "queued" | "error" | "parsed";
  size_mb: number;
  sheet_count: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface TakeoffRunSummary {
  id: string;
  project_id: string;
  status: "pending" | "running" | "complete" | "error";
  sheets_processed: number;
  sheets_total: number;
  line_items_proposed: number;
  line_items_approved: number;
  started_at: string;
  completed_at: string | null;
  model_version: string;
}

interface ChatSession {
  id: string;
  project_id: string;
  title: string;
  last_message_preview: string;
  message_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type PageState = "loading" | "empty" | "data" | "error" | "permission" | "offline";

// ── URL state resolution ──────────────────────────────────────────────────────
function getPageState(): PageState {
  const p = new URLSearchParams(window.location.search);
  const s = p.get("state");
  if (s === "loading" || s === "empty" || s === "error" || s === "permission" || s === "offline") return s;
  return "data";
}

function getProjectId(): string {
  const p = new URLSearchParams(window.location.search);
  return p.get("project") || "p1";
}

// ── Demo data — structured to match real API shape ────────────────────────────

const DEMO_PROJECT: Project = {
  id: "p1",
  name: "ABC Data Center",
  client: "Equinix",
  description: "High-density server room electrical takeoff — cable tray, feeder layouts, and lighting across Server Rooms A, B, and C. Phase 2 expansion drawings.",
  sector: "Data Center",
  discipline: "Electrical HV",
  inferred_type: "Data Center · Electrical",
  user_provided_type: null,
  verified_type: null,
  created_at: "2026-08-10",
  updated_at: "2026-08-24",
  member_count: 3,
  members: [
    { name: "Hardik Bhaskar", initials: "HB", role: "Owner", avatarColor: "#2d4a6e" },
    { name: "Rina Mehta",     initials: "RM", role: "Editor", avatarColor: "#3d5a3e" },
    { name: "Zaid Siddiqui",  initials: "ZS", role: "Viewer", avatarColor: "#5a3d3d" },
  ],
};

const DEMO_DOCUMENTS: Document[] = [
  { id: "d1", project_id: "p1", filename: "E-101_LightingPlan.pdf",     format: "PDF",  upload_status: "complete",   size_mb: 2.4,  sheet_count: 32,  uploaded_by: "Hardik Bhaskar", uploaded_at: "3h ago" },
  { id: "d2", project_id: "p1", filename: "E-102_PowerDistribution.dwg", format: "DWG",  upload_status: "complete",   size_mb: 3.1,  sheet_count: 48,  uploaded_by: "Hardik Bhaskar", uploaded_at: "3h ago" },
  { id: "d3", project_id: "p1", filename: "E-103_SingleLine.pdf",        format: "PDF",  upload_status: "processing", size_mb: 1.8,  sheet_count: 24,  uploaded_by: "Rina Mehta",     uploaded_at: "1h ago" },
  { id: "d4", project_id: "p1", filename: "E-104_CableTrayLayout.dwg",   format: "DWG",  upload_status: "queued",     size_mb: 4.2,  sheet_count: 38,  uploaded_by: "Rina Mehta",     uploaded_at: "1h ago" },
  { id: "d5", project_id: "p1", filename: "Spec_Division_26.pdf",        format: "PDF",  upload_status: "parsed",     size_mb: 12.5, sheet_count: 0,   uploaded_by: "Zaid Siddiqui",  uploaded_at: "2d ago" },
];

const DEMO_TAKEOFF: TakeoffRunSummary = {
  id: "tr1",
  project_id: "p1",
  status: "running",
  sheets_processed: 112,
  sheets_total: 142,
  line_items_proposed: 1240,
  line_items_approved: 382,
  started_at: "01h 42m ago",
  completed_at: null,
  model_version: "v2.4-native",
};

const DEMO_SESSIONS: ChatSession[] = [
  {
    id: "s1", project_id: "p1",
    title: "Cable tray routing — Server Room B",
    last_message_preview: "Confirmed: 127.4 m of overhead ladder tray. Voltage drop is within spec.",
    message_count: 14,
    created_by: "Hardik Bhaskar",
    created_at: "2h ago",
    updated_at: "2h ago",
  },
  {
    id: "s2", project_id: "p1",
    title: "Feeder sizing — PAC-01 to PAC-06",
    last_message_preview: "Proposed 350 kcmil conductor. Awaiting confirmation from Equinix MEP review.",
    message_count: 8,
    created_by: "Rina Mehta",
    created_at: "12h ago",
    updated_at: "12h ago",
  },
  {
    id: "s3", project_id: "p1",
    title: "Lighting fixture schedule verification",
    last_message_preview: "43× LED Troffers detected. 4 items require manual classification.",
    message_count: 6,
    created_by: "Hardik Bhaskar",
    created_at: "1d ago",
    updated_at: "1d ago",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProjectOverviewPage() {
  const [pageState] = useState<PageState>(getPageState);
  const [projectId]  = useState<string>(getProjectId);
  const [activeTab, setActiveTab] = useState<"documents" | "takeoff" | "reports">("documents");

  // Determine type provenance for the project
  const typeProvenance: TypeProvenance = DEMO_PROJECT.verified_type
    ? "verified"
    : DEMO_PROJECT.user_provided_type
    ? "user_provided"
    : "ai_inferred";

  // Strip any parenthetical confidence suffix — confidence is internal, never user-facing
  // (UX_PRINCIPLES.md §2). Defensive: strips even if real API leaks it.
  const displayType = (
    DEMO_PROJECT.verified_type ||
    DEMO_PROJECT.user_provided_type ||
    DEMO_PROJECT.inferred_type ||
    "Unknown"
  ).replace(/\s*\([^)]*\)/g, "").trim();

  // Role simulation: "viewer" shows read-only
  const isViewer = pageState === "permission";
  const canUpload = !isViewer;
  const canEdit   = !isViewer;

  // Build ProjectMeta for ProjectShell
  const projectMeta: ProjectMeta = {
    id: projectId,
    name: DEMO_PROJECT.name,
    client: DEMO_PROJECT.client,
    sector: DEMO_PROJECT.sector,
    discipline: DEMO_PROJECT.discipline,
    displayType,
    typeProvenance,
  };

  // Pipeline status banner for ProjectShell
  const pipelineStatusBanner = DEMO_TAKEOFF.status === "running" ? (
    <ProcessingStatusBar takeoff={DEMO_TAKEOFF} />
  ) : undefined;

  // Header actions for ProjectShell
  const headerActionsEl = (
    <>
      {canUpload && (
        <a href={`/project/${projectId}/documents`} className="btn btn--secondary btn--sm">
          <IconUpload /> Upload
        </a>
      )}
      <a
        href={`/project/${projectId}/workspace`}
        className={`btn btn--primary btn--sm${!DEMO_DOCUMENTS.length ? " btn--disabled" : ""}`}
        aria-disabled={!DEMO_DOCUMENTS.length}
      >
        <IconWorkspace /> Open Workspace
      </a>
      <button type="button" className="btn btn--icon btn--sm" aria-label="More project options">
        <IconEllipsis />
      </button>
    </>
  );

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="overview"
      pipelineStatus={pipelineStatusBanner}
      headerActions={headerActionsEl}
    >

      {/* ── Loading ───────────────────────────────────────────────── */}
      {pageState === "loading" && <ProjectOverviewSkeleton />}

      {/* ── Error ────────────────────────────────────────────────── */}
      {pageState === "error" && (
          <div className="po-state-page">
          <div className="po-error-icon" aria-hidden="true"><IconErrorCloud /></div>
          <h2 className="po-state-heading">Failed to load project</h2>
          <p className="po-state-body">There was a problem fetching this project's data. Check your connection and try again.</p>
          <button type="button" className="btn btn--secondary po-retry-btn" onClick={() => window.location.reload()}>
            <IconRefresh /> Retry
          </button>
        </div>
      )}

      {/* ── Offline ──────────────────────────────────────────────── */}
      {pageState === "offline" && (
          <div className="po-offline-banner" role="alert">
            <IconOffline />
            <span><strong>No connection.</strong> Viewing cached project data. Uploads will queue when connectivity resumes.</span>
          </div>
      )}

      {/* ── Empty — newly created project ────────────────────────── */}
      {pageState === "empty" && (
        <div className="po-empty-state">
          <div className="po-empty-icon" aria-hidden="true">
            <EmptyProjectIllustration />
          </div>
          <h2 className="po-empty-heading">No documents yet</h2>
          <p className="po-empty-body">
            Upload drawings, requirements, specifications, or supporting documents to begin.
            Vectoris will organize the project context and queue AI analysis automatically.
          </p>
          <div className="po-empty-actions">
            <a href={`/project/${projectId}/documents`} className="btn btn--primary">
              <IconUpload /> Upload Drawings &amp; Documents
            </a>
            <a href="/sessions" className="btn btn--ghost">
              Start an AI Session instead
            </a>
          </div>
        </div>
      )}

      {/* ── Permission (Viewer role) ──────────────────────────────── */}
      {pageState === "permission" && (
        <div className="po-permission-notice" role="note">
          <IconShield />
          <span>You have <strong>Viewer</strong> access to this project. Upload and edit actions are disabled.</span>
        </div>
      )}

      {/* ── Data / Permission / Offline (show Overview content) ─── */}
      {(pageState === "data" || pageState === "permission" || pageState === "offline") && (
        <div className="po-body">
          {/* ── Left: recent document activity + takeoff progress ── */}
          <div className="po-main-col">
            {/* Recent documents (summary strip — not full Documents tab) */}
            <section className="po-overview-section" aria-labelledby="recent-docs-heading">
              <div className="po-overview-section__header">
                <h2 id="recent-docs-heading" className="po-overview-section__title">
                  <IconDoc /> Recent Documents
                </h2>
                <a href={`/project/${projectId}/documents`} className="po-overview-section__link">
                  View all →
                </a>
              </div>
              <ul className="po-doc-list" aria-label="Recent uploaded documents">
                {DEMO_DOCUMENTS.slice(0, 3).map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </ul>
              {DEMO_DOCUMENTS.length > 3 && (
                <a href={`/project/${projectId}/documents`} className="po-overview-section__more">
                  +{DEMO_DOCUMENTS.length - 3} more documents
                </a>
              )}
            </section>

            {/* Takeoff progress (summary — not full Takeoff tab) */}
            <section className="po-overview-section" aria-labelledby="takeoff-progress-heading">
              <div className="po-overview-section__header">
                <h2 id="takeoff-progress-heading" className="po-overview-section__title">
                  <IconTakeoff /> Takeoff Progress
                </h2>
                <a href={`/project/${projectId}/takeoff`} className="po-overview-section__link">
                  Review →
                </a>
              </div>
              <TakeoffPanel takeoff={DEMO_TAKEOFF} canView={true} />
            </section>
          </div>

              {/* ── Right column: Sessions + Metadata ─────────────── */}
              <div className="po-side-col">

                {/* AI Sessions */}
                <section className="po-side-card" aria-labelledby="sessions-heading">
                  <div className="po-side-card__header">
                    <h2 id="sessions-heading" className="po-side-card__title">
                      <IconSession /> AI Sessions
                    </h2>
                    <a href={`/sessions?project=${projectId}`} className="po-side-card__action">
                      New session
                    </a>
                  </div>

                  {DEMO_SESSIONS.length === 0 ? (
                    <p className="po-side-empty">No sessions yet. Start one to ask questions about this project.</p>
                  ) : (
                    <ul className="po-session-list" aria-label="AI sessions">
                      {DEMO_SESSIONS.map((session) => (
                        <SessionRow key={session.id} session={session} projectId={projectId} />
                      ))}
                    </ul>
                  )}

                  <a href={`/sessions?project=${projectId}`} className="po-side-card__footer-link">
                    View all sessions →
                  </a>
                </section>

                {/* Project Metadata */}
                <section className="po-side-card" aria-labelledby="meta-heading">
                  <div className="po-side-card__header">
                    <h2 id="meta-heading" className="po-side-card__title">
                      <IconMeta /> Project Details
                    </h2>
                    {canEdit && (
                      <button type="button" className="po-side-card__action" aria-label="Edit project settings">
                        Edit
                      </button>
                    )}
                  </div>

                  <dl className="po-meta-list">
                    <div className="po-meta-row">
                      <dt>Client</dt>
                      <dd>{DEMO_PROJECT.client}</dd>
                    </div>
                    <div className="po-meta-row">
                      <dt>Sector</dt>
                      <dd>{DEMO_PROJECT.sector}</dd>
                    </div>
                    <div className="po-meta-row">
                      <dt>Discipline</dt>
                      <dd>{DEMO_PROJECT.discipline}</dd>
                    </div>
                    <div className="po-meta-row">
                      <dt>Created</dt>
                      <dd className="font-mono">{DEMO_PROJECT.created_at}</dd>
                    </div>
                    <div className="po-meta-row">
                      <dt>Last updated</dt>
                      <dd className="font-mono">{DEMO_PROJECT.updated_at}</dd>
                    </div>
                  </dl>

                  {DEMO_PROJECT.description && (
                    <p className="po-meta-description">{DEMO_PROJECT.description}</p>
                  )}
                </section>

                {/* Project Team */}
                <section className="po-side-card" aria-labelledby="team-heading">
                  <div className="po-side-card__header">
                    <h2 id="team-heading" className="po-side-card__title">
                      <IconTeam /> Team
                    </h2>
                    {canEdit && (
                      <button type="button" className="po-side-card__action">
                        Manage
                      </button>
                    )}
                  </div>

                  <ul className="po-team-list" aria-label="Project team members">
                    {DEMO_PROJECT.members.map((m, i) => (
                      <li key={i} className="po-team-member">
                        <div className="po-team-member__avatar" style={{ background: m.avatarColor }} aria-hidden="true">
                          {m.initials}
                        </div>
                        <div className="po-team-member__info">
                          <span className="po-team-member__name">{m.name}</span>
                          <span className="po-team-member__role">{m.role}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
        )}
    </ProjectShell>
  );
}

// ── Project Header ────────────────────────────────────────────────────────────
function ProjectHeader({
  project,
  typeProvenance,
  displayType,
  canUpload,
  canEdit,
  isEmpty,
}: {
  project: Project;
  typeProvenance: TypeProvenance;
  displayType: string;
  canUpload: boolean;
  canEdit: boolean;
  isEmpty: boolean;
}) {
  return (
    <div className="po-project-header">
      <div className="po-project-header__left">
        {/* Sector icon */}
        <div className="po-project-header__icon" aria-hidden="true">
          <IconDataCenter />
        </div>

        <div className="po-project-header__identity">
          <h1 className="po-project-header__name">{project.name}</h1>
          <div className="po-project-header__meta">
            <span className="po-project-header__client font-mono">{project.client}</span>
            <span className="po-project-header__sep" aria-hidden="true">·</span>
            {/* Type provenance badge — DATA_MODEL.md §2 */}
            <span
              className={`po-type-badge po-type-badge--${typeProvenance}`}
              title={
                typeProvenance === "ai_inferred"
                  ? "Project type inferred by AI — can be confirmed or overridden via chat"
                  : typeProvenance === "user_provided"
                  ? "Project type confirmed by a user"
                  : "Project type verified and locked"
              }
            >
              {typeProvenance === "ai_inferred" && <IconAI />}
              {typeProvenance === "user_provided" && <IconUser />}
              {typeProvenance === "verified"     && <IconVerified />}
              <span>{displayType}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="po-project-header__actions">
        {canUpload && (
          <a href="/upload" className="btn btn--secondary">
            <IconUpload /> Upload
          </a>
        )}
        <a
          href={isEmpty ? "#" : "/workspace"}
          className={`btn btn--primary${isEmpty ? " btn--disabled" : ""}`}
          aria-disabled={isEmpty}
          title={isEmpty ? "Upload drawings first to open the workspace" : undefined}
        >
          <IconWorkspace /> Open Workspace
        </a>
        {canEdit && (
          <button type="button" className="btn btn--icon" aria-label="Project actions">
            <IconMore />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Processing Status Bar ─────────────────────────────────────────────────────
// Shows inline when a takeoff run is active — communicates pipeline progress.
function ProcessingStatusBar({ takeoff }: { takeoff: TakeoffRunSummary }) {
  const pct = Math.round((takeoff.sheets_processed / takeoff.sheets_total) * 100);
  return (
    <div className="po-processing-bar" role="status" aria-label={`Processing: ${pct}% complete`}>
      <div className="po-processing-bar__left">
        <span className="po-processing-bar__pulse" aria-hidden="true" />
        <span className="po-processing-bar__label">AI Detection running</span>
        <span className="po-processing-bar__detail font-mono">
          Sheet {takeoff.sheets_processed} of {takeoff.sheets_total} ·{" "}
          {takeoff.line_items_proposed.toLocaleString()} items detected
        </span>
      </div>
      <div className="po-processing-bar__track" aria-hidden="true">
        <div className="po-processing-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="po-processing-bar__pct font-mono">{pct}%</span>
      <a href="/processing" className="po-processing-bar__link">
        View pipeline →
      </a>
    </div>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────
function DocumentRow({ doc }: { doc: Document }) {
  const statusLabel: Record<Document["upload_status"], string> = {
    complete:   "Complete",
    processing: "Processing",
    queued:     "Queued",
    error:      "Error",
    parsed:     "Parsed",
  };

  return (
    <li className={`po-doc-row po-doc-row--${doc.upload_status}`}>
      <div className="po-doc-row__icon" aria-hidden="true">
        <DocFormatIcon format={doc.format} />
      </div>

      <div className="po-doc-row__main">
        <span className="po-doc-row__name font-mono">{doc.filename}</span>
        <span className="po-doc-row__meta">
          <span className="font-mono">{doc.size_mb} MB</span>
          {doc.sheet_count > 0 && (
            <><span aria-hidden="true">·</span><span className="font-mono">{doc.sheet_count} sheets</span></>
          )}
          <span aria-hidden="true">·</span>
          <span>{doc.uploaded_by}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{doc.uploaded_at}</span>
        </span>
      </div>

      <div className="po-doc-row__status-wrap">
        <span className={`po-doc-status po-doc-status--${doc.upload_status}`}>
          {doc.upload_status === "processing" && <span className="po-spin-icon" aria-hidden="true"><IconSync /></span>}
          {doc.upload_status === "complete"   && <IconCheckmark />}
          {doc.upload_status === "parsed"     && <IconCheckmark />}
          {doc.upload_status === "queued"     && <IconClock />}
          {doc.upload_status === "error"      && <IconError />}
          {statusLabel[doc.upload_status]}
        </span>
        {doc.upload_status === "processing" && (
          <div className="po-doc-progress" aria-hidden="true">
            <div className="po-doc-progress__fill" />
          </div>
        )}
      </div>

      {(doc.upload_status === "complete" || doc.upload_status === "parsed") && (
        <a href={`/workspace?doc=${doc.id}`} className="po-doc-row__open" aria-label={`Open ${doc.filename} in workspace`}>
          Open →
        </a>
      )}
    </li>
  );
}

// ── Takeoff Panel ─────────────────────────────────────────────────────────────
function TakeoffPanel({ takeoff, canView }: { takeoff: TakeoffRunSummary; canView: boolean }) {
  const pct = Math.round((takeoff.sheets_processed / takeoff.sheets_total) * 100);
  const reviewPct = Math.round((takeoff.line_items_approved / takeoff.line_items_proposed) * 100);

  return (
    <div className="po-takeoff">
      <div className="po-panel__header">
        <span className="po-panel__label">
          Run <span className="font-mono">{takeoff.id}</span> · Model <span className="font-mono">{takeoff.model_version}</span>
        </span>
        {canView && takeoff.status === "complete" && (
          <a href="/workspace" className="btn btn--sm btn--primary">
            Review Takeoff →
          </a>
        )}
      </div>

      {/* Processing progress */}
      <div className="po-takeoff__grid">
        <div className="po-takeoff__stat">
          <span className="po-takeoff__stat-label">Sheets processed</span>
          <span className="po-takeoff__stat-value font-mono">{takeoff.sheets_processed} / {takeoff.sheets_total}</span>
          <div className="po-takeoff__bar">
            <div className={`po-takeoff__bar-fill po-takeoff__bar-fill--${takeoff.status}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="po-takeoff__stat">
          <span className="po-takeoff__stat-label">Items detected</span>
          <span className="po-takeoff__stat-value font-mono">{takeoff.line_items_proposed.toLocaleString()}</span>
        </div>
        <div className="po-takeoff__stat">
          <span className="po-takeoff__stat-label">Items approved</span>
          <span className="po-takeoff__stat-value font-mono">{takeoff.line_items_approved.toLocaleString()}</span>
          <div className="po-takeoff__bar">
            <div className="po-takeoff__bar-fill po-takeoff__bar-fill--approved" style={{ width: `${reviewPct}%` }} />
          </div>
        </div>
        <div className="po-takeoff__stat">
          <span className="po-takeoff__stat-label">Started</span>
          <span className="po-takeoff__stat-value font-mono">{takeoff.started_at}</span>
        </div>
      </div>

      {/* Status note */}
      {takeoff.status === "running" && (
        <div className="po-takeoff__note po-takeoff__note--running">
          <IconSync /> Detection in progress — results update in real time when you open the workspace.
        </div>
      )}
      {takeoff.status === "complete" && (
        <div className="po-takeoff__note po-takeoff__note--complete">
          <IconCheckmark /> Detection complete. Review and approve line items in the Drawing Workspace.
        </div>
      )}
    </div>
  );
}

// ── Reports Panel ─────────────────────────────────────────────────────────────
function ReportsPanel({ canExport, takeoff }: { canExport: boolean; takeoff: TakeoffRunSummary }) {
  const isReady = takeoff.status === "complete" && takeoff.line_items_approved > 0;

  return (
    <div className="po-reports">
      <div className="po-panel__header">
        <span className="po-panel__label">Exports &amp; reports</span>
      </div>

      {!isReady ? (
        <div className="po-reports__unavailable">
          <IconReport />
          <span>BOQ export is available after takeoff review is complete and at least one line item is approved.</span>
        </div>
      ) : (
        <div className="po-reports__formats">
          {(["XLSX", "CSV", "JSON", "PDF"] as const).map((fmt) => (
            <div key={fmt} className="po-report-format">
              <div className="po-report-format__info">
                <span className="po-report-format__name font-mono">{fmt}</span>
                <span className="po-report-format__desc">
                  {fmt === "XLSX" ? "Excel workbook — BOQ summary + line items"
                   : fmt === "CSV"  ? "Comma-separated — raw line items"
                   : fmt === "JSON" ? "Structured data — API integration"
                   : "PDF report — client-ready summary"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                disabled={!canExport}
                aria-label={`Export as ${fmt}`}
              >
                <IconDownload /> Export
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session Row ───────────────────────────────────────────────────────────────
function SessionRow({ session, projectId }: { session: ChatSession; projectId: string }) {
  return (
    <li className="po-session-row">
      <a
        href={`/sessions?project=${projectId}&session=${session.id}`}
        className="po-session-row__link"
        aria-label={`Open AI session: ${session.title}`}
      >
        <div className="po-session-row__main">
          <span className="po-session-row__title">{session.title}</span>
          <span className="po-session-row__preview">{session.last_message_preview}</span>
        </div>
        <div className="po-session-row__meta">
          <span className="font-mono">{session.updated_at}</span>
          <span className="po-session-row__count font-mono">{session.message_count} msgs</span>
        </div>
      </a>
    </li>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProjectOverviewSkeleton() {
  return (
    <div className="po-skeleton" aria-busy="true" aria-label="Loading project">
      {/* Header skeleton */}
      <div className="po-skel-header">
        <div className="po-skel-icon" />
        <div className="po-skel-titles">
          <div className="po-skel-line po-skel-line--xl" />
          <div className="po-skel-line po-skel-line--md" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="po-skel-body">
        <div className="po-skel-main">
          {[1,2,3,4].map(i => (
            <div key={i} className="po-skel-doc-row">
              <div className="po-skel-circle po-skel-circle--sm" />
              <div className="po-skel-lines">
                <div className="po-skel-line po-skel-line--lg" />
                <div className="po-skel-line po-skel-line--sm" />
              </div>
              <div className="po-skel-line po-skel-line--xs" />
            </div>
          ))}
        </div>
        <div className="po-skel-side">
          {[1,2].map(i => (
            <div key={i} className="po-skel-card">
              <div className="po-skel-line po-skel-line--md" />
              {[1,2,3].map(j => (
                <div key={j} className="po-skel-line po-skel-line--full" style={{marginTop:"10px"}} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
function IconDataCenter() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="12" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="6" cy="5.5" r="0.85" fill="currentColor"/>
      <circle cx="8.2" cy="5.5" r="0.85" fill="currentColor"/>
      <circle cx="6" cy="14.5" r="0.85" fill="currentColor"/>
      <circle cx="8.2" cy="14.5" r="0.85" fill="currentColor"/>
    </svg>
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
      <path d="M4 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="8" r="1.2" fill="currentColor"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 1.5h5.5L11.5 5V12A1.5 1.5 0 0110 13.5H4A1.5 1.5 0 012.5 12V3A1.5 1.5 0 014 1.5H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8.5 1.5V5H11.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTakeoff() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 10.5L5 7l2.5 2L10 6l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 12.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconReport() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconSession() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5a5.5 5.5 0 100 11A5.5 5.5 0 007 1.5z" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 9c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7" cy="4.5" r="0.85" fill="currentColor"/>
    </svg>
  );
}
function IconMeta() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconTeam() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 12a4 4 0 018 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="10.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M12.5 12a3 3 0 00-4-2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 1L6.7 4.3H10.3L7.3 6.3 8.5 9.5 5.5 7.5 2.5 9.5 3.7 6.3 0.7 4.3H4.3L5.5 1Z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M1 10a4.5 4.5 0 019 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}
function IconVerified() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M5.5 1L7 2.5 9 2l.5 2L11 5.5 9.5 7 10 9l-2-.5L5.5 10 4 8.5 2 9 1.5 7 0 5.5 1.5 4 1 2l2 .5L5.5 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M3.5 5.5l1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function DocFormatIcon({ format }: { format: Document["format"] }) {
  const colors: Record<Document["format"], string> = {
    DWG: "#3b82f6", PDF: "#ef4444", BIM: "#8b5cf6", TIFF: "#10b981", Excel: "#22c55e",
  };
  return (
    <svg width="28" height="32" viewBox="0 0 28 32" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="28" height="32" rx="3" fill={colors[format]} fillOpacity="0.12" stroke={colors[format]} strokeWidth="1" strokeOpacity="0.3"/>
      <text x="14" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill={colors[format]}>{format}</text>
    </svg>
  );
}
function IconSync() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="po-spin" aria-hidden="true">
      <path d="M1 6a5 5 0 018.5-3.6L10.5 4M10.5 1.5V4H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 6a5 5 0 01-8.5 3.6L1.5 8M1.5 10.5V8H4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCheckmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3.5 6l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconError() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5v3M6 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 1.5v7M4 6.5l2.5 2 2.5-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 10.5v1A1 1 0 002.5 12.5h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 7a5.5 5.5 0 019.5-3.8L12.5 5M12.5 1.5V5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconOffline() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13a1 1 0 100 2 1 1 0 000-2z" fill="currentColor"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5l5.5 2.5v4C13.5 11 11 13.5 8 14.5 5 13.5 2.5 11 2.5 8v-4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconErrorCloud() {
  return (
    <svg width="64" height="52" viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <path d="M16 40a12 12 0 01-2-23.8A16 16 0 0148 18h2a12 12 0 010 24H16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M32 26v7M32 36v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function EmptyProjectIllustration() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" aria-hidden="true">
      {[20,40,60,80].map(x => [15,35,55,75].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" opacity="0.1"/>
      )))}
      <rect x="22" y="18" width="56" height="44" rx="3" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.3"/>
      <path d="M50 28v24M38 40h24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.35"/>
      <circle cx="50" cy="40" r="12" stroke="currentColor" strokeWidth="1.4" opacity="0.55"/>
      <path d="M45 40h10M50 35v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65"/>
    </svg>
  );
}
function IconEllipsis() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
    </svg>
  );
}


/**
 * ProjectShell — Shared project-level layout wrapper.
 *
 * SOURCE OF TRUTH:
 *   docs/06_PAGES/PROJECT_NAVIGATION.md
 *   docs/02_DESIGN/NAVIGATION.md §2
 *
 * STRUCTURE:
 *   AppShell (global sidebar + header)
 *     └── ProjectShell
 *           ├── Project Header  (name, client, type badge, primary actions)
 *           ├── Project Tab Bar (Overview · Documents · Workspace · Takeoff · [Estimate] · [Bid] · Reports)
 *           └── {children}      (page content for the active tab)
 *
 * TAB ROUTING (canonical):
 *   Overview    /project/:id
 *   Documents   /project/:id/documents
 *   Workspace   /project/:id/workspace
 *   Takeoff     /project/:id/takeoff
 *   Estimate    /project/:id/estimate   [FUTURE — disabled]
 *   Bid         /project/:id/bid        [FUTURE — disabled]
 *   Reports     /project/:id/reports
 *
 * RULES:
 *   - FUTURE tabs (Estimate, Bid) are visible but disabled.
 *   - FUTURE tabs show a tooltip: "Coming soon"
 *   - Do NOT hide future tabs — they communicate product direction.
 *   - The header remains visible across all tabs.
 *   - Projects stays active in the global sidebar for all /project/* routes.
 */

import type { ReactNode } from "react";
import { Link, useRouter } from "../router";
import { AppShell } from "./AppShell";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectMeta {
  id: string;
  name: string;
  client: string;
  sector?: string;
  discipline?: string;
  /** Display-ready type string — already stripped of confidence suffixes */
  displayType?: string;
  /** "ai_inferred" | "user_provided" | "verified" */
  typeProvenance?: "ai_inferred" | "user_provided" | "verified";
}

interface Tab {
  id: string;
  label: string;
  /** Relative path segment after /project/:id */
  segment: string;
  future?: boolean;
}

interface ProjectShellProps {
  children: ReactNode;
  project: ProjectMeta;
  /** Current active tab id — determined by the route */
  activeTab: string;
  /** Optional pipeline status banner */
  pipelineStatus?: ReactNode;
  /** Primary actions for the header */
  headerActions?: ReactNode;
}

// ── Tab definitions (canonical, per PROJECT_NAVIGATION.md & PROJECT_INTELLIGENCE.md) ──
const TABS: Tab[] = [
  { id: "overview",    label: "Overview",             segment: "" },
  { id: "documents",   label: "Documents",            segment: "documents" },
  { id: "workspace",   label: "Workspace",            segment: "workspace" },
  { id: "takeoff",     label: "Takeoff",              segment: "takeoff" },
  { id: "boq",         label: "BOQ",                  segment: "boq",         future: true },
  { id: "engineering", label: "Engineering",          segment: "engineering", future: true },
  { id: "estimate",    label: "Estimate",             segment: "estimate",    future: true },
  { id: "bid",         label: "Bid",                  segment: "bid",         future: true },
  { id: "activity",    label: "Activity / Decisions", segment: "activity",    future: true },
  { id: "reports",     label: "Reports",              segment: "reports" },
];

// ── Helper — build a tab href ──────────────────────────────────────────────────
function tabHref(projectId: string, segment: string): string {
  return segment ? `/project/${projectId}/${segment}` : `/project/${projectId}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ProjectShell({
  children,
  project,
  activeTab,
  pipelineStatus,
  headerActions,
}: ProjectShellProps) {
  const { currentPath } = useRouter();

  return (
    <AppShell activePath="/project">
      <div className="project-shell">

        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <nav className="project-shell__breadcrumb" aria-label="Breadcrumb">
          <Link to="/projects" className="project-shell__bc-link">Projects</Link>
          <IconChevronRight aria-hidden="true" />
          <span className="project-shell__bc-current" aria-current="page">
            {project.name}
          </span>
        </nav>

        {/* ── Project Header ───────────────────────────────────── */}
        <div className="project-shell__header">
          <div className="project-shell__header-identity">
            {/* Project icon / avatar */}
            <div className="project-shell__icon" aria-hidden="true">
              <IconProject />
            </div>

            {/* Name + meta */}
            <div className="project-shell__identity-text">
              <h1 className="project-shell__name">{project.name}</h1>
              <div className="project-shell__meta">
                <span className="project-shell__client">{project.client}</span>
                {project.displayType && (
                  <>
                    <span className="project-shell__meta-sep" aria-hidden="true">·</span>
                    <span
                      className={`project-shell__type-badge project-shell__type-badge--${project.typeProvenance ?? "ai_inferred"}`}
                      title={
                        project.typeProvenance === "verified"
                          ? "Type confirmed"
                          : project.typeProvenance === "user_provided"
                          ? "Type provided by user"
                          : "Type inferred by AI — not yet confirmed"
                      }
                    >
                      <IconTypeProv provenance={project.typeProvenance} />
                      {project.displayType}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header actions */}
          {headerActions && (
            <div className="project-shell__header-actions">
              {headerActions}
            </div>
          )}
        </div>

        {/* ── Pipeline status banner (optional) ────────────────── */}
        {pipelineStatus && (
          <div className="project-shell__pipeline">
            {pipelineStatus}
          </div>
        )}

        {/* ── Tab bar ──────────────────────────────────────────── */}
        <nav className="project-shell__tabs" aria-label="Project navigation">
          {TABS.map((tab) => {
            const href = tabHref(project.id, tab.segment);
            const isActive = tab.id === activeTab;

            if (tab.future) {
              return (
                <Link
                  key={tab.id}
                  to={href}
                  className={`project-shell__tab project-shell__tab--future${isActive ? " project-shell__tab--active" : ""}`}
                  title={`${tab.label} — Planned Roadmap Horizon (Click to view specification status)`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                  <span className="project-shell__tab-soon">Soon</span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.id}
                to={href}
                className={`project-shell__tab${isActive ? " project-shell__tab--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Page content ─────────────────────────────────────── */}
        <div className="project-shell__content">
          <div key={activeTab} className="project-tab-view">
            {children}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconProject() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7A1.5 1.5 0 014.5 5.5h3L9 7.5h7A1.5 1.5 0 0117.5 9v7A1.5 1.5 0 0116 17.5H4A1.5 1.5 0 012.5 16V8.5A1.5 1.5 0 014 7z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconTypeProv({ provenance }: { provenance?: string }) {
  if (provenance === "verified") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="Verified" style={{ marginRight: 3 }}>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (provenance === "user_provided") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="User provided" style={{ marginRight: 3 }}>
        <circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    );
  }
  // ai_inferred — star icon
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-label="AI inferred" style={{ marginRight: 3 }}>
      <path d="M6 1l1.2 3.5H11L8.1 6.6l1.1 3.4L6 8.2 2.9 10l1.1-3.4L1 4.5h3.8L6 1z"
        stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  );
}

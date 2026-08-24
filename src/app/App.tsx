/**
 * App.tsx — Client-side router.
 *
 * Route table (canonical — docs/01_PRODUCT/APP_FLOW.md + docs/02_DESIGN/NAVIGATION.md):
 *
 *   /                         → LandingPage
 *   /auth                     → AuthPage
 *   /dashboard                → DashboardPage
 *   /projects                 → ProjectsPage
 *   /sessions                 → SessionsPage (global AI Sessions)
 *   /sessions/:id             → SessionsPage (active session)
 *   /settings                 → SettingsPage (stub)
 *
 *   /project/:id              → ProjectOverviewPage (Overview tab)
 *   /project/:id/documents    → ProjectDocumentsPage (Documents tab)
 *   /project/:id/workspace    → ProjectWorkspacePage (Workspace tab — stub)
 *   /project/:id/takeoff      → ProjectTakeoffPage (Takeoff tab)
 *   /project/:id/reports      → ProjectReportsPage (Reports tab)
 *   /project/:id/estimate     → ProjectEstimatePage (future — disabled)
 *   /project/:id/bid          → ProjectBidPage (future — disabled)
 */

import { useEffect } from "react";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage } from "../pages/AuthPage";
import { DashboardPage } from "../pages/DashboardPage";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectOverviewPage from "../pages/ProjectOverviewPage";
import ProjectDocumentsPage from "../pages/ProjectDocumentsPage";
import ProjectTakeoffPage from "../pages/ProjectTakeoffPage";
import ProjectReportsPage from "../pages/ProjectReportsPage";
import SessionsPage from "../pages/SessionsPage";
import ProjectWorkspacePage from "../pages/ProjectWorkspacePage";

export function App() {
  const path = window.location.pathname;

  // Sync ?theme param to document for global CSS overrides
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get("theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────
  if (path.startsWith("/auth"))       return <AuthPage />;

  // ── Top-level nav ───────────────────────────────────────────────────────────
  if (path === "/dashboard")          return <DashboardPage />;
  if (path.startsWith("/dashboard"))  return <DashboardPage />;
  if (path === "/projects")           return <ProjectsPage />;
  if (path.startsWith("/projects"))   return <ProjectsPage />;
  if (path.startsWith("/sessions"))   return <SessionsPage />;
  if (path.startsWith("/settings"))   return <div>Settings — coming soon</div>;

  // ── Project sub-routes (order: most specific first) ─────────────────────────
  if (path.match(/^\/project\/[^/]+\/documents/))  return <ProjectDocumentsPage />;
  if (path.match(/^\/project\/[^/]+\/workspace/))  return <ProjectWorkspacePage />;
  if (path.match(/^\/project\/[^/]+\/takeoff/))    return <ProjectTakeoffPage />;
  if (path.match(/^\/project\/[^/]+\/reports/))    return <ProjectReportsPage />;
  if (path.match(/^\/project\/[^/]+\/estimate/))   return <ProjectFutureStub tab="estimate" label="Estimate" />;
  if (path.match(/^\/project\/[^/]+\/bid/))        return <ProjectFutureStub tab="bid" label="Bid" />;

  // ── Project overview (catch-all for /project/* without sub-route) ────────────
  if (path.startsWith("/project"))    return <ProjectOverviewPage />;

  // ── Default ─────────────────────────────────────────────────────────────────
  return <LandingPage />;
}

// ── Temporary stubs for future/unbuilt project tabs ────────────────────────────
import { ProjectShell } from "../components/ProjectShell";

// ProjectWorkspaceStub removed — replaced by ProjectWorkspacePage

function ProjectFutureStub({ tab, label }: { tab: string; label: string }) {
  const id = getProjectId();
  return (
    <ProjectShell
      project={{ id, name: "ABC Data Center", client: "ABC Corp" }}
      activeTab={tab}
    >
      <div style={{ padding: "80px 32px", textAlign: "center", color: "var(--text-secondary)" }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{label} — Coming Soon</p>
        <p style={{ fontSize: 13 }}>
          This capability is not yet available in this version of Vectoris.
        </p>
      </div>
    </ProjectShell>
  );
}

/** Extract project ID from URL path /project/:id/... or /project?project=:id */
function getProjectId(): string {
  const path = window.location.pathname;
  const match = path.match(/^\/project\/([^/]+)/);
  if (match) return match[1];
  const params = new URLSearchParams(window.location.search);
  return params.get("project") ?? "demo";
}

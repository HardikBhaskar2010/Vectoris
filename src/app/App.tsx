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
import { DesktopTitleBar } from "../components/DesktopTitleBar";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage } from "../pages/AuthPage";
import { DashboardPage } from "../pages/DashboardPage";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectOverviewPage from "../pages/ProjectOverviewPage";
import ProjectDocumentsPage from "../pages/ProjectDocumentsPage";
import ProjectTakeoffPage from "../pages/ProjectTakeoffPage";
import ProjectReportsPage from "../pages/ProjectReportsPage";
import SessionsPage from "../pages/SessionsPage";
import SettingsPage from "../pages/SettingsPage";
import ProjectWorkspacePage from "../pages/ProjectWorkspacePage";

export function App() {
  const path = window.location.pathname;

  // Sync theme to document for global CSS overrides
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let theme = params.get("theme");

    if (!theme) {
      try {
        theme = window.localStorage.getItem("vectoris.themePreference");
      } catch {
        // Ignore storage errors
      }
    }

    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // Global desktop keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K -> Focus global search input if present
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const searchInput = document.querySelector<HTMLInputElement>(".app-search__input");
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isUnauthenticated = path === "/" || path.startsWith("/auth");

  const getPageTitle = () => {
    if (path === "/") return "Welcome";
    if (path.startsWith("/auth")) return "Workstation Login";
    if (path.startsWith("/dashboard")) return "Command Dashboard";
    if (path.startsWith("/projects")) return "Project Index";
    if (path.startsWith("/sessions")) return "AI Copilot Sessions";
    if (path.startsWith("/settings")) return "Engine Settings";
    if (path.startsWith("/project")) {
      const match = path.match(/^\/project\/([^/]+)/);
      return match ? `Project: ${match[1]}` : "Project Workspace";
    }
    return "Engineering Workstation";
  };

  const renderContent = () => {
    // ── Auth ────────────────────────────────────────────────────────────────────
    if (path.startsWith("/auth"))       return <AuthPage />;

    // ── Top-level nav ───────────────────────────────────────────────────────────
    if (path === "/dashboard")          return <DashboardPage />;
    if (path.startsWith("/dashboard"))  return <DashboardPage />;
    if (path === "/projects")           return <ProjectsPage />;
    if (path.startsWith("/projects"))   return <ProjectsPage />;
    if (path.startsWith("/sessions"))   return <SessionsPage />;
    if (path.startsWith("/settings"))   return <SettingsPage />;

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
  };

  return (
    <div className="desktop-app-frame">
      <DesktopTitleBar
        title={getPageTitle()}
        isAuthenticated={!isUnauthenticated}
      />
      <div className="desktop-app-body">
        {renderContent()}
      </div>
    </div>
  );
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

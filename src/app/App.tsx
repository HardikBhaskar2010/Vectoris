/**
 * App.tsx — Client-side SPA route dispatcher.
 *
 * Route table (canonical — docs/01_PRODUCT/APP_FLOW.md + docs/02_DESIGN/NAVIGATION.md):
 *
 *   /                         → AuthPage (Direct Entry Surface)
 *   /auth                     → AuthPage
 *   /dashboard                → DashboardPage
 *   /projects                 → ProjectsPage
 *   /sessions                 → SessionsPage (global AI Sessions)
 *   /sessions/:id             → SessionsPage (active session)
 *   /settings                 → SettingsPage (workstation configuration)
 *
 *   /project/:id              → ProjectOverviewPage (Overview tab)
 *   /project/:id/documents    → ProjectDocumentsPage (Documents tab)
 *   /project/:id/workspace    → ProjectWorkspacePage (Workspace tab)
 *   /project/:id/takeoff      → ProjectTakeoffPage (Takeoff tab)
 *   /project/:id/reports      → ProjectReportsPage (Reports tab)
 *   /project/:id/estimate     → ProjectFutureStub (disabled)
 *   /project/:id/bid          → ProjectFutureStub (disabled)
 */

import { useEffect } from "react";
import { RouterProvider, useRouter } from "../router";
import { DesktopTitleBar } from "../components/DesktopTitleBar";
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
import { ProjectShell } from "../components/ProjectShell";

function AppContent() {
  const { currentPath, searchParams, navigate } = useRouter();

  // Sync theme to document for global CSS overrides
  useEffect(() => {
    let theme = searchParams.get("theme");

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
  }, [searchParams]);

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

  const isUnauthenticated = currentPath === "/" || currentPath.startsWith("/auth");

  const getPageTitle = () => {
    if (currentPath === "/" || currentPath.startsWith("/auth")) return "Workstation Login";
    if (currentPath.startsWith("/dashboard")) return "Command Dashboard";
    if (currentPath.startsWith("/projects")) return "Project Index";
    if (currentPath.startsWith("/sessions")) return "AI Copilot Sessions";
    if (currentPath.startsWith("/settings")) return "Engine Settings";
    if (currentPath.startsWith("/project")) {
      const match = currentPath.match(/^\/project\/([^/]+)/);
      return match ? `Project: ${match[1]}` : "Project Workspace";
    }
    return "Engineering Workstation";
  };

  const renderContent = () => {
    // ── Root Entry Surface & Auth ──────────────────────────────────────────────
    if (currentPath === "/" || currentPath.startsWith("/auth")) return <AuthPage />;

    // ── Top-level nav ───────────────────────────────────────────────────────────
    if (currentPath === "/dashboard" || currentPath.startsWith("/dashboard")) return <DashboardPage />;
    if (currentPath === "/projects" || currentPath.startsWith("/projects")) return <ProjectsPage />;
    if (currentPath.startsWith("/sessions")) return <SessionsPage />;
    if (currentPath.startsWith("/settings")) return <SettingsPage />;

    // ── Legacy/redirect alias routes ────────────────────────────────────────────
    if (currentPath === "/workspace" || currentPath.startsWith("/workspace")) {
      const doc = searchParams.get("doc");
      const tab = searchParams.get("tab");
      if (tab === "takeoff") return <ProjectTakeoffPage />;
      return <ProjectWorkspacePage />;
    }

    // ── Project sub-routes (order: most specific first) ─────────────────────────
    if (currentPath.match(/^\/project\/[^/]+\/documents/))  return <ProjectDocumentsPage />;
    if (currentPath.match(/^\/project\/[^/]+\/workspace/))  return <ProjectWorkspacePage />;
    if (currentPath.match(/^\/project\/[^/]+\/takeoff/))    return <ProjectTakeoffPage />;
    if (currentPath.match(/^\/project\/[^/]+\/reports/))    return <ProjectReportsPage />;
    if (currentPath.match(/^\/project\/[^/]+\/estimate/))   return <ProjectFutureStub tab="estimate" label="Estimate" />;
    if (currentPath.match(/^\/project\/[^/]+\/bid/))        return <ProjectFutureStub tab="bid" label="Bid" />;

    // ── Project overview (catch-all for /project/* without sub-route) ────────────
    if (currentPath.startsWith("/project"))    return <ProjectOverviewPage />;

    // ── Default fallback ────────────────────────────────────────────────────────
    return <DashboardPage />;
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

export function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

// ── Temporary stubs for future/unbuilt project tabs ────────────────────────────
function ProjectFutureStub({ tab, label }: { tab: string; label: string }) {
  const { currentPath, searchParams } = useRouter();
  const match = currentPath.match(/^\/project\/([^/]+)/);
  const id = match ? match[1] : searchParams.get("project") ?? "p1";

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

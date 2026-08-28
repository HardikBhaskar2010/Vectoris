/**
 * App.tsx — Client-side SPA route dispatcher.
 *
 * Route table (canonical — docs/01_PRODUCT/APP_FLOW.md + docs/02_DESIGN/NAVIGATION.md):
 *
 *   /                         → AuthPage (Direct Entry Surface)
 *   /auth                     → AuthPage
 *   /dashboard                → DashboardPage
 *   /projects                 → ProjectsPage
 *   /sessions                 → SessionsPage (global Investigation Workshop)
 *   /sessions/:id             → SessionsPage (active investigation)
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

import { useEffect, useState } from "react";
import { RouterProvider, useRouter } from "../router";
import { DesktopTitleBar } from "../components/DesktopTitleBar";
import { BrandMark } from "../components/BrandMark";
import { AuthPage } from "../pages/AuthPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { DashboardPage } from "../pages/DashboardPage";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectOverviewPage from "../pages/ProjectOverviewPage";
import ProjectPlanPage from "../pages/ProjectPlanPage";
import ProjectDocumentsPage from "../pages/ProjectDocumentsPage";
import ProjectTakeoffPage from "../pages/ProjectTakeoffPage";
import ProjectReportsPage from "../pages/ProjectReportsPage";
import SessionsPage from "../pages/SessionsPage";
import SettingsPage from "../pages/SettingsPage";
import ProjectWorkspacePage from "../pages/ProjectWorkspacePage";
import { ProjectShell } from "../components/ProjectShell";
import { ContextMenuProvider } from "../components/ContextMenu";
import { authService } from "../services/authService";
import { organizationService } from "../services/organizationService";
import { isSupabaseConfigured } from "../services/supabaseClient";

function AppContent() {
  const { currentPath, searchParams, navigate } = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(() => isSupabaseConfigured());

  // Restore authenticated workstation session on initial startup
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      try {
        if (authService.isRecoveryMode()) {
          // Stay on or direct to auth page in recovery/reset mode
          navigate("/auth?mode=reset", { replace: true });
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const isPasswordRecoveryFlow =
          params.get("mode") === "reset" ||
          params.get("mode") === "forgot" ||
          params.get("type") === "recovery" ||
          hash.includes("type=recovery");

        if (isPasswordRecoveryFlow) {
          authService.setRecoveryMode(true);
          navigate("/auth?mode=reset", { replace: true });
          return;
        }

        const session = await authService.getSession();
        if (!isMounted) return;

        if (authService.isRecoveryMode()) {
          navigate("/auth?mode=reset", { replace: true });
          return;
        }

        const isConfirmedUser = session?.user && authService.isEmailConfirmed(session.user);

        if (isConfirmedUser) {
          // If the app started at root ("/" or "/auth" without explicit verify or error params)
          const isAtAuthEntry = currentPath === "/" || currentPath.startsWith("/auth");
          if (isAtAuthEntry) {
            const userOrgs = await organizationService.getUserOrganizations();
            if (!isMounted) return;
            if (userOrgs.length > 0) {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
          }
        } else {
          // If trying to access a protected workstation page without an active session
          const isProtected =
            currentPath !== "/" &&
            !currentPath.startsWith("/auth") &&
            !currentPath.startsWith("/onboarding");
          if (isProtected) {
            navigate("/auth?mode=signin", { replace: true });
          }
        }
      } catch (err) {
        console.warn("Session restore error:", err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    restoreSession();

    // Listen for recovery state transitions across the application
    const unbindRecovery = authService.onRecoveryStateChange((isRecovery) => {
      if (!isMounted) return;
      if (isRecovery) {
        navigate("/auth?mode=reset", { replace: true });
      }
    });

    // Global desktop deep link listener
    const cleanupDesktopListener = authService.initializeDesktopAuthListener(
      async (_session, _user, isRecovery) => {
        if (!isMounted) return;
        if (isRecovery || authService.isRecoveryMode()) {
          navigate("/auth?mode=reset", { replace: true });
        }
      },
      (_errMsg, isExpired) => {
        if (!isMounted) return;
        if (isExpired) {
          navigate("/auth?mode=reset", { replace: true });
        }
      }
    );

    // Listen for auth events across the app lifecycle
    const unsubscribe = authService.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY" || authService.isRecoveryMode()) {
        authService.setRecoveryMode(true);
        navigate("/auth?mode=reset", { replace: true });
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (authService.isRecoveryMode()) {
          // Do not forward to dashboard while user is in password recovery mode
          navigate("/auth?mode=reset", { replace: true });
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const isRecoveryFlow =
          params.get("mode") === "reset" ||
          params.get("type") === "recovery" ||
          hash.includes("type=recovery");

        if (isRecoveryFlow) {
          authService.setRecoveryMode(true);
          navigate("/auth?mode=reset", { replace: true });
          return;
        }

        if (session?.user && authService.isEmailConfirmed(session.user)) {
          if (currentPath === "/" || currentPath.startsWith("/auth")) {
            const userOrgs = await organizationService.getUserOrganizations();
            if (!isMounted) return;
            if (userOrgs.length > 0) {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
          }
        }
      } else if (event === "SIGNED_OUT") {
        navigate("/auth?mode=signin", { replace: true });
      }
    });

    return () => {
      isMounted = false;
      unbindRecovery();
      cleanupDesktopListener();
      unsubscribe();
    };
  }, [navigate, currentPath]);

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

  // Root-level Desktop Auth Callback & Deep-Link Listener
  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        const userOrgs = await organizationService.getUserOrganizations();
        const hasOrg = userOrgs.length > 0;
        if (hasOrg) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } catch {
        navigate("/onboarding");
      }
    };

    const cleanup = authService.initializeDesktopAuthListener(handleAuthSuccess);
    return () => cleanup();
  }, [navigate]);

  const isUnauthenticated =
    currentPath === "/" || currentPath.startsWith("/auth") || currentPath.startsWith("/onboarding");

  const getPageTitle = () => {
    if (currentPath === "/" || currentPath.startsWith("/auth")) return "Workstation Login";
    if (currentPath.startsWith("/onboarding")) return "Workspace Onboarding";
    if (currentPath.startsWith("/dashboard")) return "Command Dashboard";
    if (currentPath.startsWith("/projects")) return "Project Index";
    if (currentPath.startsWith("/sessions")) return "Investigation Workshop";
    if (currentPath.startsWith("/settings")) return "Engine Settings";
    if (currentPath.startsWith("/project")) {
      const match = currentPath.match(/^\/project\/([^/]+)/);
      return match ? `Project: ${match[1]}` : "Project Workspace";
    }
    return "Engineering Workstation";
  };

  const renderContent = () => {
    // ── Restoring Session Screen ───────────────────────────────────────────────
    if (isAuthChecking && (currentPath === "/" || currentPath.startsWith("/auth"))) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: "400px",
            background: "var(--app-surface-0, #090a0f)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <BrandMark size="lg" iconOnly />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.8125rem",
                color: "var(--app-text-muted, #94a3b8)",
                fontWeight: 500,
              }}
            >
              <span>Restoring workstation session…</span>
            </div>
          </div>
        </div>
      );
    }

    // ── Root Entry Surface & Auth ──────────────────────────────────────────────
    if (currentPath === "/" || currentPath.startsWith("/auth")) return <AuthPage />;
    if (currentPath === "/onboarding" || currentPath.startsWith("/onboarding")) return <OnboardingPage />;

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
    if (currentPath.match(/^\/project\/[^/]+\/plan/))        return <ProjectPlanPage />;
    if (currentPath.match(/^\/project\/[^/]+\/documents/))   return <ProjectDocumentsPage />;
    if (currentPath.match(/^\/project\/[^/]+\/workspace/))   return <ProjectWorkspacePage />;
    if (currentPath.match(/^\/project\/[^/]+\/takeoff/))     return <ProjectTakeoffPage />;
    if (currentPath.match(/^\/project\/[^/]+\/reports/))     return <ProjectReportsPage />;
    if (currentPath.match(/^\/project\/[^/]+\/boq/))         return <ProjectHorizonPanel tab="boq" label="Bill of Quantities (BOQ)" />;
    if (currentPath.match(/^\/project\/[^/]+\/engineering/)) return <ProjectHorizonPanel tab="engineering" label="Engineering & Sizing" />;
    if (currentPath.match(/^\/project\/[^/]+\/estimate/))    return <ProjectHorizonPanel tab="estimate" label="Commercial Estimate" />;
    if (currentPath.match(/^\/project\/[^/]+\/bid/))         return <ProjectHorizonPanel tab="bid" label="Bid & Proposal" />;
    if (currentPath.match(/^\/project\/[^/]+\/activity/))    return <ProjectHorizonPanel tab="activity" label="Activity & Decisions" />;

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
      <ContextMenuProvider>
        <AppContent />
      </ContextMenuProvider>
    </RouterProvider>
  );
}

// ── Honest Roadmap Horizon Panel for Planned Stages ───────────────────────────
function ProjectHorizonPanel({ tab, label }: { tab: string; label: string }) {
  const { currentPath, searchParams } = useRouter();
  const match = currentPath.match(/^\/project\/([^/]+)/);
  const id = match ? match[1] : searchParams.get("project") ?? "p1";

  const HORIZON_SPECS: Record<string, {
    horizon: string;
    decision?: string;
    summary: string;
    rationale: string;
    reference: string;
    dependencies: string[];
  }> = {
    boq: {
      horizon: "Near-Term Horizon (Candidate Post-Gate H1-1)",
      summary: "Hierarchical Bill of Quantities generation and where-used assembly grouping derived directly from verified Takeoff line items.",
      rationale: "Per MVP_BOUNDARY.md and ESTIMATION_BIDDING_DOMAIN.md §20, discrete component takeoff must be verified before downstream BOM explosion is authorized.",
      reference: "docs/DOMAIN/ESTIMATION_BIDDING_DOMAIN.md §20",
      dependencies: ["Verified Takeoff line items", "BOM assembly catalog", "Export specifications"],
    },
    engineering: {
      horizon: "Near-Term / Long-Term Horizon",
      summary: "Automated cable sizing, conduit fill verification, voltage drop analysis, and multi-OEM electrical equipment configuration.",
      rationale: "Per VISION.md §2, AI proposes and human engineers decide. Algorithmic sizing requires verified drawing geometry before automation is introduced.",
      reference: "docs/00_PROJECT/VISION.md §3a",
      dependencies: ["Vector coordinate extraction", "NEC/BICSI code standards", "Spatial coordination model"],
    },
    estimate: {
      horizon: "Near-Term Horizon (OD-22)",
      decision: "OD-22: Estimate Entity Model",
      summary: "Material unit costing, labor installation rates, category-based commercial adders, and markup reference price derivation.",
      rationale: "Per ESTIMATION_BIDDING_DOMAIN.md §1.2 & §20, cost lookups route through versioned retrieval tables without modifying verified takeoff quantities.",
      reference: "docs/DOMAIN/ESTIMATION_BIDDING_DOMAIN.md §7–§9",
      dependencies: ["Cost master tables", "Commercial rule schedules", "Takeoff quantity ledger"],
    },
    bid: {
      horizon: "Long-Term Horizon (OD-23)",
      decision: "OD-23: Bid & Proposal Mechanics",
      summary: "Commercial margin optimization, competitive bid scenarios, customer-facing proposal generation, and multi-year AMC/warranty schedules.",
      rationale: "Per MVP_BOUNDARY.md and VISION.md §5, commercial bid generation builds sequentially on top of the verified estimate.",
      reference: "docs/06_PAGES/PROJECT_NAVIGATION.md §3",
      dependencies: ["Commercial Estimate baseline", "Deal margin rules", "Proposal template system"],
    },
    activity: {
      horizon: "Near-Term Horizon (OD-24)",
      decision: "OD-24: Project Intelligence & Decision Entity Model",
      summary: "First-class project Decision records on ambiguous scope determinations and immutable chronological project activity stream.",
      rationale: "Per PROJECT_INTELLIGENCE.md §3–§4, human determinations outrank automated inference. Formal Decision entities are candidate additions under OD-24.",
      reference: "docs/DOMAIN/PROJECT_INTELLIGENCE.md §3",
      dependencies: ["CorrectionEvent audit ledger", "Project Intelligence grounding", "OD-24 resolution"],
    },
  };

  const spec = HORIZON_SPECS[tab] || {
    horizon: "Future Horizon",
    summary: "Planned engineering capability within the Vectoris project lifecycle container.",
    rationale: "Reserved for future horizon release per the authoritative MVP boundary.",
    reference: "docs/MVP_BOUNDARY.md",
    dependencies: ["Verified Takeoff foundation"],
  };

  return (
    <ProjectShell
      project={{ id, name: "ABC Data Center", client: "ABC Corp", displayType: "Data Center · Electrical", typeProvenance: "verified" }}
      activeTab={tab}
    >
      <div className="horizon-panel">
        <div className="horizon-panel__card">
          <div className="horizon-panel__badge-row">
            <span className="horizon-panel__badge">{spec.horizon}</span>
            {spec.decision && <span className="horizon-panel__badge horizon-panel__badge--alt">{spec.decision}</span>}
          </div>

          <h2 className="horizon-panel__title">{label}</h2>
          <p className="horizon-panel__summary">{spec.summary}</p>

          <div className="horizon-panel__divider" />

          <div className="horizon-panel__details">
            <div className="horizon-panel__detail-block">
              <span className="horizon-panel__label">Architectural Rationale</span>
              <p className="horizon-panel__text">{spec.rationale}</p>
            </div>

            <div className="horizon-panel__detail-block">
              <span className="horizon-panel__label">Documented Specification</span>
              <code className="horizon-panel__code">{spec.reference}</code>
            </div>

            <div className="horizon-panel__detail-block">
              <span className="horizon-panel__label">Workflow Prerequisites</span>
              <ul className="horizon-panel__deps">
                {spec.dependencies.map((dep, i) => (
                  <li key={i} className="horizon-panel__dep-item">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginRight: 6 }}>
                      <circle cx="6" cy="6" r="4.5" stroke="var(--border-strong)" strokeWidth="1.2"/>
                      <path d="M4 6l1.5 1.5 2.5-3" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {dep}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="horizon-panel__actions">
            <a href={`/project/${id}/takeoff`} className="btn btn--primary btn--sm">
              View Verified Takeoff
            </a>
            <a href={`/project/${id}`} className="btn btn--secondary btn--sm">
              Return to Project Overview
            </a>
          </div>
        </div>
      </div>
    </ProjectShell>
  );
}

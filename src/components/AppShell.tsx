/**
 * AppShell — Pure infrastructure layout for all authenticated pages.
 *
 * CONTRACT:
 * - Renders fixed sidebar + fixed header + scrollable main content slot.
 * - Contains ZERO page-specific logic or content.
 * - Every authenticated page renders inside <AppShell>. Pages own their content.
 * - Sidebar nav is derived from docs/02_DESIGN/NAVIGATION.md — LOCKED Aug 2026.
 *
 * CANONICAL GLOBAL NAV (source: docs/02_DESIGN/NAVIGATION.md §1 — LOCKED):
 * - Dashboard     /dashboard
 * - Projects      /projects   (also active for all /project/* sub-routes)
 * - Investigation Workshop   /sessions
 * - Settings      /settings
 *
 * FUNCTIONAL CHROME (Phase 6):
 * - Global Command & Quick Search (⌘K / Ctrl+K) -> GlobalCommandSearch
 * - Workspace / Org Popover -> OrgSwitcherPopover
 * - Notifications Popover -> NotificationsPopover
 * - User Profile Menu -> UserProfileMenu
 * - Local Engine Diagnostics Dialog -> EngineStatusDialog
 */

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "../router";
import { BrandMark } from "./BrandMark";
import { useEngineStatus, useAllDocuments } from "../services/dataService";
import { GlobalCommandSearch } from "./GlobalCommandSearch";
import { OrgSwitcherPopover } from "./OrgSwitcherPopover";
import { NotificationsPopover } from "./NotificationsPopover";
import { UserProfileMenu } from "./UserProfileMenu";
import { EngineStatusDialog } from "./EngineStatusDialog";
import { updateService, type UpdateState } from "../services/updateService";
import { useAuth } from "../hooks/useAuth";
import { useActiveOrganization } from "../services/organizationService";

// ── Canonical global nav — LOCKED (docs/02_DESIGN/NAVIGATION.md §1) ──────────
const NAV_ITEMS = [
  { label: "Dashboard",              path: "/dashboard", icon: <IconDashboard /> },
  { label: "Projects",               path: "/projects",  icon: <IconProjects /> },
  { label: "Investigation Workshop", path: "/sessions",  icon: <IconSessions /> },
  { label: "Settings",               path: "/settings",  icon: <IconSettings /> },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────
interface AppShellProps {
  children: ReactNode;
  /** Current route — determines active sidebar item */
  activePath: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export function AppShell({ children, activePath }: AppShellProps) {
  const engine = useEngineStatus();
  const allDocs = useAllDocuments();
  const { org: activeOrg, role: activeRole } = useActiveOrganization();
  const totalSheets = allDocs.reduce((sum, d) => sum + (d.sheet_count || 0), 0);
  const queuedDocs = allDocs.filter(
    (d) => d.upload_status === "queued" || d.upload_status === "ingesting" || d.upload_status === "detecting"
  );
  const isTauri =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  const { user, isAuthenticated } = useAuth();
  const userDisplayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ") : "Lead Estimator");
  const userInitials = userDisplayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "LE";

  const orgDisplayName = activeOrg?.name || "Apex Engineering";
  const orgInitial = orgDisplayName[0]?.toUpperCase() || "A";
  const roleLabel = activeRole
    ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1)
    : (isAuthenticated ? "Owner" : "Estimator");
  const userRole = isAuthenticated ? `${roleLabel} · Active` : "Local Standby";

  // Chrome interaction states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isEngineDialogOpen, setIsEngineDialogOpen] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>(() => updateService.getState());

  const orgAnchorRef = useRef<HTMLButtonElement>(null);
  const notifAnchorRef = useRef<HTMLButtonElement>(null);
  const userAnchorRef = useRef<HTMLDivElement>(null);

  // Subscribe to updater state
  useEffect(() => {
    return updateService.subscribe((state) => {
      setUpdateState(state);
    });
  }, []);

  // Quiet background check on application launch (throttled, non-blocking)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateService.checkForUpdate({ isBackground: true }).catch(() => {
        // Silently catch background errors
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  // Global ⌘K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      {/* ── Fixed Left Sidebar ──────────────────────────────── */}
      <aside className="app-sidebar" aria-label="Main navigation">

        {/* Brand */}
        <div className="app-sidebar__brand">
          <BrandMark />
        </div>

        {/* Org Switcher with Popover */}
        <div style={{ position: "relative", width: "100%" }}>
          <button
            ref={orgAnchorRef}
            type="button"
            className="app-org-switcher"
            data-tour="workspace-header"
            aria-label={`Workspace options — ${orgDisplayName}`}
            aria-haspopup="dialog"
            aria-expanded={isOrgOpen}
            onClick={() => setIsOrgOpen((prev) => !prev)}
          >
            <span className="app-org-switcher__avatar" aria-hidden="true">{orgInitial}</span>
            <div className="app-org-switcher__info">
              <span className="app-org-switcher__name">{orgDisplayName}</span>
              <span className="app-org-switcher__meta">{roleLabel} · Multi-Tenant</span>
            </div>
            <IconChevronUpDown aria-hidden="true" />
          </button>

          <OrgSwitcherPopover
            isOpen={isOrgOpen}
            onClose={() => setIsOrgOpen(false)}
            anchorRef={orgAnchorRef}
          />
        </div>

        {/* Nav */}
        <nav className="app-sidebar__nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/projects"
                // Projects stays active for all project sub-routes
                ? activePath.startsWith("/projects") || activePath.startsWith("/project")
                : item.path === "/dashboard"
                ? activePath === "/dashboard" || activePath === "/"
                : activePath.startsWith(item.path);

            const tourId =
              item.path === "/projects"
                ? "nav-projects"
                : item.path === "/sessions"
                ? "nav-sessions"
                : item.path === "/settings"
                ? "nav-settings"
                : "nav-dashboard";

            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour={tourId}
                className={`app-nav-item${isActive ? " app-nav-item--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Local Engine Status — bottom of sidebar (Interactive diagnostics) */}
        <div
          className="app-engine-card"
          role="button"
          tabIndex={0}
          aria-label={`Local engine status: ${engine.status}. Click for diagnostics.`}
          onClick={() => setIsEngineDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsEngineDialogOpen(true);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="app-engine-card__header">
            <span className="app-engine-card__label">Active Workspace</span>
            <span className="app-engine-card__badge">
              <span className="app-engine-card__dot" aria-hidden="true" />
              {engine.status === "ready" ? "Local Ready" : "Standby"}
            </span>
          </div>
          <div
            className="app-engine-card__bar"
            role="progressbar"
            aria-valuenow={totalSheets}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${totalSheets} sheets indexed`}
          >
            <div className="app-engine-card__bar-fill" style={{ width: `${Math.min(100, totalSheets)}%` }} />
          </div>
          <span className="app-engine-card__meta">
            {totalSheets > 0 ? `${totalSheets} sheets indexed` : "0 sheets indexed · Standby"}
          </span>
        </div>
      </aside>

      {/* ── Fixed Top Header ────────────────────────────────── */}
      <header className="app-header">
        <a href="#app-main" className="skip-link">Skip to main content</a>

        {/* Global Search Button -> Opens Command Palette */}
        <div
          className="app-search"
          role="search"
          aria-label="Global search (Click or press ⌘K)"
          onClick={() => setIsSearchOpen(true)}
        >
          <IconSearch className="app-search__icon" aria-hidden="true" />
          <input
            className="app-search__input"
            type="search"
            placeholder="Search blueprints, sheets, component tags… (⌘K)"
            aria-label="Search"
            readOnly
            onClick={() => setIsSearchOpen(true)}
          />
          <kbd className="app-search__kbd" aria-hidden="true">⌘K</kbd>
        </div>

        {/* Header right: update indicator + engine badge + notifications + user */}
        <div className="app-header__actions">
          {updateState.status === "update-available" && updateState.availableRelease && (
            <Link
              to="/settings"
              className="settings-chip settings-chip--ready"
              style={{
                textDecoration: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
              }}
              title={`Update v${updateState.availableRelease.version} is available. Click to review in Settings.`}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                }}
                aria-hidden="true"
              />
              <span>Update v{updateState.availableRelease.version}</span>
            </Link>
          )}

          <button
            type="button"
            className="app-engine-badge"
            role="status"
            aria-label="Local Core Engine status. Click for diagnostics."
            onClick={() => setIsEngineDialogOpen(true)}
            style={{ cursor: "pointer", border: "1px solid var(--app-border)" }}
          >
            <span className="app-engine-badge__dot" aria-hidden="true" />
            <span>{isTauri ? "Local Desktop Core" : "Local Core Engine"}</span>
          </button>

          {/* Notifications button with Popover */}
          <div style={{ position: "relative" }}>
            <button
              ref={notifAnchorRef}
              type="button"
              className="app-icon-btn"
              aria-label={
                queuedDocs.length > 0 || updateState.status === "update-available"
                  ? "Notifications — active alerts"
                  : "Notifications — up to date"
              }
              aria-haspopup="dialog"
              aria-expanded={isNotifOpen}
              onClick={() => setIsNotifOpen((prev) => !prev)}
            >
              <IconBell aria-hidden="true" />
              {(queuedDocs.length > 0 || updateState.status === "update-available") && (
                <span className="app-icon-btn__badge" aria-hidden="true" />
              )}
            </button>

            <NotificationsPopover
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              anchorRef={notifAnchorRef}
            />
          </div>

          <div className="app-header__sep" aria-hidden="true" />

          {/* User Profile Chip with Popover Menu */}
          <div style={{ position: "relative" }}>
            <div
              ref={userAnchorRef}
              className="app-user-chip"
              role="button"
              tabIndex={0}
              aria-label="User profile and workstation actions"
              aria-haspopup="menu"
              aria-expanded={isUserOpen}
              onClick={() => setIsUserOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsUserOpen((prev) => !prev);
                }
              }}
            >
              <div className="app-user-chip__avatar" aria-hidden="true">{userInitials}</div>
              <div className="app-user-chip__info" aria-hidden="true">
                <span className="app-user-chip__name">{userDisplayName}</span>
                <span className="app-user-chip__role">{userRole}</span>
              </div>
            </div>

            <UserProfileMenu
              isOpen={isUserOpen}
              onClose={() => setIsUserOpen(false)}
              anchorRef={userAnchorRef}
            />
          </div>
        </div>
      </header>

      {/* ── Scrollable Main Content ─────────────────────────── */}
      <main className="app-main" id="app-main" tabIndex={-1}>
        <div key={activePath} className="page-transition-view">
          {children}
        </div>
      </main>

      {/* ── Global Search Dialog ────────────────────────────── */}
      <GlobalCommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* ── Engine Diagnostics Dialog ───────────────────────── */}
      <EngineStatusDialog
        isOpen={isEngineDialogOpen}
        onClose={() => setIsEngineDialogOpen(false)}
      />
    </div>
  );
}

// ── Icons — inline SVG, no icon font dependency ──────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function IconProjects() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 5.5A1.5 1.5 0 013.5 4h3l1.5 2H14.5A1.5 1.5 0 0116 7.5v7A1.5 1.5 0 0114.5 16h-11A1.5 1.5 0 012 14.5v-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSessions() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.5 11c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="6" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M3.93 3.93l1.06 1.06M13.01 13.01l1.06 1.06M3.93 14.07l1.06-1.06M13.01 4.99l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconChevronUpDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 5.5l3-2.5 3 2.5M4 8.5l3 2.5 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={className} aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2a5 5 0 00-5 5v2.5L2.5 12h13L14 9.5V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

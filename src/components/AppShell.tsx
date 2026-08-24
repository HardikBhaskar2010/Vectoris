/**
 * AppShell — Pure infrastructure layout for all authenticated pages.
 *
 * CONTRACT:
 * - Renders fixed sidebar + fixed header + scrollable main content slot.
 * - Contains ZERO page-specific logic or content.
 * - Every authenticated page renders inside <AppShell>. Pages own their content.
 * - Sidebar nav is derived from docs/02_DESIGN/NAVIGATION.md — LOCKED Aug 2026.
 *   Stitch designs are visual references only. The documentation is authoritative.
 *
 * CANONICAL GLOBAL NAV (source: docs/02_DESIGN/NAVIGATION.md §1 — LOCKED):
 * - Dashboard     /dashboard
 * - Projects      /projects   (also active for all /project/* sub-routes)
 * - AI Sessions   /sessions
 * - Settings      /settings
 *
 * INTENTIONALLY EXCLUDED from global sidebar (live inside Project shell):
 * - Drawing Workspace — project sub-nav tab: /project/:id/workspace
 * - Documents         — project sub-nav tab: /project/:id/documents
 * - Takeoff           — project sub-nav tab: /project/:id/takeoff
 * - Reports / BOQ     — project sub-nav tab: /project/:id/reports
 * - Estimate          — project sub-nav tab: /project/:id/estimate [FUTURE]
 * - Bid / Proposal    — project sub-nav tab: /project/:id/bid [FUTURE]
 */

import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

// ── Canonical global nav — LOCKED (docs/02_DESIGN/NAVIGATION.md §1) ──────────
const NAV_ITEMS = [
  { label: "Dashboard",   path: "/dashboard", icon: <IconDashboard /> },
  { label: "Projects",    path: "/projects",  icon: <IconProjects /> },
  { label: "AI Sessions", path: "/sessions",  icon: <IconSessions /> },
  { label: "Settings",    path: "/settings",  icon: <IconSettings /> },
] as const;


// ── Types ────────────────────────────────────────────────────────────────────
interface AppShellProps {
  children: ReactNode;
  /** Current route — determines active sidebar item */
  activePath: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export function AppShell({ children, activePath }: AppShellProps) {
  return (
    <div className="app-shell">
      {/* ── Fixed Left Sidebar ──────────────────────────────── */}
      <aside className="app-sidebar" aria-label="Main navigation">

        {/* Brand */}
        <div className="app-sidebar__brand">
          <BrandMark />
        </div>

        {/* Org Switcher */}
        <button type="button" className="app-org-switcher" aria-label="Switch workspace — Apex Engineering">
          <span className="app-org-switcher__avatar" aria-hidden="true">A</span>
          <div className="app-org-switcher__info">
            <span className="app-org-switcher__name">Apex Engineering</span>
            <span className="app-org-switcher__meta">12 members</span>
          </div>
          <IconChevronUpDown aria-hidden="true" />
        </button>

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
            return (
              <a
                key={item.path}
                href={item.path}
                className={`app-nav-item${isActive ? " app-nav-item--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Local Engine Status — bottom of sidebar */}
        <div className="app-engine-card" role="status" aria-label="Local engine status: ready">
          <div className="app-engine-card__header">
            <span className="app-engine-card__label">Active Workspace</span>
            <span className="app-engine-card__badge">
              <span className="app-engine-card__dot" aria-hidden="true" />
              Local Ready
            </span>
          </div>
          <div
            className="app-engine-card__bar"
            role="progressbar"
            aria-valuenow={60}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="60% of sheets indexed"
          >
            <div className="app-engine-card__bar-fill" style={{ width: "60%" }} />
          </div>
          <span className="app-engine-card__meta">436 sheets indexed</span>
        </div>
      </aside>

      {/* ── Fixed Top Header ────────────────────────────────── */}
      <header className="app-header">
        <a href="#app-main" className="skip-link">Skip to main content</a>

        {/* Global Search — visual; ⌘K handler wired in each page if needed */}
        <div className="app-search" role="search" aria-label="Global search">
          <IconSearch className="app-search__icon" aria-hidden="true" />
          <input
            className="app-search__input"
            type="search"
            placeholder="Search blueprints, sheets, component tags… (⌘K)"
            aria-label="Search"
            readOnly
          />
          <kbd className="app-search__kbd" aria-hidden="true">⌘K</kbd>
        </div>

        {/* Header right: engine badge + notifications + user */}
        <div className="app-header__actions">
          <div className="app-engine-badge" role="status" aria-label="Local Core Engine active">
            <span className="app-engine-badge__dot" aria-hidden="true" />
            <span>Local Core Engine</span>
          </div>

          <button type="button" className="app-icon-btn" aria-label="Notifications — 1 unread">
            <IconBell aria-hidden="true" />
            <span className="app-icon-btn__badge" aria-hidden="true" />
          </button>

          <div className="app-header__sep" aria-hidden="true" />

          <div className="app-user-chip">
            <div className="app-user-chip__avatar" aria-hidden="true">HB</div>
            <div className="app-user-chip__info" aria-hidden="true">
              <span className="app-user-chip__name">Hardik Bhaskar</span>
              <span className="app-user-chip__role">Owner · Apex Eng</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Scrollable Main Content ─────────────────────────── */}
      <main className="app-main" id="app-main" tabIndex={-1}>
        {children}
      </main>
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

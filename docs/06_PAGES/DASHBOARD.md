# Dashboard

## Status
RECOMMENDED

## Purpose
Post-auth landing surface; orientation point across a user's organizations and projects. The starting page of every authenticated session in the Vectoris desktop app.

## Design Reference

Primary (Dark):
`../../designs/stitch/01_Dashboard_Dark_Theme.png`

Implementation reference (Dark):
`../../designs/stitch/01_Dashboard_Dark_Theme.html`

Primary (Light):
`../../designs/stitch/02_Dashboard_Light_Theme.png`

Implementation reference (Light):
`../../designs/stitch/02_Dashboard_Light_Theme.html`

Reference purpose:
Visual and UX reference for Dashboard composition — persistent left sidebar, top header, KPI summary cards, live blueprint viewport, AI activity feed, and takeoff items stream. Both dark and light theme variants are designed.

**Design vs. documented behavior:**
- KPI card values (24 active projects, 436 sheets, 18,240 takeoff counts, 380 verified items) are **visual demo placeholder content** — not product requirements.
- "Confidence: High" badge visible in the AI feed card **conflicts with `../02_DESIGN/UX_PRINCIPLES.md` §2** (confidence scores are internal-only, not primary UI) — this badge in the design is placeholder content and must not be implemented as shown. Flagged for design review.
- "Local Core Engine" / "Local Engine Active" badge in the header is a valid UX pattern (shows whether the local model is loaded); the specific label text and format is TBD.
- The live blueprint viewport on Dashboard is a navigation shortcut to the active project's Takeoff Workspace — it is not a second instance of the Drawing Viewer. It functions as a "pinned active project" preview.
- Sample project names ("ABC Data Center", "Greenfield Hospital", "Skyline Tower") and their status values are demo content.
- The sidebar shows: Dashboard, Projects, Drawing Viewer, Takeoff Workspace, AI Sessions, Documents, BOQ Reports, Settings — this is the **design's navigation proposal**. The canonical nav structure and labels are to be confirmed by the founder. "Documents" is not a top-level page in the current `APP_FLOW.md`; this discrepancy is flagged as an open question.

---

## User Goal
See the current state of active work across projects, quickly return to an active project or takeoff, or create a new one.

## Entry Conditions
Successful authentication, or navigating "home" (clicking the logo/wordmark or Dashboard nav item from anywhere in the app).

## Exit Conditions
→ Projects page, → Create Project, → specific Project Overview, → Takeoff Workspace (for pinned/active project), → Investigation Workshop.

---

## Information Architecture

**Persistent Left Sidebar:**
- Vectoris wordmark + logo mark
- Organization / Workspace Switcher (shows org name, member count, switch control)
- Navigation: Dashboard, Projects, Investigation Workshop, Settings
- Bottom: Local engine status card (status + storage/indexing summary)

> Note: The sidebar navigation structure in the design (especially "Drawing Viewer" vs. "Takeoff Workspace" as separate nav items, and "Documents" as a top-level item) does not fully match the current `APP_FLOW.md`. The founder must confirm the canonical nav structure. Until confirmed, the sidebar is documented as a design reference, not a locked navigation specification.

**Top Header:**
- Global search (⌘K) — scope: "Search blueprints, sheets, component tags..."
- Local engine status badge (live/idle indicator)
- Notifications
- User profile (avatar + name + org role)

**Main Content Area:**

1. **Welcome greeting + primary CTAs**
   - Personalised greeting (user's name)
   - "New Project" (secondary) + "Upload Drawings" (primary) CTAs

2. **KPI Summary Cards** (4-up grid)
   - Active Projects count
   - Sheets Processed count
   - Takeoff Items count (proposed/pending review)
   - Verified Line Items count
   > These are summary metrics scoped to the current org/workspace. All values are live, not static. Specific metric definitions and sources TBD at implementation phase.

3. **Drawing-First Hero Section** (split: 7/5 columns)
   - **Left (7): Live Blueprint Viewport**
     - Active/pinned project drawing preview (mini canvas with detection overlays)
     - Sheet identifier + component count summary
     - "Open in Takeoff Workspace" shortcut
     - Recent Projects & Drawing Status table (name, discipline, sheet count, takeoff status, action link)
   - **Right (5): AI & Takeoff Activity**
     - AI Engineering Copilot feed — recent agent activity items (which document was analyzed, what was found)
     - Takeoff Items stream — recent/active project's line items with verification status

---

## Layout
Two-panel: fixed left sidebar + scrollable main content. Fixed top header. See design reference. Exact dimensions TBD — founder-owned.

## Components
`SidebarNav`, `OrgSwitcher`, `LocalEngineStatus`, `GlobalSearch`, `UserProfile`, `KPICard`, `BlueprintViewportPreview`, `RecentProjectsTable`, `AIActivityFeed`, `TakeoffItemStream`, `ProjectCard`, `EmptyState`.

> **Implementation Note:** **Bklit UI** provides the implementation primitives (dashboard cards, data tables, project lists, filters, status indicators, structured data surfaces) adapted strictly to the Vectoris Design System. The dashboard does *not* use Bklit's default design; it uses Bklit's structural primitives.

---

## User Interactions

### Primary
- Click a recent project → Project Overview
- Click "Open in Takeoff Workspace" on the blueprint preview → Takeoff Workspace for that project
- Click "New Project" → Create Project
- Click "Upload Drawings" → Document Upload (in context of active project or Create Project flow)
- Switch organization via org switcher

### Secondary
- Global search (⌘K) — navigate to project, sheet, or component by name/tag
- Click a line item in the Takeoff Items stream → Line Item Details
- Click "Full Takeoff →" → Takeoff Review for that project
- Navigate via sidebar to any top-level section

---

## AI Behavior
The Dashboard's AI feed is a **read-only activity stream** — it shows what the Vectoris Agent has recently done across the org's active projects (analysis summaries, detections, proposed actions awaiting review). It is not an interactive chat surface. The interactive investigation interface lives in the Investigation Workshop at `AI_SESSION.md`.

No AI input or action proposals are initiated from the Dashboard itself.

---

## Data Requirements
Authenticated user's orgs and role, recent projects (scoped by role), org-level KPI aggregates, recent AI activity events, recent takeoff item summaries.

## API Requirements
- `GET /orgs` — user's organizations
- `GET /projects?org_id=&recent=true` — recent projects
- `GET /dashboard/summary?org_id=` — KPI aggregates (active projects, sheets, counts, verified items)
- `GET /activity/feed?org_id=` — recent AI and correction activity

---

## State Model

### Loading
Skeleton for KPI cards, blueprint viewport, and project list while data fetches.
### Empty — New Org
No projects yet. `EmptyState` in the main content area — welcome message + "Create your first project" CTA. Blueprint viewport and AI feed are also empty-stated rather than hidden.
### Success
Fully populated dashboard.
### Error
Data fetch failure — `ErrorState` with retry. KPI cards show "—" rather than failing silently.
### Permission denied
N/A at this level; dashboard reflects only what the user is permitted to see by their role.
### Offline
Shows last-cached local state (local-first, `../03_ARCHITECTURE/STORAGE.md`). Stale/offline indicator visible. KPI aggregates that require cloud sync show a "last updated [timestamp]" label. Blueprint viewport operates from local data if available.

---

## Accessibility
Standard; KPI cards require meaningful alt text / ARIA labels (not just numbers without context). See `../02_DESIGN/UX_PRINCIPLES.md`.

## Keyboard Interaction
⌘K → Global search. Tab navigation through KPI cards and project list. Sidebar nav keyboard-accessible. Full keymap TBD.

## Motion
Staggered entry animation on KPI cards (per `../02_DESIGN/MOTION.md`). Blueprint viewport preview — subtle pulse on active detection overlay. AI feed items — slide-in on new entries.

## Responsive / Window Behavior
Desktop app. Sidebar may compress or collapse at narrower window widths. Main content area minimum viable layout TBD — must remain usable without horizontal scroll at the minimum supported window size.

## Acceptance Criteria
- AC: A user with existing projects sees them listed with correct status.
- AC: A user with no projects sees an empty state directing them to Create Project.
- AC: Navigating to the Takeoff Workspace from the blueprint viewport shortcut opens the correct project.
- AC: KPI counts reflect the current state, not a cached stale value — or stale status is clearly indicated.

## Dependencies
`PROJECTS.md`, `CREATE_PROJECT.md`, `PROJECT_OVERVIEW.md`, `DRAWING_VIEWER.md`, `AI_SESSION.md`

## Open Questions
- Whether Dashboard is a distinct page from Projects or a merged surface — currently modeled as distinct per `APP_FLOW.md`; the design keeps them separate. Flagged to `../OPEN_DECISIONS.md` OD-14.
- Canonical sidebar navigation labels and structure — the design shows items that don't fully match the current `APP_FLOW.md` (e.g., "Documents" as top-level). TBD — founder design decision.
- Whether "Drawing Viewer" and "Takeoff Workspace" are separate sidebar nav items or one (the design shows both) — TBD.
- KPI card metric definitions: exact calculation and data scope — TBD at implementation.
- Whether the AI activity feed is org-scoped or user-scoped — TBD.

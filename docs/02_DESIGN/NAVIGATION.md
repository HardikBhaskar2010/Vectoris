# Vectoris — Navigation Model

**Status:** LOCKED (global sidebar) · RECOMMENDED (project sub-nav)  
**Owner of:** Global sidebar structure, project-level sub-navigation, canonical nav labels  
**Does not own:** Per-page layout (→ 06_PAGES/*), routing graph (→ APP_FLOW.md), design tokens (→ DESIGN_SYSTEM.md)

> Resolves the contradiction between DASHBOARD.md §IA and APP_FLOW.md on sidebar structure.  
> Locks the four decisions from the Aug 2026 architecture review: OD-14, OD-24, OD-25.

---

## 1. Global Sidebar (LOCKED)

The global sidebar is persistent across all authenticated pages.

```
[Vectoris Logo + Wordmark]
[Org Switcher]
──────────────────────────
Dashboard
Projects
AI Sessions
──────────────────────────
Settings
──────────────────────────
[Local Engine Status Card]
```

### Canonical items and labels

| Item | Label | Route | Notes |
|---|---|---|---|
| Dashboard | Dashboard | `/dashboard` | Org-wide pulse. Active state: exact path match. |
| Projects | Projects | `/projects` | Project library. Active state: `/projects` and `/project/*`. |
| AI Sessions | AI Sessions | `/sessions` | Global sessions surface (general + project-attached). Active: `/sessions/*`. |
| Settings | Settings | `/settings` | Org/user settings. Active: `/settings/*`. |

### What does NOT belong in the global sidebar

The following are project-level capabilities and live inside the project sub-nav, not in the global sidebar:

| Item | Where it lives |
|---|---|
| Drawing Workspace | Project sub-nav → Workspace |
| Takeoff | Project sub-nav → Takeoff |
| Documents | Project sub-nav → Documents |
| BOQ / Reports | Project sub-nav → Reports |
| Estimate | Project sub-nav → Estimate [FUTURE] |
| Bid / Proposal | Project sub-nav → Bid [FUTURE] |

The DASHBOARD.md design reference shows some of these as potential sidebar items — those are visual design proposals from the stitch mock, not the locked navigation structure. This document is authoritative.

---

## 2. Project Sub-Navigation (LOCKED)

When a user is inside a project, a horizontal tab bar renders below the project header. The global sidebar remains visible and unchanged; `Projects` stays active in the sidebar while any project sub-page is active.

### Tab bar

```
Overview  ·  Documents  ·  Workspace  ·  Takeoff  ·  Reports
```

Future tabs (greyed/locked until the capability exists):

```
Overview  ·  Documents  ·  Workspace  ·  Takeoff  ·  [Estimate]  ·  [Bid]  ·  Reports
```

### Canonical tabs, labels, and routes

| Tab | Label | Route | MVP scope | Notes |
|---|---|---|---|---|
| Overview | Overview | `/project/:id` | ✅ MVP | Project status hub |
| Documents | Documents | `/project/:id/documents` | ✅ MVP | All uploads + per-document processing status |
| Workspace | Workspace | `/project/:id/workspace` | ✅ MVP | Drawing canvas + detection overlay |
| Takeoff | Takeoff | `/project/:id/takeoff` | ✅ MVP | Line items; review; approval |
| Estimate | Estimate | `/project/:id/estimate` | ❌ FUTURE | Consumes verified takeoff quantities |
| Bid / Proposal | Bid | `/project/:id/bid` | ❌ FUTURE | Consumes Estimate |
| Reports | Reports | `/project/:id/reports` | ✅ MVP | Export (XLSX/CSV/JSON/PDF) + history |

### Rules

- The tab bar is part of the project shell — rendered immediately below the project header.
- Active tab is determined by the current route.
- FUTURE tabs must appear visually but be non-interactive (disabled + tooltip: "Coming soon") — never hidden. Hiding them implies the product will never have these capabilities; showing them disabled communicates the product roadmap honestly.
- The project header (project name, type badge, primary actions) is always visible regardless of which tab is active.

---

## 3. Breadcrumb Structure

All project sub-pages use a consistent breadcrumb:

```
Projects  ›  [Project Name]  ›  [Tab Name]
```

Examples:
```
Projects  ›  ABC Data Center  ›  Overview
Projects  ›  ABC Data Center  ›  Workspace
Projects  ›  ABC Data Center  ›  E-104 Cable Tray Layout
```

The Workspace breadcrumb may include the active sheet as the third level when a sheet is open.

---

## 4. AI Sessions Navigation

AI Sessions is a global nav item, not a project-exclusive page.

```
AI Sessions
├── [All]  [Project Sessions]  [General]      ← filter tabs
│
├── [Project Label] Session Title       timestamp
├── [Project Label] Session Title       timestamp
├── General conversation                timestamp
└── ...
```

- Sessions with `project_id` display the project name as a label prefix.
- Sessions with `project_id = NULL` display as "General" with no project prefix.
- Clicking "New session" from within a project pre-fills the project context selector.
- The same session list appears in the AI Sessions global page and (filtered) in the Project Overview's session panel.

---

## 5. Dashboard vs. Projects (LOCKED — separate surfaces)

OD-14 is resolved: **Dashboard and Projects are separate pages.**

| Page | Purpose | When to use |
|---|---|---|
| Dashboard | Org-wide pulse: recent activity, KPI summary, return-to-active-work shortcut | Post-login landing; returning to active work |
| Projects | Full project library: browse, search, filter, create | When finding or managing a specific project |

They are not merged. The Dashboard may link to recent projects and surface top-level KPIs, but it does not replace the Projects library.

---

## 6. Cross-References

- Routing graph: `../01_PRODUCT/APP_FLOW.md`
- Project IA detail: `PROJECT_NAVIGATION.md`
- Global sidebar implementation: `../src/components/AppShell.tsx`
- Page specs: `../06_PAGES/*`
- Open decisions resolved by this document: OD-14, OD-24, OD-25 (see `../OPEN_DECISIONS.md`)

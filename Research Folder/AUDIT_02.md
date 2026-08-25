# VECTORIS — FULL FORENSIC REPOSITORY AUDIT (AUDIT 02)

**Document Reference:** `Research Folder/AUDIT_02.md`  
**Supersedes:** `Research Folder/AUDIT_01.md`  
**Date:** August 2026  
**Auditor:** Antigravity Forensic Engineering  
**Scope:** Entire Repository (`src/`, `src-tauri/`, `docs/`, `public/`, `.agents/`, `Research Folder/`, Build Pipeline)  
**Audit Methodology:** Static Analysis, Dependency Tracing, Security & CSP Review, Data Lifecycle Verification, Runtime Build Validation  
**File Modifications:** Zero (Strict Read-Only Audit)

---

## 0. EXECUTIVE CONTEXT & SPECIFICATION VS. REALITY

Vectoris is architecturally specified across 58 documents in `docs/` as an **AI-native, local-first electrical estimating and techno-commercial engineering workstation**.

### The Core Architectural Premise
- **Desktop Shell:** Tauri v2 (Rust) providing frameless window chrome and local OS capability.
- **Frontend:** React 19 + TypeScript + Vite single-page application.
- **Data & Ingestion Pipeline:** Local-first drawing ingestion (PDF, DWG, DXF, BIM), local vector parsing, on-device perception/OCR, and evidence-backed takeoff review.
- **Backend / Async Engine (Documented Horizon):** Python/FastAPI backend, Redis + Celery distributed queue, Supabase PostgreSQL with Row Level Security (RLS) and Supabase Auth.
- **AI Stack (Documented Horizon):** Fine-tuned Perception vision models, LLM Brain agentic reasoning runtime, structured memory, and tool invocation.

### Specification vs. Code Reality
1. **The Documentation is an Aspirational Horizon Specification:** Most documents in `docs/` are marked `Status: LOCKED`, presenting architectural blueprints (Perception pipelines, Brain fine-tuning, Celery queues, RLS tenant isolation) as finished or active engineering contracts.
2. **The Repository is a High-Fidelity Desktop Visual Prototype:** The codebase is a React 19 + TypeScript + Vite single-page frontend inside a lightweight Tauri v2 desktop frame.
3. **The Data Seam is in a Transition State:** An initial unified service layer (`src/services/dataService.ts`, `src/services/engineService.ts`, `src/services/fileDialogService.ts`) and consolidated mock stores (`src/data/`) have been introduced, persisting to browser `localStorage`. However, the underlying drawing processing engine, native file storage, and AI perception pipelines do not yet exist.

---

## 1. REPOSITORY INVENTORY

### 1.1 Complete Codebase Structure

```
Vectoris Root
├── docs/ (58 spec files across 8 categories: 00_PROJECT -> 07_OPERATIONS + ADR summaries)
├── Research Folder/ (9 historical thesis, discovery, audio transcription & prior audit notes)
├── src/
│   ├── app/
│   │   └── App.tsx (Hand-rolled route dispatcher)
│   ├── components/ (14 React components)
│   │   ├── AppShell.tsx (Global desktop chrome, navigation rail, header)
│   │   ├── BlueprintViewport.tsx (Static SVG drawing preview)
│   │   ├── BrandMark.tsx (SVG Vectoris branding)
│   │   ├── CreateProjectModal.tsx (4-step project wizard)
│   │   ├── DesktopTitleBar.tsx (Frameless window controls, liquid theme transition)
│   │   ├── EngineStatusDialog.tsx (Honest workstation diagnostics modal)
│   │   ├── GlobalCommandSearch.tsx (⌘K accessible quick search palette)
│   │   ├── KPICard.tsx (Metric tile with motion spring counter)
│   │   ├── NotificationsPopover.tsx (Workstation events popover)
│   │   ├── OrgSwitcherPopover.tsx (Workspace context popover)
│   │   ├── ProjectCard.tsx (Project tile with 3D cursor tilt & glare)
│   │   ├── ProjectShell.tsx (Project sub-navigation tabs & breadcrumbs)
│   │   ├── SystemNotice.tsx (Alert component)
│   │   └── UserProfileMenu.tsx (User profile popover menu)
│   ├── data/ (7 consolidated mock data & type definitions)
│   │   ├── index.ts (Data barrel exporter)
│   │   ├── types.ts (Canonical TypeScript interfaces)
│   │   ├── mockProjects.ts (6 initial projects)
│   │   ├── mockDocuments.ts (8 initial documents)
│   │   ├── mockSessions.ts (3 initial AI chat sessions)
│   │   ├── mockTakeoff.ts (Line items, sheets, layers, detections)
│   │   └── mockEngine.ts (Engine status defaults)
│   ├── hooks/
│   │   └── useOnlineStatus.ts (Network online/offline listener)
│   ├── pages/ (10 page surfaces)
│   │   ├── AuthPage.tsx (Login / Signup / Invitation entry surface)
│   │   ├── DashboardPage.tsx (Executive overview & KPI cards)
│   │   ├── ProjectsPage.tsx (Project library with grid/list view)
│   │   ├── ProjectOverviewPage.tsx (Project hub & recent activity)
│   │   ├── ProjectDocumentsPage.tsx (File dropzone & upload pipeline list)
│   │   ├── ProjectWorkspacePage.tsx (Takeoff workspace & layer canvas)
│   │   ├── ProjectTakeoffPage.tsx (Takeoff ledger review table & audit log)
│   │   ├── ProjectReportsPage.tsx (Export BOQ snapshot generation)
│   │   ├── SessionsPage.tsx (AI estimation copilot chat surface)
│   │   └── SettingsPage.tsx (11-category workstation configuration)
│   ├── services/ (3 service boundary modules)
│   │   ├── dataService.ts (Unified reactive localStorage data store & hooks)
│   │   ├── engineService.ts (Tauri IPC status bridge & diagnostics)
│   │   └── fileDialogService.ts (DOM file selection & drag-drop parser)
│   └── styles/
│       └── global.css (9,856-line monolithic stylesheet · 247 KB)
├── src-tauri/
│   ├── Cargo.toml (Rust dependencies: serde, serde_json, log, tauri v2.11.3, tauri-plugin-log v2)
│   ├── tauri.conf.json (Window config, CSP, bundle targets: nsis, msi)
│   ├── capabilities/default.json (Tauri v2 window permissions)
│   └── src/
│       ├── main.rs (Tauri entry point)
│       └── lib.rs (Tauri app builder & 2 IPC query commands)
├── public/assets/ (3 static brand & illustration assets)
├── scripts/tauri.js (Scoop/MinGW cross-compilation environment wrapper)
└── .agents/skills/ (27 agent skill packages)
```

### 1.2 Anomalies, Dead Files & Technical Waste

| Item | Location | Classification | Detailed Forensic Finding |
|---|---|---|---|
| `vectoris-vite.out.log` / `.err.log` | Root directory | Debug Artifact | Development logs left in the workspace root. |
| `download_designs.js` / `render_screenshots.js` | `Research Folder/` | Abandoned Scripts | Discovery scraper scripts for Figma/Stitch assets. |
| `LandingPage.tsx` | Git history / docs | Documentation Drift | Deleted from `src/pages/` during direct-auth routing refactor, but still documented in `docs/06_PAGES/LANDING.md`. |
| Broken Link `/workspace` | `src/components/BlueprintViewport.tsx:62` | Broken Route | CTA link references `/workspace`, which is not mapped in `App.tsx` router and falls back to `AuthPage`. |
| Monolithic Stylesheet | `src/styles/global.css` | Bloat / Architecture Smell | 9,856 lines (247 KB) in a single stylesheet without component encapsulation or CSS modules. |
| Missing Production Packages | `package.json` | Missing Dependencies | `pdfjs-dist`, `konva`, `@supabase/supabase-js`, `driver.js` documented as LOCKED/RECOMMENDED in `TECH_STACK.md` are not installed. |

---

## 2. ARCHITECTURE AUDIT

### 2.1 Intended vs. Actual Layering

```
Intended Architecture:
UI Components
  ↓
Hooks & Contexts
  ↓
Unified Service Boundary (Data, Engine, File)
  ↓
Tauri IPC / Native Rust Layer
  ↓
Local Storage (SQLite / Local Filesystem) + Python Engine Subprocess + Supabase Sync

Actual Repository State:
UI Components
  ├── DataService / LocalStorage (Projects, Documents, Takeoff Review, Sessions)
  ├── Local React State (Workspace Canvas Detections, Export History, Auth)
  └── Tauri IPC Bridge (Only 2 static metadata queries: get_engine_status, get_platform_info)
```

### 2.2 Architectural Violations

1. **Full Page Reloads on Route Navigation (Broken SPA Model):**
   In `src/app/App.tsx:37`, route evaluation is performed via a static read of `window.location.pathname`. Throughout the application (`ProjectsPage.tsx:105`, `CreateProjectModal.tsx:211`, `GlobalCommandSearch.tsx:150`, `ProjectWorkspacePage.tsx:331`), transitions are executed using `window.location.href = ...` or standard `<a href="...">` anchors.
   *Consequence:* Every route change performs a full browser navigation, destroying the in-memory React component tree and re-parsing 502 kB of JavaScript.
2. **Dual Takeoff State (Workspace vs. Review Ledger Disconnect):**
   - `ProjectTakeoffPage.tsx:46` uses `useLineItems(projectId)` connected to `dataService` and persisted in `localStorage`.
   - `ProjectWorkspacePage.tsx:54-70, 96` declares its own hardcoded `TAKEOFF_ITEMS` dictionary and `useState(INIT_DETECTIONS)`. Approving a component in the Workspace canvas modifies only local component state; when the user navigates to the Takeoff Review page, those changes are lost.
3. **Persistence Mechanism Scattered:**
   While `dataService` manages core entity state, other pages maintain isolated mock lifecycles (e.g., `ProjectReportsPage.tsx:114` `INITIAL_HISTORY` export items, `SessionsPage.tsx:121` `handleApproveProposal` empty handler).

**Architecture Score: 4.5 / 10**

---

## 3. DATA LAYER AUDIT

### 3.1 Persistence & Data Flow Analysis

The reactive data layer in `src/services/dataService.ts` provides a centralized store with pub/sub reactivity and custom React hooks (`useProjects`, `useDocuments`, `useTakeoff`, `useLineItems`, `useSheets`, `useSessions`, `useEngineStatus`).

```typescript
// src/services/dataService.ts
const STORAGE_KEY_PREFIX = "vectoris.store.v1.";
```

### 3.2 Critical Data Layer Limitations
1. **`localStorage` is Structurally Unsuitable for Workstation Workloads:**
   - **Quota Limits:** Browser `localStorage` is restricted to ~5–10 MB total. A single multipage vector PDF or DWG exceeds this limit.
   - **Main-Thread Blocking:** `JSON.stringify` and `JSON.parse` operations on large arrays execute synchronously on the main thread, introducing UI stutter.
   - **No Binary Storage:** Cannot store raw drawing binary data, vector tiles, spatial indexes, or raster thumbnails.
   - **No Transactional Integrity or Migration:** If a user modifies data during an unexpected window close or script crash, state corruption can occur without rollback capability.
2. **Entity Relationship Integrity:**
   - `Project` ↔ `Document` ↔ `Sheet` ↔ `LineItem` relationships are maintained via string ID foreign keys (`project_id`, `source_document_id`, `sheet_id`).
   - Deleting a project or document does not cascade-delete orphaned line items or detections in `localStorage`.

**Data Layer Score: 4.0 / 10**

---

## 4. FILE INGESTION AUDIT

### 4.1 Document Lifecycle Trace

```
User Action: Drops file onto dropzone OR clicks "Upload Files" / "browse"
  ↓
[fileDialogService.ts:88] selectFiles() creates dynamic <input type="file"> in DOM
  ↓
[fileDialogService.ts:50] parseFileMetadata() checks extension against PDF/DWG/DXF/BIM/TIFF/Excel & size <= 500MB
  ↓
[ProjectDocumentsPage.tsx:88] Calls dataService.addDocuments(projectId, result.validFiles)
  ↓
[dataService.ts:170] ProjectDocument created:
    - id: "d_1724608000000_0"
    - upload_status: "queued"
    - size_mb: 2.4
    - file_path: undefined (DOM File does not expose OS path)
    - raw_file: File object (discarded during JSON.stringify to localStorage)
  ↓
UI Update: Document appears in table with "Queued" badge
  ↓
Future Processing Boundary: DEAD END
```

### 4.2 Forensic Ingestion Finding
- **File Bytes Are Lost:** The actual `File` buffer is never stored, never saved to disk, and never transferred to Rust.
- **File Path Is `undefined`:** Because `fileDialogService` uses DOM `<input type="file">`, `file.path` is blocked by browser security sandboxing.
- **Consequence:** After closing the file picker, Vectoris retains only the string name (`"E-101_LightingPlan.pdf"`) and file size in `localStorage`. When the app is restarted or when a processing engine is introduced, **it is impossible to read, render, or extract features from these files because the data does not exist in storage.**

**File Pipeline Score: 2.5 / 10**

---

## 5. TAURI / RUST AUDIT

### 5.1 Native Backend Inspection (`src-tauri/`)

- **Tauri Framework:** Tauri v2.11.3 (`Cargo.toml:24`)
- **Registered Commands:** Exactly two commands exist in `src-tauri/src/lib.rs`:
  1. `get_engine_status`: Returns static JSON struct (`status: "standby"`, `core_connected: false`).
  2. `get_platform_info`: Returns OS, architecture, and version string.
- **Capabilities & Permissions:** `src-tauri/capabilities/default.json` enables standard window operations (`allow-close`, `allow-minimize`, `allow-maximize`, `allow-toggle-maximize`, `allow-is-maximized`).
- **Plugins:** Only `tauri-plugin-log` is configured.
- **Native vs. Browser Breakdown:**
  - *Genuinely Native:* Frameless desktop window management (minimize, maximize, close, window resize events, OS drag region) via `@tauri-apps/api/window`.
  - *Simulated Native:* Local inference engine, sheet indexing telemetry, drawing storage path (`~/.vectoris/workspaces/apex-eng`), file dialogs, and document ingestion.

```rust
// src-tauri/src/lib.rs:22-33
#[tauri::command]
fn get_engine_status() -> EngineStatusResponse {
    EngineStatusResponse {
        status: "standby".to_string(),
        message: "Desktop shell active · Local inference engine in standby".to_string(),
        is_tauri: true,
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        core_connected: false,
    }
}
```

**Tauri Score: 4.0 / 10**  
**Rust Score: 2.0 / 10**

---

## 6. SECURITY AUDIT

### 6.1 Content Security Policy (CSP) Inspection

Configured in `src-tauri/tauri.conf.json:28`:
```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob:;
connect-src 'self' http://localhost:5173 ws://localhost:5173 ipc:;
frame-src 'none';
object-src 'none';
base-uri 'self';
```

### 6.2 Security Vulnerability Matrix

| Area | Status | Risk Level | Evidence & Analysis |
|---|---|---|---|
| **CSP Enforcement** | Active | Low | Restricts script execution to `'self'`, disables `object-src` and `frame-src`. |
| **Inline Styles** | Permissive | Low–Medium | `style-src 'unsafe-inline'` required for dynamic CSS variables and inline styles. |
| **External CDNs** | Permissive | Medium | Connects to `fonts.googleapis.com` and `fonts.gstatic.com`. A confidential engineering tool should bundle fonts locally (`@fontsource/urbanist`, `@fontsource/ibm-plex-mono`). |
| **Dev Endpoints in CSP** | Present | Low | `connect-src` includes `http://localhost:5173` and `ws://localhost:5173` (Vite dev server). |
| **IPC Injection** | Secure | Low | Only two harmless query commands registered in Rust. No arbitrary command execution or shell spawning exposed. |
| **File System Traversal** | Secure | Low | Tauri filesystem plugin is not installed; frontend cannot read arbitrary local OS files. |
| **Secrets in Bundles** | Clean | Low | No hardcoded API keys, tokens, or private credentials found in frontend source. |

**Security Score: 6.5 / 10**

---

## 7. FRONTEND CODE QUALITY

### 7.1 Component Metric Inventory

| File | Line Count | Size | Complexity Assessment |
|---|---|---|---|
| `src/styles/global.css` | 9,856 lines | 247.8 KB | Extreme monolith. All page and component styles merged into one file. |
| `src/pages/SettingsPage.tsx` | 1,265 lines | 54.1 KB | God page. 11 configuration sub-panels implemented in a single file. |
| `src/pages/ProjectOverviewPage.tsx` | 910 lines | 39.3 KB | Large hub component with multiple nested sub-tabs. |
| `src/pages/ProjectWorkspacePage.tsx` | 768 lines | 50.1 KB | Contains embedded SVG drawing canvas, local toolbar, and layer controls. |
| `src/components/CreateProjectModal.tsx` | 693 lines | 27.5 KB | 4-step wizard with extensive inline form markup. |
| `src/pages/ProjectTakeoffPage.tsx` | 674 lines | 29.4 KB | Takeoff ledger review table, modal, and drawer. |
| `src/pages/SessionsPage.tsx` | 672 lines | 27.9 KB | Chat thread, reasoning trace blocks, and proposal cards. |
| `src/pages/AuthPage.tsx` | 598 lines | 23.6 KB | Form validation, tab sliding pill, and offline checks. |
| `src/pages/ProjectDocumentsPage.tsx` | 528 lines | 18.9 KB | Dropzone, upload list, and status icons. |
| `src/pages/DashboardPage.tsx` | 482 lines | 20.8 KB | KPI cards, activity feed, and viewport container. |

### 7.2 Code Quality Deficiencies
1. **Duplicate Inline SVG Icons:** Over 60 custom inline SVG icon functions are declared repeatedly across page files rather than imported from a shared icon library.
2. **God Component Pattern:** `SettingsPage.tsx` manages 11 tabs, 15 state variables, and dozens of sub-renderers in one file.
3. **Dead / Inert Handlers:**
   - `SessionsPage.tsx:121` `handleApproveProposal` is an empty stub.
   - `ProjectReportsPage.tsx:130` `handleGenerateExport` simulates an export via `setTimeout` without file generation.

**Frontend Code Quality Score: 5.5 / 10**

---

## 8. REACT & STATE MANAGEMENT AUDIT

1. **Pub/Sub Reactivity in `DataService`:** Custom hooks in `src/services/dataService.ts:468-607` subscribe to data store changes via `useEffect` and clean up subscriptions properly.
2. **Missing Async Timer Cleanups in Click Handlers:** In `ProjectReportsPage.tsx:132` and `AuthPage.tsx:254`, `setTimeout` is invoked inside event callbacks without storing the timer ID in a ref. If the user navigates away before the timeout expires, `setState` is called on an unmounted component.
3. **URL Search Parameter Parsing in Render Body:** Several components call `new URLSearchParams(window.location.search)` directly inside the render loop rather than inside `useMemo` or a routing hook.

**React Quality Score: 5.5 / 10**

---

## 9. UI / UX AUDIT (DESKTOP WORKSTATION PERSPECTIVE)

- **Desktop Authenticity (7.5/10):** The frameless title bar (`DesktopTitleBar.tsx`), OS drag regions, window controls, and technical typography (`IBM Plex Mono` for coordinates, dimensions, and sheet IDs) provide an authentic workstation feel.
- **Information Hierarchy & Density (8.0/10):** High data density suitable for estimators. Clear separation between global navigation (left rail) and project context (sub-tabs).
- **Component Consistency (7.5/10):** Cohesive dark cherry/coffee bean palette in dark mode, greige/alabaster in light mode. Tokens are consistently referenced via CSS variables (`--app-bg`, `--app-surface-1`, `--app-accent`).
- **Popover Layering & Modals (7.0/10):**
  - Popovers (`OrgSwitcherPopover.tsx`, `NotificationsPopover.tsx`, `UserProfileMenu.tsx`) use `createPortal` and dynamic bounding-box coordinate tracking.
  - Modals (`CreateProjectModal.tsx`, `GlobalCommandSearch.tsx`) render high in the z-index stack (`z-index: 1000`).
- **Interactive Chrome Gaps (4.0/10):**
  - Search bar in `AppShell.tsx:198` is `readOnly` (clicking opens the ⌘K modal, but direct typing into the header input is blocked).
  - Several actions simulate progress bars or export downloads without executing backend tasks.

**UX Score: 7.0 / 10**  
**Desktop Authenticity: 7.5 / 10**

---

## 10. MOTION & ANIMATION AUDIT

1. **Liquid Wave Dark/Light Theme Transition:**
   - Implemented in `src/components/DesktopTitleBar.tsx:178-230`.
   - Utilizes native `document.startViewTransition()` combined with the Web Animations API on `::view-transition-new(root)`.
   - Generates 36 cubic Bézier spline keyframes along a 1,500 ms timeline to animate an organic water-wave clip path originating from the top-right theme button across the viewport.
   - **Interruption & Reduced Motion Handling:** Gated with `(prefers-reduced-motion: reduce)`. If reduced motion is requested or View Transitions are unsupported, theme switching executes instantaneously without animation.
2. **Card Tilt Interaction:**
   - `src/components/ProjectCard.tsx:75-120` implements 3D cursor tilt with glare reflection using CSS variables (`--tilt-rx`, `--tilt-ry`, `--tilt-gx`).
   - Properly disabled under `prefers-reduced-motion` and touch devices.
3. **Motion Dependency:**
   - `motion` (v13.1.1) is installed in `package.json` and used in `src/components/KPICard.tsx:15` for a spring count-up number animation.

**Motion Score: 8.0 / 10**

---

## 11. ACCESSIBILITY AUDIT

- **Keyboard Navigation:**
  - `⌘K` / `Ctrl+K`: Global shortcut to toggle `GlobalCommandSearch.tsx`.
  - Arrow keys (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) supported in search results, project creation modal, and popover menus.
  - Workspace shortcuts (`F` for fit, `M` for measure, `Escape` to deselect, `+`/`-` to zoom) in `ProjectWorkspacePage.tsx:119`.
- **ARIA Semantics:**
  - Modals declare `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  - Popovers declare `role="dialog"` or `role="menu"`.
  - Progress bars declare `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- **Accessibility Deficiencies:**
  - Focus traps are missing in `CreateProjectModal` and `GlobalCommandSearch` (tabbing can cycle out into the background).
  - Focus restoration to the triggering button upon closing modals is not uniformly implemented.

**Accessibility Score: 6.5 / 10**

---

## 12. PERFORMANCE AUDIT

### Production Build & Bundle Metrics

Running `npm run build` (`tsc -b && vite build`):

```
dist/index.html                   0.85 kB │ gzip:   0.49 kB
dist/assets/index-DtejnYCW.css  174.12 kB │ gzip:  26.54 kB
dist/assets/core-DhEqZVGG.js      2.44 kB │ gzip:   0.98 kB
dist/assets/window-B1zSvOyk.js   15.21 kB │ gzip:   3.85 kB
dist/assets/index-3NjoboPk.js   502.95 kB │ gzip: 135.65 kB
```

### Performance Bottlenecks
1. **Large Monolithic Bundle (502.95 kB JS):** Vite issues a warning that the entry chunk exceeds 500 kB. There is zero route-based code splitting (`React.lazy` / `import()`). All 10 pages and 14 components are bundled into a single JavaScript file.
2. **CSS Payload (174.12 kB minified):** `global.css` is loaded upfront on every page load.
3. **Full Page Reloads:** Because navigation resets `window.location.href`, browser cache revalidates and the 502 kB script is re-executed on every tab change.

**Performance Score: 5.0 / 10**

---

## 13. DEPENDENCY AUDIT

### Dependencies Evaluation

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2.11.1",
    "motion": "^13.1.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.11.4",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.1.0"
  }
}
```

| Dependency | Required? | Usage in Repository | Assessment |
|---|---|---|---|
| `@tauri-apps/api` | Yes | Window minimize/maximize/close, IPC invoke in services | Required native boundary. |
| `motion` | Questionable | Imported only in `KPICard.tsx:15` (`useInView`, `useSpring`) | Heavy dependency for a single count-up number animation. |
| `react` / `react-dom` (v19.1) | Yes | Core frontend UI runtime | Modern baseline. |
| `tauri` (v2.11.3) / `cli` | Yes | Desktop application container | Core workstation shell. |
| `tauri-plugin-log` | Yes | Native system logging | Good practice. |

---

## 14. DOCUMENTATION DRIFT AUDIT

| Documentation Claim | Location | Status in Code | Evidence & Code Reality |
|---|---|---|---|
| **Metadata DB: Supabase / PostgreSQL** | `TECH_STACK.md:20` (`LOCKED`) | **MISSING** | No `@supabase/supabase-js` installed. All persistence is in browser `localStorage`. |
| **Authentication: Supabase Auth** | `TECH_STACK.md:21` (`LOCKED`) | **STUB** | `AuthPage.tsx:257` explicitly displays: *"Supabase Auth is not connected in this frontend build yet."* |
| **Background Jobs: Redis + Celery** | `TECH_STACK.md:23` (`LOCKED`) | **MISSING** | No Python/Celery backend exists in repository. |
| **Drawing Viewer: PDF.js + React-Konva** | `TECH_STACK.md:26-27` | **MISSING** | Neither PDF.js nor Konva installed. Workspace uses a static hardcoded SVG element. |
| **UI Components: ReactBits, Bklit UI, assistant-ui, Driver.js** | `TECH_STACK.md:35-53` (`LOCKED`) | **MISSING** | Hand-rolled custom React components; no third-party UI package dependencies installed. |
| **Local Perception & AI Brain Engine** | `AI_SYSTEM.md` (`LOCKED`) | **MOCK** | Sessions chat responses and detection coordinates are static mock datasets. |
| **Local Core Engine Process** | `AppShell.tsx:162` | **STUB** | Rust command returns static `"status": "standby"`. No local daemon or inference subprocess. |
| **Export Engine (XLSX, CSV, JSON, PDF)** | `EXPORT.md` (`LOCKED`) | **MOCK** | `ProjectReportsPage.tsx:132` uses `setTimeout` to push a fake history entry. No files generated or downloaded. |

**Documentation Alignment Score: 2.5 / 10**

---

## 15. PRODUCT REALITY AUDIT

### "If an electrical estimator opens this application today, what can they actually do?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT REALITY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACTUALLY WORKS:                                                             │
│ • Launch frameless desktop application on Windows                           │
│ • Minimize, maximize, restore, close window via custom title bar            │
│ • Toggle Dark / Light theme with liquid wave animation                      │
│ • Create a new project via 4-step wizard (persists to localStorage)         │
│ • Browse project library with status & sector filtering                     │
│ • Open ⌘K global quick search palette to search projects, docs, sessions    │
│ • Select files in file picker (captures filename & format in localStorage)  │
│ • Review takeoff line items table & toggle status (Approve / Reject)       │
│ • View honest engine diagnostics dialog explaining standby state            │
├─────────────────────────────────────────────────────────────────────────────┤
│ PARTIALLY WORKS:                                                            │
│ • Document list (shows filename, size, queued status; file bytes missing)   │
│ • Settings configuration (theme & local engine toggles save to localStorage)│
│ • AI Chat sessions (records user message to localStorage; no AI response)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ UI ONLY / SIMULATED:                                                        │
│ • Drawing workspace canvas (hardcoded SVG illustration, not your blueprint) │
│ • Workspace layer toggles (filters local SVG elements, not real CAD layers) │
│ • Export BOQ report (triggers 1-second timer, creates fake history row)     │
│ • Auth login / signup (validates form fields, shows honest notice)          │
│ • Telemetry badges ("436 sheets indexed", "Local Ready")                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ COMPLETELY MISSING:                                                         │
│ • Actual PDF / DWG / BIM blueprint parsing and rendering                    │
│ • Computer vision / AI symbol detection (lights, panels, conduit, tray)     │
│ • Linear measurement on real drawings                                       │
│ • Real Excel / CSV / PDF export generation and file save dialog             │
│ • Backend synchronization / User authentication / Multi-user collaboration  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Production Readiness Score: 2.0 / 10**

---

## 16. INSTALLER & DISTRIBUTION AUDIT

- **Bundle Targets:** `["nsis", "msi"]` (`src-tauri/tauri.conf.json`)
- **Product Identifier:** `ai.vectoris.workstation`
- **Installation Mode:** `currentUser` (installs into `%LOCALAPPDATA%\Programs\Vectoris`, no administrator privileges required).
- **Target Architecture:** `x86_64-pc-windows-gnu` via MinGW toolchain helper (`scripts/tauri.js`).
- **Distribution Limitations:**
  - **Code Signing:** No Authenticode certificate configured (Windows SmartScreen will alert on launch).
  - **Auto-Updater:** `@tauri-apps/plugin-updater` not configured.
  - **Embedded Runtimes:** No Python / ONNX runtime sidecar configured in `externalBin`.

**Distribution Readiness Score: 4.5 / 10**

---

## 17. TESTING AUDIT

| Test Category | Framework | Existing Tests | Status |
|---|---|---|---|
| **Unit Tests** | None (Vitest/Jest missing) | 0 tests | **MISSING** |
| **Component Tests** | None (RTL missing) | 0 tests | **MISSING** |
| **Integration Tests** | None | 0 tests | **MISSING** |
| **E2E Tests** | None (Playwright missing) | 0 tests | **MISSING** |
| **Rust Unit Tests** | `cargo test` | 0 tests (`#[test]` absent in `lib.rs`) | **MISSING** |
| **Static Type Checking** | TypeScript (`tsc --noEmit`) | Passes (0 errors) | **ACTIVE** |

**Testing Score: 1.0 / 10**

---

## 18. GIT & REPOSITORY HYGIENE

- **`.gitignore`:** Properly ignores `node_modules/`, `dist/`, `src-tauri/target/`, `*.log`, `.env*`.
- **Local Logs in Working Tree:** `vectoris-vite.out.log` and `vectoris-vite.err.log` are present in root.
- **Untracked Skills:** 7 skill folders in `.agents/skills/` (`backend-patterns`, `code-review`, `receiving-code-review`, `requesting-code-review`, `rust-best-practices`, `tauri-v2`, `writing-plans`) are untracked in git.

---

## 19. SKILL ALIGNMENT AUDIT

| Skill | Documented Expectation | Repository Compliance |
|---|---|---|
| `apple-design` & `emil-design-eng` | Subtle micro-interactions, solid engineering surfaces, 0.97 active press scale | **HIGH:** Implemented in cards, titlebar, and buttons. |
| `transitions-dev` | Motion tokens, sliding tab indicators, modal scale transitions | **HIGH:** Applied in `DesktopTitleBar`, `CreateProjectModal`, `AuthPage`. |
| `tauri-v2` | Rust IPC commands, capabilities, scoped permissions | **LOW:** Only 2 basic commands implemented; file and dialog plugins absent. |
| `backend-patterns` | Clean API design, database connection pooling, service boundary | **N/A:** No backend implemented yet. |
| `rust-best-practices` | Error handling with Result types, memory efficiency | **LOW:** Bare scaffold with minimal Rust code. |

---

## 20. SCORECARD

| Dimension | Score / 10 | Reason |
|---|---:|---|
| **Architecture** | 4.5 / 10 | Clean UI layout, but broken SPA navigation (page reloads) and dual takeoff state. |
| **Frontend UI Craft** | 7.5 / 10 | Polished desktop aesthetics, theme transitions, high data density. |
| **React & State Quality** | 5.5 / 10 | Solid hooks in `dataService`, but god components and timer leaks in handlers. |
| **Data Layer** | 4.0 / 10 | Unified `dataService` introduced, but `localStorage` is unfit for CAD drawings. |
| **File Ingestion Pipeline** | 2.5 / 10 | Captures filename metadata only; file bytes and OS paths are discarded. |
| **Tauri Desktop Shell** | 4.0 / 10 | Real window controls & installer config, but no native file/engine commands. |
| **Rust Backend** | 2.0 / 10 | Only 61 lines of code returning static structs. |
| **Security** | 6.5 / 10 | Solid baseline CSP, no secrets exposed, external CDN font dependency. |
| **UX & Ergonomics** | 7.0 / 10 | Authentic workstation feel, ⌘K command palette, honest diagnostics dialog. |
| **Desktop Authenticity** | 7.5 / 10 | Custom title bar, drag regions, technical typography (`IBM Plex Mono`). |
| **Accessibility** | 6.5 / 10 | Keyboard shortcuts and ARIA semantics present; focus traps missing in modals. |
| **Motion & Animation** | 8.0 / 10 | Liquid wave theme transition, 3D card tilt, reduced-motion discipline. |
| **Performance** | 5.0 / 10 | 502 kB un-split JS bundle, 247 kB monolithic CSS, full reloads on route changes. |
| **Testing** | 1.0 / 10 | Zero unit, component, E2E, or Rust tests. Only `tsc` typecheck exists. |
| **Documentation Alignment**| 2.5 / 10 | Severe drift. Docs describe a full AI/backend stack that does not exist. |
| **Distribution Readiness** | 4.5 / 10 | NSIS/MSI configured, but no code signing or auto-updater. |
| **Production Readiness** | 2.0 / 10 | Click-through prototype; cannot perform real takeoff or save drawing files. |

### Overall Repository Score: 4.8 / 10

---

## 21. CRITICAL FINDINGS

### Finding 1 [P0 — Blocker]: File Ingestion Discards File Bytes & Path
- **File:** `src/services/fileDialogService.ts:88-146` & `src/services/dataService.ts:160-195`
- **Problem:** Files are selected via a DOM `<input type="file">`. The resulting `File` object has no `file_path` (blocked by browser sandboxing), and the raw file buffer is dropped when metadata is serialized to `localStorage`.
- **Why It Matters:** The entire product is predicated on analyzing electrical drawings. Vectoris currently stores only the string `"filename.pdf"`. It is impossible to render, process, or detect symbols from uploaded drawings.
- **Recommended Direction:** Install `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs`. In Tauri desktop mode, open the native OS file picker, capture the true OS filesystem path, copy/store the file into the local application data directory (`%LOCALAPPDATA%/Vectoris/projects/...`), and store the canonical file URI in a local database.

---

### Finding 2 [P0 — Blocker]: Full Page Reload on Route Transitions Destroys SPA Model
- **File:** `src/app/App.tsx:37, 92-115`, `src/pages/ProjectsPage.tsx:105`, `src/components/CreateProjectModal.tsx:211`
- **Problem:** Every internal link uses `window.location.href = ...` or `<a href="...">`. `App.tsx` reads `window.location.pathname` once on mount without React state or history listening.
- **Why It Matters:** Every navigation triggers a full browser page refresh. In-memory state, drawing zoom/pan positions, active websocket/engine connections, and background tasks are terminated on every tab switch.
- **Recommended Direction:** Introduce a client-side routing seam (React state-based route dispatcher with `history.pushState` / `popstate` listener or lightweight router) so tab and page transitions occur instantly without unmounting the desktop shell.

---

### Finding 3 [P1 — Critical]: Takeoff State Disconnect Between Workspace and Review Ledger
- **File:** `src/pages/ProjectWorkspacePage.tsx:54-70, 96` vs. `src/pages/ProjectTakeoffPage.tsx:46`
- **Problem:** `ProjectWorkspacePage` maintains its own hardcoded `TAKEOFF_ITEMS` dictionary and local `useState` detections, completely disconnected from `dataService.getLineItems` used by `ProjectTakeoffPage`.
- **Why It Matters:** Approving or editing detections in the Drawing Workspace does not update the Takeoff review table or BOQ export.
- **Recommended Direction:** Connect `ProjectWorkspacePage` directly to `useLineItems(projectId)` and `dataService.updateLineItemStatus()`.

---

### Finding 4 [P1 — Critical]: `localStorage` Is Unfit for Desktop CAD Workloads
- **File:** `src/services/dataService.ts:36-54`
- **Problem:** All entities are serialized as JSON strings in browser `localStorage`.
- **Why It Matters:** `localStorage` has a hard 5–10 MB limit, executes synchronously on the UI thread, cannot store binary CAD files or spatial bounding-box indexes, and lacks transaction rollback.
- **Recommended Direction:** Replace `localStorage` with a local SQLite database (via `tauri-plugin-sql` or SQLite embedded in Rust) with an asynchronous IPC service layer.

---

### Finding 5 [P1 — Critical]: No Real Drawing Rendering Engine (Static SVG Placeholder)
- **File:** `src/pages/ProjectWorkspacePage.tsx:400-580` & `src/components/BlueprintViewport.tsx:73-116`
- **Problem:** Drawing viewports render static hand-coded SVG polygons and polylines. No rendering engine exists for PDF or DWG drawings.
- **Why It Matters:** Electrical estimators cannot load or inspect real project drawings.
- **Recommended Direction:** Integrate PDF.js (with HTML5 Canvas / WebGL tile rendering) to render multipage vector engineering PDFs.

---

### Finding 6 [P2 — Important]: Broken Route Link in `BlueprintViewport`
- **File:** `src/components/BlueprintViewport.tsx:62`
- **Problem:** CTA button uses `<a href="/workspace">`. `/workspace` is not registered in `App.tsx` and drops the user to `AuthPage`.
- **Why It Matters:** Breaks navigation from the Dashboard to the active project workspace.
- **Recommended Direction:** Update link to `/project/p1/workspace` or dynamically inject active project ID.

---

### Finding 7 [P2 — Important]: 9,856-Line Monolithic CSS & 502 kB JS Bundle Without Code Splitting
- **File:** `src/styles/global.css` & `src/pages/SettingsPage.tsx`
- **Problem:** Single monolithic CSS file (247 KB) and all pages bundled into one 502 kB JS chunk.
- **Why It Matters:** Exceeds recommended chunk limits, increases initial parse time, and makes CSS maintainability difficult.
- **Recommended Direction:** Split `SettingsPage` into tab components and implement `React.lazy()` dynamic imports for route pages.

---

## 22. WHAT IS ACTUALLY GOOD (PRESERVE THESE DECISIONS)

1. **Design System & Visual Craft:** The UI typography (`Urbanist` + `IBM Plex Mono`), color palettes (Coffee Bean / Dark Cherry and Greige / Alabaster), and tokenized design system look exceptional and feel like a modern engineering tool.
2. **Desktop Frameless Frame:** The custom window title bar with integrated drag region, window minimize/maximize/close controls, and status pill is well-engineered.
3. **Liquid Wave Theme Transition:** The View Transition API + Web Animations API 36-keyframe liquid wave transition in `DesktopTitleBar.tsx` is creative, smooth, and includes comprehensive `prefers-reduced-motion` fallbacks.
4. **Domain Types & Provenance Model:** The entity definitions in `src/data/types.ts` (`TypeProvenance: "ai_inferred" | "user_provided" | "verified"`, `LineItemStatus: "proposed" | "approved" | "rejected"`, `CorrectionRecord`) accurately capture the required auditability data model.
5. **Honest Stubs over Fake Success:** When features are not yet connected (e.g., Supabase Auth on `AuthPage`, engine diagnostics on `EngineStatusDialog`), the UI honestly informs the user rather than faking mock success.
6. **Command Palette Ergonomics:** `GlobalCommandSearch.tsx` (⌘K) provides keyboard navigation, fuzzy matching, and clean categorization.

---

## 23. WHAT SHOULD NOT BE BUILT YET

1. **AI Brain / LLM Multi-Agent Reasoning Runtime (`docs/04_AI/*`):** Do not build multi-step agent control loops, tool invocation systems, or thought traces while there is no real drawing document pipeline to feed them.
2. **Model Fine-Tuning & Dataset Pipeline (`docs/04_AI/TRAINING.md`):** Premature before real human correction events on real drawings exist.
3. **Supabase Multi-Tenant Cloud Sync (`docs/03_ARCHITECTURE/TECH_STACK.md`):** Vectoris must first prove local file storage and offline desktop takeoff before adding cloud synchronization complexity.
4. **Configure-Price-Quote (CPQ) & Commercial Estimation:** Out of scope per `MVP_BOUNDARY.md:41`.
5. **Live Multi-User Collaboration & Presence:** Unnecessary until the single-user local workstation lifecycle is complete.

---

## 24. CORRECT NEXT BUILD ORDER

```
Phase 1: SPA Router & Navigation Seam Fix
  Goal: Eliminate full page reloads and fix broken routes.
  Why Now: Blocks in-memory state persistence and smooth desktop navigation.
  Files Affected: src/app/App.tsx, src/components/AppShell.tsx, src/components/BlueprintViewport.tsx
  Acceptance Criteria: Tab and page navigation occurs instantly without page refresh; active state preserved.
  Do NOT Build Yet: Backend APIs or cloud auth.
      ↓
Phase 2: Native Desktop File Storage Pipeline (Tauri v2)
  Goal: Capture real OS drawing files and persist them to local disk.
  Why Now: Ingestion currently drops all file bytes and paths.
  Files Affected: src-tauri/Cargo.toml, src-tauri/src/lib.rs, src/services/fileDialogService.ts, src/services/dataService.ts
  Acceptance Criteria: User selects PDF/DWG; file is copied to app data folder; absolute URI is stored in local SQLite.
  Do NOT Build Yet: Cloud file upload.
      ↓
Phase 3: Real PDF & Vector Blueprint Canvas
  Goal: Render real multipage engineering drawings in Drawing Workspace.
  Why Now: Replaces static SVG mockup with real blueprint viewing.
  Files Affected: src/pages/ProjectWorkspacePage.tsx, package.json (add pdfjs-dist), new Canvas viewport component
  Acceptance Criteria: Multipage PDF renders with pan, zoom, fit, and sheet selection.
  Do NOT Build Yet: Automated AI detection models.
      ↓
Phase 4: Unified Takeoff Review & Workspace Integration
  Goal: Single source of truth for detections and line items.
  Why Now: Resolves the state disconnect between Workspace canvas and Takeoff Review table.
  Files Affected: src/pages/ProjectWorkspacePage.tsx, src/pages/ProjectTakeoffPage.tsx, src/services/dataService.ts
  Acceptance Criteria: Approving/rejecting a component in Workspace canvas immediately updates Takeoff ledger.
  Do NOT Build Yet: Automated pricing.
      ↓
Phase 5: Real Export Generation (XLSX / CSV / PDF)
  Goal: Generate real downloadable BOQ spreadsheets and PDF summaries.
  Why Now: Provides immediate utility to estimators even before AI detection is added.
  Files Affected: src/pages/ProjectReportsPage.tsx, src/services/exportService.ts
  Acceptance Criteria: Clicking "Export XLSX" downloads a formatted Excel sheet with verified line items.
  Do NOT Build Yet: Complex ERP connectors.
      ↓
Phase 6: Local Perception / OCR / Symbol Detection Spike
  Goal: First real automated component count on vector PDF drawings.
  Why Now: Foundations (files, rendering, takeoff ledger) are now ready to receive detections.
  Files Affected: src-tauri/src/, Python inference subprocess or ONNX Runtime bindings
  Acceptance Criteria: AI detects symbols (e.g. lighting fixtures), returns bounding boxes, and populates Proposed items.
```

---

## 25. FINAL VERDICT

1. **What percentage of the documented product is actually implemented?**  
   **~15%**. The navigation structure and design tokens exist; backend, AI, real document ingestion, and drawing rendering are not yet built.
2. **What percentage of the current UI is functional rather than decorative?**  
   **~40%**. Window controls, theme switching, project creation, command search, and takeoff table status toggling work; blueprint canvases, AI chat responses, and export generation are visual simulations.
3. **What is the biggest architectural risk?**  
   **Using `localStorage` for CAD drawing data and executing full page reloads on every route transition.**
4. **What is the biggest security risk?**  
   **External CDN dependencies for fonts (`fonts.googleapis.com`) in an air-gapped/confidential desktop tool.** (No critical code execution risks exist).
5. **What is the biggest UX problem?**  
   **The drawing canvas in the workspace is a hardcoded SVG demo that does not display the user's uploaded drawings.**
6. **What is the biggest code-quality problem?**  
   **Monolithic 9,856-line `global.css` and 1,265-line `SettingsPage.tsx` with hundreds of duplicated inline SVGs.**
7. **What is the biggest documentation drift?**  
   **Docs label Supabase, Redis/Celery, and full Agentic AI as "LOCKED" MVP components, while none exist in code.**
8. **What is the most important thing to build next?**  
   **A real Tauri v2 file storage pipeline + PDF.js drawing canvas to ingest and view real engineering drawings.**
9. **What should NOT be built next?**  
   **AI Brain multi-agent reasoning, cloud synchronization, or model fine-tuning pipelines.**
10. **Is the repository safe to continue building on?**  
    **Yes.** The UI design system, desktop titlebar, and domain type foundations are solid and should be preserved.
11. **What must be fixed before adding more features?**  
    **Convert routing to a proper SPA (stop `window.location.href` reloads) and wire native file selection to save real drawing bytes to disk.**
12. **If you were the lead engineer, what would you do during the next 2 weeks?**  
    - *Week 1:* Convert router to SPA navigation, install `@tauri-apps/plugin-dialog` + `tauri-plugin-fs`, and store uploaded PDF files in the local app directory.
    - *Week 2:* Integrate `pdfjs-dist` to render real PDF drawings in `ProjectWorkspacePage`, connect detections directly to `dataService`, and wire real XLSX export generation.

---

# VECTORIS — CURRENT STATE

**REAL:**  
- Frameless Tauri v2 desktop window management (minimize, maximize, close, window resize events, OS drag region)
- Liquid wave theme transition (View Transition API + Web Animations API keyframes with reduced-motion fallback)
- Consolidated reactive data service (`dataService.ts`) with custom React hooks
- Project creation wizard (4 steps, input validation, persists to `localStorage`)
- Global command search palette (⌘K, keyboard navigation, filters projects/docs/sessions)
- Takeoff ledger review table (status filtering, approve/reject state toggling, audit history)
- Canonical TypeScript domain models with provenance tracking (`types.ts`)
- Honest diagnostics and stub notices (no fake success states)

**PARTIAL:**  
- Document upload list (captures filename and format metadata into `localStorage`, but discards file bytes)
- Settings configuration (appearance and engine toggles persist; cloud/storage configurations are static UI)
- AI chat interface (records user messages into `localStorage`; no AI assistant response generation)
- Installer configuration (NSIS and MSI target configs present; signing and auto-updates missing)

**MOCK/STUB:**  
- Drawing Workspace canvas (`BlueprintViewport.tsx` & `ProjectWorkspacePage.tsx` render hardcoded demo SVGs)
- Workspace layer toggles (filters local SVG elements, not real CAD drawing layers)
- Export BOQ reports (`ProjectReportsPage.tsx` simulates generation via `setTimeout`)
- Local engine status (Tauri command returns static `"status": "standby"`)
- Authentication flow (`AuthPage.tsx` form validations work, displays honest unintegrated notice)

**MISSING:**  
- Real PDF / DWG / BIM blueprint parsing and canvas rendering (no PDF.js or Konva)
- Local filesystem storage of uploaded drawing packages
- Computer vision / AI symbol detection and line item counting
- Real XLSX / CSV / PDF export generation
- SQLite database / persistent local storage engine
- Backend API / Supabase authentication / Redis-Celery queues
- Unit, component, integration, and E2E test suites

**TOP 5 PRIORITIES:**  
1. Convert navigation to client-side SPA routing (eliminate `window.location.href` full page reloads).
2. Implement native Tauri v2 file dialog & local filesystem persistence for drawing packages.
3. Integrate PDF.js to render real multipage drawings in the Drawing Workspace canvas.
4. Unify the Drawing Workspace detections state with the canonical `dataService` Takeoff ledger.
5. Implement real XLSX/CSV BOQ export generation.

**DO NOT BUILD YET:**  
- Multi-agent AI Brain runtime & tool execution loops
- Cloud synchronization & Supabase multi-tenancy
- Model fine-tuning & evaluation pipelines
- Configure-Price-Quote (CPQ) & material pricing engines
- Live multi-user collaboration & presence

**OVERALL SCORE: 4.8 / 10**

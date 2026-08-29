# Vectoris — UX & Product Interactivity Walkthrough
**User-Centric Guided Verification Document**
**Date:** August 2026

---

## 1. Overview & Core Philosophy

Vectoris transforms engineering estimation from a collection of isolated views into an **active, guided engineering workstation**.

```
    EMPTY STATE
        ↓
    USER UNDERSTANDS WHAT VECTORIS DOES
        ↓
    USER KNOWS WHAT TO DO NEXT
        ↓
    USER TAKES ACTION
        ↓
    PRODUCT RESPONDS TO ACTION
        ↓
    NEXT ACTION BECOMES OBVIOUS
```

Every page now follows strict zero-fabrication guarantees: when no project or drawing data exists, intelligent workstation hubs explain the required inputs and provide immediate actions (`+ Create Project`, `⚡ Load Sample Hyperscale Project`, `Upload Drawings`, `Add Manual Item`).

---

## 2. Interactive Page-by-Page Walkthrough

### 2.1 First-Run Dashboard (`/dashboard`)
1. **0-Project State:**
   - Instead of a blank canvas with a single button, the user sees the **Engineering Intelligence Workstation Hub**.
   - Dual actions:
     - `+ Create First Project`: Launches the structured project creation dialog.
     - `⚡ Load Sample Hyperscale Project`: Instantly seeds a deterministic, verified Titan 80MW Hyperscale Data Center project with real single-line diagrams, switchboard line items, and schedule sheets.
   - Interactive 4-stage workflow cards demonstrate the end-to-end process:
     - `Stage 1: Container Initialization`
     - `Stage 2: Vector Ingestion`
     - `Stage 3: Takeoff Verification`
     - `Stage 4: Reconciled Execution Plan`
2. **Populated State:**
   - Real KPI metrics computed dynamically from `useAllLineItems()`.
   - Direct `Continue Takeoff Review` or `Continue Processing` buttons on recent project rows.

---

### 2.2 Projects Index (`/projects`)
- **Zero-Project Initializer Hub (`isZeroProjects`):**
  - Clarifies that projects act as isolated security and computation containers for drawings, single-line diagrams, automated takeoff detections, and project plans.
  - Automatically hides empty filter/search dropdowns to eliminate visual noise.
  - Renders the structured **Engineering Projects Initializer Workspace**:
    - `1. Initialize Container`: Define project name, client, and engineering discipline (Data Center, Industrial, Commercial).
    - `2. Ingest Drawings`: Upload multi-page electrical PDFs or AutoCAD DWG/DXF drawings for on-device vector analysis.
    - `3. Verify & Plan`: Inspect detected symbols on the CAD canvas and compile grounded project execution plans.
  - Dual direct CTAs:
    - `[ + Create First Project ]` (opens modal)
    - `[ ⚡ Load Sample Hyperscale Project ]` (calls `dataService.seedSampleProject()`)
- **Populated State (`projectItems.length > 0`):**
  - Information-dense subtitle: `${projectItems.length} active projects across ${clientCount} clients`.
  - Full functional toolbar: Status tabs (`All`, `Processing`, `In Review`, `Completed`), Sector select, Search, and Grid/List toggle.
  - Each project card features a quick `...` dropdown offering:
    - `Project Overview`
    - `Drawing Package`
    - `Takeoff Ledger`
    - `🗑️ Delete Project` (with confirmation modal and full cascading deletion of sheets, line items, and takeoff summaries).

---

### 2.3 Project Overview & Next Best Action (`/project/:id`)
- Prominent **Next Best Action Banner** dynamically computed in real time:
  - **No drawings:** `Upload Drawing Package` -> routes to `/documents`.
  - **Drawings processing:** `Processing N Drawings in Progress` with live spinner -> routes to `/documents`.
  - **Proposed items exist:** `Review N Proposed Takeoff Items` -> routes to `/takeoff`.
  - **Draft plan revision ready:** `Review Project Plan Revision (vX)` -> routes to `/plan`.
  - **Takeoff verified, no plan:** `Generate Grounded Project Plan` -> routes to `/plan`.
  - **Complete:** `Export Reconciled BOQ & Reports` -> routes to `/reports`.

---

### 2.4 Project Documents (`/project/:id/documents`)
- Multi-format ingestion dropzone supporting PDF, AutoCAD DWG/DXF, and BIM formats up to 500MB.
- Real-time pipeline status per file (`Queued` $\rightarrow$ `Ingesting` $\rightarrow$ `Classifying` $\rightarrow$ `Detecting` $\rightarrow$ `Ready`).
- If an error occurs: displays diagnostic error banner and a `↻ Retry Processing` button calling `dataService.retryDocumentProcessing`.
- Direct `Inspect CAD →` button on ready drawings opening the CAD blueprint viewport.

---

### 2.5 Drawing / CAD Workspace (`/project/:id/workspace`)
- Scale-aware measuring tool ($M$), Pan tool, and Select tool.
- Layer visibility toggles (Power Distribution, Lighting, Cable Tray, Mechanical).
- Direct linking between detected symbols, bounding coordinates, and the takeoff ledger.

---

### 2.6 Takeoff Review & Quantity Ledger (`/project/:id/takeoff`)
- **Three-State Verification Model:** Proposed $\rightarrow$ Verified / Rejected.
- **Quantity Correction Editor:**
  - Clicking `✏️ Correct Quantity` allows live inline editing of quantity, unit, and correction reason.
  - Generates immutable audit records (`CorrectionRecord`) logging the user, timestamp, previous value, new value, and rationale.
- **Reconciliation Milestone:**
  - When all proposed candidate detections are reviewed, displays the `Takeoff Review Reconciled` celebration banner with immediate CTAs to `Continue to Project Plan →` and `Export BOQ`.

---

### 2.7 Project Plan Synthesis & Claims (`/project/:id/plan`)
- Grounded claim hierarchy (`Scope & Outcomes`, `Milestones`, `Risks`, `Dependencies`).
- Grounding taxonomy badges (`Known from Evidence`, `Inferred`, `Unresolved`).
- Side-by-side comparison between Active Baseline and Draft Revision with conflict resolution tools.

---

### 2.8 Investigation Workshop (`/sessions`)
- Project-tailored starter prompt chips (e.g. lighting count, voltage drop calculations, NEC compliance).
- Visual distinction between Answers, Evidence Citations, Metric Highlights, and Action Proposals.

---

### 2.9 Guided Workstation Tour (Driver.js)
- 2-tier architecture: Global Workstation Tour + Contextual Mini-Tours.
- Dynamic step fallback preventing tour breaks when dashboards are empty.
- One-click restart from `Settings → About & Updates → Restart Tour`.

---

## 3. Verification Commands & Results

| Check | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npm.cmd run typecheck` | ✅ **0 Errors** |
| **Comprehensive Test Suite** | `npm.cmd test` | ✅ **7 / 7 Suites Passed** |
| **Rust Tauri Core** | `cargo check --manifest-path src-tauri/Cargo.toml` | ✅ **Compiled in 1.81s** |
| **Production Build** | `npm.cmd run build` | ✅ **Built Cleanly (5.28s)** |


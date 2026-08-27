# Drawing / Takeoff Workspace

## Status
RECOMMENDED

## Purpose
Primary workspace for viewing drawings alongside AI-proposed detections, performing spatial corrections, measuring geometry, and building the takeoff interactively. This is the core value-delivery page of the MVP.

## Design Reference

Primary:
`../../designs/stitch/04_Drawing_Takeoff_Workspace.png`

Implementation reference:
`../../designs/stitch/04_Drawing_Takeoff_Workspace.html`

Reference purpose:
Visual and UX reference for the Takeoff Workspace layout — canvas (dominant left panel), detection overlay, measure tools, sheet navigator, and takeoff table (right panel). Dark theme. This is the primary reference for spatial interaction design, detection visualization, and correction UX.

**Design vs. documented behavior:**
- Any specific measurement values shown (dimensions, cable lengths, counts) are **visual demo placeholder content** — not product requirements
- The exact canvas/panel split ratio is a design decision; the principle (canvas-dominant, persistent way to reach the tabular view) is documented
- "Workshop" is not a valid term for this surface — the canonical name is **Takeoff Workspace** (per this document and `../00_PROJECT/GLOSSARY.md`)

---

## User Goal
Navigate the drawing package, inspect AI-proposed detections in spatial context, correct results, measure geometry, and build a trustworthy takeoff that is evidence-linked to the source drawings.

## Entry Conditions
- From Processing completion (auto-navigate or manual "Open in Workspace")
- Returning to an existing project via Project Overview or Dashboard blueprint shortcut
- From Takeoff Review ("View on drawing" action on a specific line item)

## Exit Conditions
- → Takeoff Review (tabular view of the same data)
- → Line Item Details (panel opens within or alongside workspace — TBD)
- → Investigation Workshop (open an investigation about this project)
- → Project Overview (breadcrumb navigation)

---

## Information Architecture

**Two-panel layout:**

**Left / Main: Drawing Canvas (dominant)**
- Sheet header bar: project name, sheet identifier, sheet type, scale, active layer
- Canvas area: raster/vector drawing rendering (PDF.js + React-Konva per `../03_ARCHITECTURE/TECH_STACK.md`)
- Detection overlay: AI-proposed bounding boxes / geometry annotations rendered over the canvas
  - Proposed detections: distinct visual style (color, opacity, dashed border) — never confused with human-approved
  - Human-approved items: distinct style (solid, confirmed color)
  - See `../02_DESIGN/UX_PRINCIPLES.md` §1
- Selection: clicking a detection selects it and shows its detail panel / correction controls
- Manual annotation: user can draw a bounding box → creates a new proposed detection for classification
- Measurement tools: user can measure linear geometry on the canvas

**Sheet Navigator:**
- Sheet list for the current project (by document / sheet number)
- Sheet type badges (floor plan / schedule / legend / notes / single-line diagram)
- Search within sheets

**Right / Secondary: Takeoff Table (collapsible or toggle)**
- Compact view of the current takeoff — line items, quantities, verification status
- Clicking a line item highlights the corresponding detections on the canvas
- "Full Review →" links to Takeoff Review page
- See `../02_DESIGN/COMPONENTS.md` TakeoffTable

**Toolbar (top or floating):**
- Zoom in / out / fit-to-page
- Measure tool toggle
- Undo / Redo
- Pan mode / Selection mode toggle
- Sheet navigation prev / next
- Export shortcut

---

## Layout
Canvas-dominant. Right panel may be a collapsible drawer or a fixed split. Exact split ratio and collapse behavior: TBD — founder design decision. The canvas must remain the primary surface; the tabular view is secondary. See design reference.

## Components
`DrawingCanvas`, `DetectionOverlay`, `CorrectionControl`, `SheetNavigator`, `TakeoffTable`, `MeasureTool`, `ManualAnnotationTool`, `Toolbar`.

---

## User Interactions (MVP)

### Canvas Navigation
- Pan (click + drag, or two-finger trackpad)
- Zoom (scroll, pinch, or toolbar +/-)
- Fit to page (keyboard shortcut or toolbar)
- Sheet navigation: click sheet in navigator, or prev/next arrows

### Detection Interaction
- Click a detection → select; shows detail panel (type, quantity, source, status)
- Hover → highlight (shows label without full selection)
- Approve detection → marks as human-verified
- Reject detection → marks as rejected (not deleted — rejected detections are tracked)
- Edit detection: change classification or quantity (→ Correction Event recorded)
- Delete detection
- Draw bounding box → new manual detection → classification prompt → line item created

### Geometry Measurement
- Activate measure tool → click start point → click end point (or polyline) → measurement displayed
- Result → proposed line item (user approves to add to takeoff)

### Takeoff Table (right panel)
- Select line item → highlights corresponding detections on canvas
- Click line item detail → opens Line Item Details panel

### Global
- Undo / Redo (Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z)
- Search within drawing (sheet search, not OCR search — TBD)
- Open Investigation Workshop for this project

---

## AI Behavior
- Detections are rendered as AI-proposed overlays — visually distinct from human-approved items
- No confidence score shown as primary UI (per `../02_DESIGN/UX_PRINCIPLES.md` §2)
- The Vectoris Agent (via the Investigation Workshop) can be asked to re-inspect a region or sheet; results appear as new proposed detections — never silently overwriting approved ones
- All detection actions (approve, reject, edit, add, delete) produce Correction Events (per `../03_ARCHITECTURE/DATA_MODEL.md`)
- Evidence chain: every detection links to: source document, sheet ID, bounding box coordinates, model version, takeoff run ID

---

## Data Requirements
Sheet raster/vector content, all detections for the current sheet (proposed + approved + rejected), line-item linkage, correction event history for each detection.

## API Requirements
- `GET /sheets/:id/content` — sheet rendering data
- `GET /sheets/:id/detections` — detections for sheet
- `POST /detections/:id/correction` — submit correction (approve / reject / edit)
- `POST /detections` — create manual detection
- `POST /measurements` — record geometry measurement → proposed line item
- `GET /projects/:id/takeoff` — takeoff summary for right panel

---

## State Model

### Loading
Sheet content and detections loading — skeleton canvas, placeholder detection layer.
### Empty — No Detections
A sheet with no AI detections (e.g., a notes-only sheet or legend). Explicit "No detections on this sheet" state. Does not block navigation; user can still annotate manually.
### Success
Normal interactive state — canvas rendered, detections overlaid, right panel populated.
### Error
Rendering failure (e.g., corrupted sheet, unsupported format) — specific error message (e.g., "This sheet could not be rendered — try re-uploading the document"). Does not block navigation to other sheets.
### Permission denied
Viewer role: pan / zoom / view detections — allowed. All correction actions (approve / reject / edit / add / delete) — disabled, with clear role-based explanation. The canvas is fully navigable; only mutation controls are locked.
### Offline
Fully functional offline against local drawing files (local-first — this is the most offline-robust page in the app per `../03_ARCHITECTURE/STORAGE.md`). Cloud sync of corrections queued for when connectivity returns. Offline indicator shown.

---

## Local-First Behavior
Raw drawing files are on the user's local device. The canvas renders from local files — no network round-trip required to view drawings. Detection data may be locally cached post-run. Offline corrections are queued and synced when online. This page must never block on a network request to display the drawing canvas.

---

## Accessibility
- Canvas-based interaction has inherent accessibility limits
- Keyboard-navigable alternatives required for: sheet navigation, detection selection, approve/reject actions
- Detection detail panel must be accessible (keyboard reachable, screen-reader compatible labels)
- Full accessible keymap TBD — minimum viable keyboard navigation required before shipping

## Keyboard Interaction (Locked Baseline)
- `Space + Drag` → Pan
- `Scroll` → Zoom
- `F` → Fit drawing
- `M` → Measure
- `Esc` → Cancel / deselect
- `Delete` → Delete selected item
- `Ctrl/Cmd + Z` → Undo
- `Ctrl/Cmd + Shift + Z` → Redo
- `Ctrl/Cmd + S` → Save

(Room for customization reserved for future iterations.)

## Motion
- Pan and zoom: smooth, no discrete jumps
- Detection selection: brief highlight pulse on selection
- Correction confirmation: subtle fade from "proposed" to "approved" visual style — conveys state change without interrupting workflow
- Per `../02_DESIGN/MOTION.md`

## Responsive / Window Behavior
Desktop app window model. Canvas must be the dominant surface at all supported window sizes. Right panel (takeoff table) may collapse to an icon/tab at narrower widths. Minimum viable layout at minimum supported window size — TBD.

## Security / Privacy
Local drawing files are not uploaded for rendering — they are rendered locally (local-first). Any cloud-based AI re-inspection of a region requires explicit per-session or per-org authorization per `../03_ARCHITECTURE/SECURITY.md` §3.

## Acceptance Criteria
- AC: Every rendered detection links back to source coordinates, sheet ID, document, and model version (`../01_PRODUCT/ACCEPTANCE_CRITERIA.md` AC-4)
- AC: A user can perform all MVP correction interactions listed above without leaving this workspace
- AC: Both discrete (bounding-box count) and geometry-based (linear/area measure) detections render correctly (AC-5)
- AC: The canvas loads and is interactive for offline projects (local-first requirement)
- AC: Proposed detections are visually distinct from human-approved detections at all times

## Dependencies
`TAKEOFF_REVIEW.md`, `LINE_ITEM_DETAILS.md`, `AI_SESSION.md`, `PROCESSING.md`

## Open Questions
- Exact split-view vs. toggle relationship between canvas view and tabular Takeoff Review — TBD; design suggests persistent right panel but toggle is possible
- OCR-based text search within drawing content — TBD (not in MVP scope explicitly)
- Whether "View on Drawing" from Takeoff Review opens the workspace as a split or navigates fully — TBD
- PDF rendering vs. CAD vector rendering for different file types — determined by the Phase 0.5 technical spike (`../05_IMPLEMENTATION/DEVELOPMENT_PHASES.md`)

# Export

## Status
RECOMMENDED

## Design Reference

Primary:
`../../designs/stitch/08_Takeoff_Review_BOQ_Export.png`

Implementation reference:
`../../designs/stitch/08_Takeoff_Review_BOQ_Export.html`

Reference purpose:
Visual and UX reference for the Export interaction — shown as a control embedded in the Takeoff Review page header (not a separate navigable page). The design shows a format selector (XLSX / CSV / PDF / JSON) and a primary download action accessible from an overflow or dedicated export button in the header.

**Design vs. documented behavior:**
- Export is not a standalone route — it is a contextual action within Takeoff Review. This is consistent with the documented approach.
- The ExportMenu uses a glass surface (dropdown / menu) — consistent with Liquid Glass usage rules in `../02_DESIGN/DESIGN_SYSTEM.md` §5 (modals and menus are appropriate glass surfaces).
- Format labels shown in the design match the documented set: XLSX, CSV, JSON, PDF.

## Purpose

Generate and deliver a structured takeoff export in the user's requested format.

## User Goal
Receive an accurate, usable export file (XLSX, CSV, JSON, or PDF) that reflects the current approved takeoff state.

## Entry Conditions
From Takeoff Review — Export action (via `ExportMenu` overflow/download affordance). Export is not a top-level page navigation; it is triggered contextually from within Takeoff Review. It may also be accessible from Project Overview for an existing completed takeoff.

## Exit Conditions
File delivered (download or save dialog). The user stays on Takeoff Review — Export does not navigate away. On failure, a clear error is shown inline; the user remains on Takeoff Review with a retry option.

## Information Architecture
Format selector (XLSX / CSV / JSON / PDF), generate/download action, status indication while the export job runs (if async — TBD whether export is synchronous or async for typical packages).

> **Important:** Exported files are **never** the canonical source of truth. The internal structured takeoff data (line items, correction events, approvals) is the source of truth — see `../01_PRODUCT/CORE_WORKFLOWS.md` §6 and `../00_PROJECT/PRD.md` NFR. An export is a point-in-time snapshot for external use.

## Layout
`ExportMenu` — overflow/hamburger menu or dedicated download control on the Takeoff Review page. Not a standalone page route. Layout TBD — founder-owned.

## Components
`ExportMenu` (see `../02_DESIGN/COMPONENTS.md`).

## User Interactions
Open Export menu; select format (XLSX / CSV / JSON / PDF); trigger download; receive file via OS save dialog or direct download.

## AI Behavior
None. Export is a deterministic transformation of the current structured internal state — not an AI-generated document.

## Data Requirements
Current approved takeoff state: all line items with quantities, UOM, source references, correction history, approval status, project metadata (name, description, type if available).

## API Requirements
Export endpoint: accepts `{project_id, takeoff_run_id, format}` → returns download or async job reference.  
If async: job status endpoint (see `../03_ARCHITECTURE/EVENT_SYSTEM.md`) → deliver file once ready.

## Export Format Requirements

| Format | Content |
|---|---|
| **XLSX** | Structured spreadsheet: one row per line item. **LOCKED Columns:** Item, Description, Quantity, Unit, Application / Where Used, Source, Review Status. Project metadata in a header row or separate sheet. |
| **CSV** | Same structure as XLSX, flat file. |
| **JSON** | Full structured export including all line items with evidence references, correction event count, approval status, model version used. Machine-readable. |
| **PDF** | Human-readable formatted BOQ report: project metadata, line items table, totals by category, generation timestamp, approval status indicator. |

The exact column headers for tabular exports are **LOCKED** based on the final BOQ hierarchy.

## State Model

### Loading
Export job running — format selector disabled, progress indicator (per `../02_DESIGN/MOTION.md`). If export is fast/synchronous, this may be a brief inline spinner.
### Empty
N/A — Export is always triggered from an existing takeoff.
### Success
File delivered — success confirmation (toast or inline), format selector re-enabled.
### Error
Export job failed — specific error message (e.g., "Export failed: could not render PDF — try XLSX instead"), retry affordance. Never a silent failure.
### Permission denied
Viewer role: TBD whether Viewer can export — see `../01_PRODUCT/USER_ROLES.md` §3 (Export row marked TBD). Until resolved, conservatively restrict Export to Editor+ and surface a clear permission message to Viewers.
### Offline
XLSX, CSV, and JSON export may be possible fully offline (local data → local transform → local file). PDF export may require additional rendering; offline capability TBD depending on implementation. Must never silently appear to succeed while offline if the file is not actually delivered.

## Accessibility
Format selector is keyboard-navigable; download trigger has a descriptive label.

## Keyboard Interaction
Standard menu/button keyboard interaction.

## Motion
Minimal — brief inline loading state per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model. Export is a contextual action within an existing page.

## Acceptance Criteria
- AC: A user can export in at least XLSX, CSV, and JSON without leaving the Takeoff Review screen (`../01_PRODUCT/ACCEPTANCE_CRITERIA.md` AC-10).
- AC: The exported data accurately reflects the current structured internal state — never a stale cached copy (AC-11).
- AC: A failed export produces a specific, actionable error, never a silent failure.
- AC: The exported file clearly indicates its source project, generation timestamp, and approval status.

## Dependencies
`TAKEOFF_REVIEW.md`, `../03_ARCHITECTURE/DATA_MODEL.md` (line item / export entity schema)

## Open Questions
- Async vs. synchronous export — likely synchronous for typical-size takeoffs at MVP; async for very large packages. Threshold TBD.
- Viewer role export permission — see `OPEN_DECISIONS.md` (OD-17 adjacent) and `USER_ROLES.md` TBD cell.
- Offline PDF generation — TBD depending on renderer choice.
- Whether exported files are optionally uploaded to cloud (for sharing) — TBD; local-only by default per `../03_ARCHITECTURE/STORAGE.md`.

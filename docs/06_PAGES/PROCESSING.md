# Processing

## Status
RECOMMENDED

## Design Reference

Primary:
`../../designs/stitch/05_Document_Processing_Pipeline.png`

Implementation reference:
`../../designs/stitch/05_Document_Processing_Pipeline.html`

Reference purpose:
Visual and UX reference for the Document Processing / pipeline progress page. Dark theme. Shows a two-column layout: left (AI Engineering Analysis Pipeline — stage-by-stage progress), right (document list with per-document processing status). Includes a prominent "Local-First Processing Active" privacy banner at the top.

**Design vs. documented behavior:**
- The design's heading label is **"AI Engineering Analysis Pipeline"** — this is a design label describing the content, not the canonical page name. The canonical page name remains **Processing** (per `APP_FLOW.md` and `GLOSSARY.md`).
- The "Local-First Processing Active" banner in the design is consistent with the documented local-first architecture (`../03_ARCHITECTURE/STORAGE.md`) and should be implemented — it is a user-trust signal, not decorative.
- The right column shows a per-document status list (uploaded file names, processing stage per document) — this IA is not currently described in this doc; it's a valid design observation worth implementing.
- Stage labels visible in the design (sheet splitting, classification, detection, measurement) map to the documented pipeline stages in `../03_ARCHITECTURE/EVENT_SYSTEM.md`.
- Progress percentages and timing values are visual demo content.


Show real-time progress of ingestion + AI detection while the user waits.

## User Goal
Understand that Vectoris is working, roughly how far along, and know if something fails.

## Entry Conditions
Immediately after successful Document Upload.

## Exit Conditions
Completion → Drawing/Takeoff Workspace. Failure → clear error state with retry/support path.

## Information Architecture
Stage-labeled progress (e.g., "Splitting sheets," "Classifying," "Detecting components") — per `../03_ARCHITECTURE/EVENT_SYSTEM.md` job lifecycle.

## Layout
TBD.

## Components
`ProcessingProgress` (`../02_DESIGN/COMPONENTS.md`).

## User Interactions
Cancel (where the underlying job supports safe interruption, per `../03_ARCHITECTURE/EVENT_SYSTEM.md` §3); navigate away and return later (job continues in background).

## AI Behavior
Perception layer runs detection/classification during this stage; no user-facing chat interaction here — this is a background job, not a conversation.

## Data Requirements
Job status stream for the triggered ingestion/detection job(s).

## API Requirements
Job status endpoint (polled or subscribed, per `../03_ARCHITECTURE/EVENT_SYSTEM.md` §4).

## State Model

### Loading
Default state of this page — active progress.
### Empty
N/A.
### Success
All stages complete → auto-navigate (or prompt) to Drawing/Takeoff Workspace.
### Error
A stage fails — specific reason shown (e.g., "could not parse sheet 4 of 12: corrupted"), with retry or partial-result options (TBD whether partial results are surfaced).
### Permission denied
N/A (already-authorized action from Upload).
### Offline
If processing is local-only, continues offline; if cloud-dependent perception is invoked (per `../04_AI/PERCEPTION.md`, explicit/authorized only), a network loss must pause/queue gracefully, not fail silently.

## Accessibility
Progress must be announced to assistive tech (e.g., ARIA live region) — specifics TBD.

## Keyboard Interaction
Cancel action keyboard-reachable.

## Motion
Meaningful progress motion per `../02_DESIGN/MOTION.md` principle 1 (communicates state, not decoration).

## Responsive / Window Behavior
Desktop app window model; user can navigate away without losing job progress (background-safe).

## Acceptance Criteria
- AC: User sees incremental, stage-labeled progress, not an indefinite spinner (`../01_PRODUCT/ACCEPTANCE_CRITERIA.md` AC-3).
- AC: A failed stage produces a specific, actionable error.

## Dependencies
`DRAWING_VIEWER.md`

## Open Questions
- Auto-navigate vs. prompt on completion — TBD.
- Whether partial results are viewable mid-failure — TBD.

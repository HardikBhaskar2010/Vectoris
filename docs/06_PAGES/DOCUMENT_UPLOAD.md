# Document Upload

## Status
RECOMMENDED

## Purpose
Accept drawing packages (and, architecturally, other input types) into a project.

## User Goal
Get their drawing package into Vectoris with minimal friction, understanding what happened if something went wrong.

## Entry Conditions
From Project Overview, "Upload" action.

## Exit Conditions
Successful upload → Processing. Cancel → returns to Project Overview.

## Information Architecture
Drop zone / file browser, upload progress per file, format validation feedback.

## Layout
TBD.

## Components
`UploadDropzone` (`../02_DESIGN/COMPONENTS.md`).

## User Interactions
Drag-drop or browse to select file(s); remove a file before submitting; confirm upload.

## AI Behavior
None at upload time — processing/detection happens downstream in Processing.

## Data Requirements
Selected file(s), target project ID.

## API Requirements
Document upload endpoint (creates Document entities, triggers ingestion job — `../03_ARCHITECTURE/EVENT_SYSTEM.md`).

## State Model

### Loading
Per-file upload progress.
### Empty
No files selected yet.
### Success
Upload complete → navigates to Processing.
### Error
Unsupported format, corrupted file, or upload failure — specific, per-file error message (per `../00_PROJECT/PRD.md` NFR-6, never a silent failure).
### Permission denied
Viewer/read-only roles cannot reach this action (`../01_PRODUCT/USER_ROLES.md`).
### Offline
Local-first: files can be added to the local project locally; cloud-dependent processing (if any) queues until connectivity resumes — exact behavior TBD.

## Accessibility
Drag-drop must have an equivalent keyboard/browse-based path (never drag-drop-only).

## Keyboard Interaction
File browser dialog is keyboard-navigable via OS standard.

## Motion
Progress indication per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model.

## Acceptance Criteria
- AC: A user can upload a multi-file PDF drawing package.
- AC: An unsupported or corrupted file produces a specific error, not a silent failure or crash.

## Dependencies
`PROCESSING.md`

## Open Questions
- Max package size / file count limits — TBD, technical spike.
- Duplicate-file detection UX — TBD.

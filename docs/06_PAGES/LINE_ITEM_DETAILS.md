# Line Item Details

## Status
RECOMMENDED

## Purpose
Deep-dive view of a single line item: full evidence, correction history, and edit controls.

## User Goal
Understand and, if needed, correct a specific line item with full context.

## Entry Conditions
From Takeoff Review (row click) or Drawing Viewer (detection selection).

## Exit Conditions
Returns to Takeoff Review (or Drawing Viewer, depending on entry point).

## Information Architecture
Line item current value, source evidence (linked drawing region), full correction history (audit chain per `../04_AI/MODEL_GOVERNANCE.md` §3), classification/type.

## Layout
TBD — likely a panel/drawer overlaying Takeoff Review rather than a full page navigation (contextual-surface preference), though listed as a page per founder's page list.

## Components
`LineItemPanel`.

## User Interactions
Edit value/classification; view correction history; jump to source evidence in Drawing Viewer.

## AI Behavior
May show agent-generated explanation of the detection **on demand** (not forced), consistent with `../02_DESIGN/UX_PRINCIPLES.md` §3.

## Data Requirements
Single line item with full evidence + correction event history.

## API Requirements
Get line item detail (incl. correction history), submit correction.

## State Model

### Loading
Detail loading.
### Empty
N/A (always represents an existing line item).
### Success
Populated detail view.
### Error
`ErrorState` with retry.
### Permission denied
Viewer sees read-only detail.
### Offline
Local-cached detail available; edits queue if needed.

## Accessibility
Standard; specifics TBD.

## Keyboard Interaction
Escape to close (if panel/drawer); standard form navigation for edits.

## Motion
Panel open/close per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model.

## Acceptance Criteria
- AC: The full correction history for a line item is visible and accurate (`../04_AI/MODEL_GOVERNANCE.md` §3 auditability chain).
- AC: The user can jump from here to the source drawing evidence.

## Dependencies
`TAKEOFF_REVIEW.md`, `DRAWING_VIEWER.md`

## Open Questions
- Panel/drawer vs. full page — TBD.

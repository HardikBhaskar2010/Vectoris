# Takeoff Review

## Status
RECOMMENDED

## Design Reference

Primary:
`../../designs/stitch/08_Takeoff_Review_BOQ_Export.png`

Implementation reference:
`../../designs/stitch/08_Takeoff_Review_BOQ_Export.html`

Reference purpose:
Visual and UX reference for the Takeoff Review table and BOQ Export interaction. Dark theme. Shows a full-width structured line-item table with: item name, specification, quantity, UOM, source-sheet reference, status badge (Verified / Review), and correction controls per row. Export trigger is in the page header area.

**Design vs. documented behavior:**
- The design combines Takeoff Review and Export in one view — the export action is accessed from the Takeoff Review page header, consistent with the documented `ExportMenu` component approach
- Table column structure in the design: Item, Description, Specification, Quantity, UOM, Source, Status, Actions — aligns with the documented data model.
- **The Information Hierarchy is LOCKED:** `Item`, `Description`, `Quantity`, `Unit` (UOM), `Source`, `Status`, `Actions`. (Pricing/labor columns remain outside the MVP unless explicitly introduced later).
- Status badges: `Proposed` (default/grey), `Verified` (green / approved by human), `Rejected` (muted / struck). Note: the label "Verified" maps to the `approved` status value in the data model. Do not use "Approved" and "Verified" interchangeably without a product decision — this remains OD-17 adjacent.
- Any specific line-item values, quantities, and specifications shown are visual demo content
- Liquid Glass is **not** applied to the table body — consistent with the Liquid Glass usage rules in `../02_DESIGN/DESIGN_SYSTEM.md` §5 (dense data tables are solid surfaces)


Tabular, structured review/correction/approval surface for the full takeoff.

**Three-state item model:**
- `proposed` — AI-produced candidate; not yet reviewed by a human
- `approved` — explicitly accepted; forms the verified takeoff used for export/estimation
- `rejected` — explicitly rejected; retained in the system (never silently deleted); shown with a dismissed visual state

Only `approved` items are included in exports and [FUTURE] estimation. `rejected` items remain in the ledger for audit and potential re-evaluation.

## User Goal
Efficiently review, correct, and approve all line items before export.

## Entry Conditions
From Drawing/Takeoff Workspace, or directly from Project Overview if a takeoff already exists.

## Exit Conditions
Navigates to Line Item Details (per row) or Export.

## Information Architecture
`TakeoffTable` — sortable/filterable structured line items. 
**LOCKED Columns:** Item, Description, Quantity, Unit, Source, Status, Actions.

## Layout
TBD.

## Components
`TakeoffTable`, `CorrectionControl`, `ExportMenu`.

## User Interactions
Accept/reject/edit/delete a line item; add a manual line item; jump to evidence (opens Drawing Viewer at the relevant sheet/region); bulk-approve (TBD if included at MVP); open Export menu.

## AI Behavior
No new AI generation happens here by default — this is the review of already-produced proposals. A user can invoke the agent (via a session) to ask about a specific line item ("why did you count this as 43?") without leaving context — mechanism TBD (inline vs. side panel).

## Data Requirements
Full line-item list for the current takeoff run, with status and evidence links.

## API Requirements
List line items, submit correction event, create manual line item, delete line item.

## State Model

### Loading
Table loading skeleton.
### Empty
No line items yet (e.g., detection still running, or a genuinely empty result) — distinct empty states for "still processing" vs. "processed, nothing found."
### Success
Populated, interactive table.
### Error
`ErrorState` with retry on fetch/submit failure.
### Permission denied
Viewer sees read-only table; Editor+ sees full correction controls (`../01_PRODUCT/USER_ROLES.md`).
### Offline
Operates against local-cached line-item data (local-first); corrections queue for sync if collaboration requires it (see `../03_ARCHITECTURE/EVENT_SYSTEM.md` §6 open conflict-handling question).

## Accessibility
Table must be screen-reader navigable with clear row/column semantics — specifics TBD.

## Keyboard Interaction
Row navigation, inline edit via keyboard — TBD.

## Motion
Row-level feedback on accept/reject per `../02_DESIGN/MOTION.md` §3.

## Responsive / Window Behavior
Desktop app window model; table must remain usable at minimum supported width.

## Acceptance Criteria
- AC: Every correction produces a structured event with all required fields (`../01_PRODUCT/ACCEPTANCE_CRITERIA.md` AC-8).
- AC: A manually created line item uses the same data model as an AI-detected one (AC-9).
- AC: No confidence score is shown as a primary UI element (AC-6).

## Dependencies
`LINE_ITEM_DETAILS.md`, `EXPORT.md`, `DRAWING_VIEWER.md`

## Open Questions
- Bulk-approve at MVP or deferred — TBD.
- Inline AI Q&A vs. side-panel session — TBD.

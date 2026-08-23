# Create Project

## Status
LOCKED (minimal form) 

## Design Reference

Primary:
`../../designs/stitch/07_Projects_Library_Create_Modal.png`

Implementation reference:
`../../designs/stitch/07_Projects_Library_Create_Modal.html`

Reference purpose:
Visual and UX reference for the Create Project interaction — shown as a centered modal overlaid on the Projects list. Dark theme. The modal form contains: Project Name (required), Description (optional), and a primary "Create Project" action.

**Design vs. documented behavior:**
- The design confirms the modal interaction pattern — consistent with the open question in this doc. The "dedicated page" option in `APP_FLOW.md` is likely to resolve to modal-over-Projects in the final design.
- The modal form fields match the documented IA: Name (required) + Description (optional) only. No project type, discipline, or additional metadata at creation time.
- Cancel dismisses the modal and returns to the Projects list without navigation


Create a new project with minimal friction.

## User Goal
Start a new project as quickly as possible.

## Entry Conditions
From Dashboard or Projects, "Create Project" action.

## Exit Conditions
Successful creation → Project Overview. Cancel → returns to prior surface.

## Information Architecture
Per founder decision (§4 of brief): only **Project Name (required)** and **Description (optional)** at creation. All other metadata is deferred to Project → Edit Project Settings post-creation.

## Layout
Minimal modal or dedicated screen (TBD which — likely modal given founder's contextual-surface preference, but Create Project is listed as a page in `APP_FLOW.md`; may resolve to modal-over-Projects in final design).

## Components
Simple form (name, description), submit/cancel actions.

## User Interactions
Enter name (required), optionally enter description, submit.

## AI Behavior
None at creation time. Project type is **not** requested here — it is inferred by Vectoris from uploaded material post-creation, or provided later via AI chat (see `PROJECT_OVERVIEW.md` and `../03_ARCHITECTURE/DATA_MODEL.md` Project entity's three-way type distinction).

## Data Requirements
Project name, optional description, organization context, creating user.

## API Requirements
Create Project endpoint.

## State Model

### Loading
Submitting — disable form, show inline loading.
### Empty
N/A (this is the creation form itself).
### Success
Navigate to the new Project Overview.
### Error
Validation error (e.g., empty required name) or submission failure — specific inline message.
### Permission denied
If the user's role does not permit project creation (`../01_PRODUCT/USER_ROLES.md`), the action should not be reachable in the first place; if reached via stale UI state, show a clear permission-denied message rather than a generic error.
### Offline
Local-first: project creation may be possible fully offline with later sync — exact offline-creation behavior TBD pending `../03_ARCHITECTURE/STORAGE.md` collaboration-sync resolution.

## Accessibility
Standard accessible form.

## Keyboard Interaction
Enter-to-submit, Escape-to-cancel (if modal).

## Motion
Minimal, per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model.

## Acceptance Criteria
- AC: A project can be created with only a name.
- AC: Description is genuinely optional (submission succeeds without it).
- AC: No other metadata is required at this step.

## Dependencies
`PROJECT_OVERVIEW.md`

## Open Questions
- Modal vs. dedicated page — final form TBD.
- Offline project creation and later sync mechanics — TBD.

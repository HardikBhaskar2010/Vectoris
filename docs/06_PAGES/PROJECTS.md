# Projects

## Status
RECOMMENDED

## Design Reference

Primary:
`../../designs/stitch/07_Projects_Library_Create_Modal.png`

Implementation reference:
`../../designs/stitch/07_Projects_Library_Create_Modal.html`

Reference purpose:
Visual and UX reference for the Projects library page — project card grid/list, dark theme, and the Create Project modal overlay rendered on top of the list. Shows the dual-purpose of this screen: browsing existing projects and initiating new ones without a separate navigation step.

**Design vs. documented behavior:**
- The design shows a **modal** for Create Project overlaid on the Projects list — consistent with the open question in `CREATE_PROJECT.md` about modal vs. dedicated page. This design resolves toward modal, but is not yet locked.
- Project cards show: project name, discipline/type tag, sheet count, status badge, last-updated timestamp — exact card fields are TBD at implementation
- Sample project names and statuses ("ABC Data Center", "In Progress", etc.) are visual demo content
- The dark theme is the primary reference; light theme variant is not separately designed for this screen


Full list/management surface for all projects the user can access.

## User Goal
Find, filter, and open a specific project; initiate creation of a new one.

## Entry Conditions
From Dashboard or global navigation.

## Exit Conditions
Navigates to Project Overview (existing project) or Create Project.

## Information Architecture
Project list (with org/role context), filter/search (exact filters TBD).

## Layout
TBD.

## Components
`ProjectCard`, `EmptyState`, `ErrorState`.

## User Interactions
Search/filter projects; select a project; initiate creation.

## AI Behavior
None on this page.

## Data Requirements
Full project list scoped to the user's role/organization access.

## API Requirements
Projects list endpoint (paginated — pagination strategy TBD).

## State Model

### Loading
List loading skeleton.
### Empty
No projects exist for this org/user — `EmptyState` → Create Project.
### Success
Populated, filterable list.
### Error
`ErrorState` with retry.
### Permission denied
A user without any project access within an org sees an appropriately scoped empty/restricted state, not an error.
### Offline
Reflects last-cached local list; indicates staleness.

## Accessibility
Standard list/table accessibility; specifics TBD.

## Keyboard Interaction
Arrow-key/list navigation: TBD.

## Motion
Per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model.

## Acceptance Criteria
- AC: A user can locate and open any project they have access to.
- AC: A user without projects is guided to create one.

## Dependencies
`CREATE_PROJECT.md`, `PROJECT_OVERVIEW.md`

## Open Questions
- Filter/sort criteria — TBD.
- Pagination vs. infinite scroll — TBD.

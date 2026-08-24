# Project Overview

## Status
RECOMMENDED

## Purpose
The Overview tab of a project — the first thing a user sees when they open a project. It answers: **"What is happening with this project right now?"**

Overview is one tab within the project shell. The full project information architecture is: Overview · Documents · Workspace · Takeoff · Reports (+ future: Estimate, Bid). See `PROJECT_NAVIGATION.md` for the complete IA.

## User Goal
Understand project state and navigate to the relevant next action (upload, review takeoff, open a session).

## Entry Conditions
From Projects list, Dashboard, or immediately after Create Project.

## Exit Conditions
Navigates to Document Upload, Drawing/Takeoff Workspace (if data exists), or a Chat Session.

## Information Architecture
Project metadata (name, description, inferred/user-provided/verified type — see `../03_ARCHITECTURE/DATA_MODEL.md`), current workflow stage indicator, processing status (if running), recent document activity, takeoff progress summary, recent AI sessions (last 3–5), team, quick actions.

What Overview does NOT contain:
- The full document list (lives in the Documents tab)
- The full line-item table (lives in the Takeoff tab)
- The drawing canvas (lives in the Workspace tab)
- The full session list (links to global AI Sessions, filtered to this project)

The Overview must remain scannable. It summarises; it does not duplicate the content of other tabs.

## Layout
TBD.

## Components
Document list items, `ChatSessionPanel` entry points, project metadata display, `EditProjectSettings` (contextual surface per founder decision, not a standalone page).

## User Interactions
Upload a document; open an existing session or start a new one; edit project settings (modal/drawer); navigate to takeoff review if a takeoff exists; tell Vectoris the project type/context via chat.

## AI Behavior
The agent may proactively infer project type from uploaded material (flagged as `ai_inferred`, per `../03_ARCHITECTURE/DATA_MODEL.md`). The user can confirm/override via chat, producing `user_provided` or `verified` context. The agent must never silently overwrite a `verified` context value.

## Data Requirements
Project entity, document list, takeoff run summary (if any), session list.

## API Requirements
Get project, list documents, list takeoff runs (summary), list sessions.

## State Model

### Loading
Skeleton while project data loads.
### Empty
Newly created project with no documents yet — prompts Document Upload.
### Success
Populated overview.
### Error
`ErrorState` with retry.
### Permission denied
Viewer role sees read-only surfaces; upload/edit actions hidden or disabled per `../01_PRODUCT/USER_ROLES.md`.
### Offline
Reflects local-cached project state; upload may queue for when connectivity/sync resumes (mechanism TBD).

## Accessibility
Standard; specifics TBD.

## Keyboard Interaction
TBD.

## Motion
Per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model.

## Acceptance Criteria
- AC: A user can reach Document Upload from this page.
- AC: A user can see and open existing chat sessions, or start a new one.
- AC: Project type distinguishes AI-inferred, user-provided, and verified states visibly (at least internally/inspectable, exact UI TBD).

## Dependencies
`DOCUMENT_UPLOAD.md`, `PROCESSING.md`, `DRAWING_VIEWER.md`

## Open Questions
- Exact visual treatment of project-type provenance — TBD.
- Whether sessions are a tab, sidebar, or separate area — TBD.

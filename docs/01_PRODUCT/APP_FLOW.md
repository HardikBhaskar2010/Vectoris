# Vectoris — App Flow

**Status:** LOCKED (navigation graph for MVP pages)  
**Owner of:** Navigation graph between pages/states  
**Does not own:** Individual page behavior (→ 06_PAGES), workflow business logic (→ CORE_WORKFLOWS.md)

---

## 1. Top-Level Navigation Graph

```mermaid
flowchart TD
    Landing --> MarketingLanding[Marketing Landing]
    Landing --> Auth
    Auth --> Onboarding
    Onboarding --> Dashboard
    Auth --> Dashboard
    Dashboard --> Projects
    Dashboard --> Sessions[AI Sessions]
    Projects --> CreateProject[Create Project]
    CreateProject --> ProjectOverview[Project Overview]
    Projects --> ProjectOverview
    Sessions --> SessionDetail[AI Session]
    ProjectOverview --> Sessions
    ProjectOverview --> DocumentUpload[Document Upload]
    DocumentUpload --> Processing
    Processing --> DrawingViewer[Drawing / Takeoff Workspace]
    DrawingViewer --> TakeoffReview[Takeoff Review]
    TakeoffReview --> LineItemDetails[Line Item Details]
    TakeoffReview --> Export
    DrawingViewer --> SessionDetail
    Dashboard --> Settings
    ProjectOverview --> Settings
```

> **Note:** AI Sessions is a **global** nav item — not only accessible from Project Overview. Sessions have `project_id` nullable: a NULL `project_id` is a general conversation; a non-null `project_id` is a project-attached session. Both use the same UI. See `../02_DESIGN/NAVIGATION.md` for canonical global sidebar structure.

## 2. Contextual Surfaces (Not Standalone Pages)

Per founder decision, the following are modal/drawer/popover/command-surface UI, not dedicated pages: member management, billing, session sharing permissions. They can be invoked from Dashboard, Project Overview, or a global command surface, but do not have their own top-level route in this app-flow graph.

## 3. Entry/Exit Conditions Summary

| Page | Typical Entry | Typical Exit |
|---|---|---|
| Marketing Landing | External traffic | → Landing, → Auth |
| Landing | Unauthenticated user | → Auth |
| Auth | From Landing or session expiry | → Onboarding (first time), → Dashboard |
| Onboarding | Post-auth (first time) | → Dashboard |
| Dashboard | Post-auth or Post-onboarding | → Projects, → Create Project, → Settings |
| Projects | From Dashboard | → Create Project, → Project Overview |
| Create Project | From Projects/Dashboard | → Project Overview on success |
| Project Overview | From Projects, or post-creation | → Document Upload, → Sessions (open existing or start new), → Takeoff Review (if takeoff exists), → Settings |
| Settings | From Dashboard or Project Overview | → Return to previous |
| Sessions | From global sidebar (AI Sessions), from Project Overview, from Drawing Workspace | → Session Detail; → return to origin |
| Document Upload | From Project Overview | → Processing |
| Processing | Post-upload | → Drawing Viewer (auto or on completion) |
| Drawing / Takeoff Workspace | Post-processing, or returning to existing project | → Takeoff Review |
| Takeoff Review | From workspace | → Line Item Details, → Export |
| Line Item Details | From Takeoff Review | → back to Takeoff Review |
| Export | From Takeoff Review | Download; stays on Takeoff Review |

Full per-page entry/exit detail: individual files in `../06_PAGES/`.

## 4. Cross-References

- Business logic behind each transition: `CORE_WORKFLOWS.md`
- Page specs: `../06_PAGES/*`

# Vectoris — Project Navigation & Information Architecture

**Status:** LOCKED (conceptual IA) · RECOMMENDED (tab structure)  
**Owner of:** Project-level IA, tab definitions, project sub-nav routing  
**Does not own:** Global navigation (→ NAVIGATION.md), per-page layout (→ 06_PAGES/*), routing graph (→ APP_FLOW.md)

---

## 1. Project as Container

A Project is the primary container for an entire engineering estimating/takeoff workflow.

A project may contain:

- Documents (drawings, PDFs, specifications, images, BOQs, RFPs)
- Processing pipeline state (per document)
- AI detections and measurements (per sheet)
- Takeoff items (candidate → verified)
- Correction events (audit ledger)
- Exports (point-in-time snapshots)
- AI Sessions (project-attached conversations)
- Team members (roles and permissions)
- [FUTURE] Estimate (from verified takeoff)
- [FUTURE] Bid / Proposal (from estimate)

These are not disconnected features. They are aspects of one engineering project, connected through a traceability chain from source document to commercial output.

---

## 2. Project Information Architecture

```
Project
├── Overview           — project status hub ("What is happening right now?")
├── Documents          — uploaded files + per-document processing pipeline status
├── Workspace          — interactive drawing canvas + detection overlay + measurement
├── Takeoff            — verified quantity layer: line items, review, approval
├── [Estimate]         — [FUTURE] material + labor + markup from verified takeoff
├── [Bid / Proposal]   — [FUTURE] commercial proposal from estimate
└── Reports            — export (XLSX/CSV/JSON/PDF) + project history + audit
```

Items marked `[FUTURE]` are architecturally planned but not MVP-eligible per `../MVP_BOUNDARY.md`. They must exist as disabled/locked slots in the project tab bar to communicate product direction without pretending they exist now.

---

## 3. What Each Area Owns

### Overview
"What is happening with this project right now?"

Summarises:
- Project identity (name, client, sector, discipline, type provenance)
- Current workflow stage (empty / processing / takeoff-ready / in-review / export-ready)
- Processing status (if a pipeline is running)
- Recent document activity
- Takeoff progress (items detected / approved / pending)
- Recent AI sessions (last 3–5, with title, preview, timestamp)
- Team members
- Quick actions (Upload, Open Workspace, New Session)

Does NOT contain:
- The full document list (→ Documents tab)
- The full line-item table (→ Takeoff tab)
- The drawing canvas (→ Workspace tab)
- The full session list (→ global AI Sessions, or View all sessions link)

### Documents
Full list of all uploaded files in this project.

Per document:
- Filename, format (DWG/PDF/BIM/etc.), size
- Upload status
- Processing pipeline status (queued / ingesting / classifying / detecting / complete / error)
- Sheet count (once classified)
- Uploaded by, uploaded at
- Actions: re-process, remove (role-gated)

Processing is surfaced here as a per-document state, not as a separate interstitial page. The Processing pipeline page (post-upload) is still a valid entry for real-time progress; Documents is the persistent home for processing status.

### Workspace
Interactive engineering environment for a specific sheet within the project.

Connects:
```
Project → Document → Sheet → Detections → Line Items → Evidence
```

This is the core value-delivery surface. See `../06_PAGES/DRAWING_VIEWER.md` for full spec.

The Workspace does not own takeoff data. It reads from and writes to the same Line Item / Detection / Correction Event entities that belong to the Project.

### Takeoff
The verified quantity layer between AI detection and downstream outputs.

Contains:
- Detected items (from AI, from manual annotation)
- Item categories and classifications
- Quantities and units
- Measurements (linear, area, count)
- Drawing references and evidence links
- Review state (proposed / approved / rejected)
- Approval audit trail (Correction Events)
- Filters, grouping, search
- Export trigger (→ Reports)

**Critical rule:** AI-proposed detections (status: `proposed`) do not automatically become takeoff data. A human must explicitly approve each item (or batch). Only approved items (status: `approved`) are the basis for export or [FUTURE] estimation. Rejected items (status: `rejected`) are retained — never silently deleted.

### Estimate [FUTURE — not MVP]
Consumes the verified takeoff (approved line items only).

Future capability — do not design or build until:
1. Gate passed per THESIS.md Gates framework
2. OD-22 (entity model) resolved
3. This section explicitly updated from [FUTURE] to RECOMMENDED

### Bid / Proposal [FUTURE — not MVP]
Consumes the Estimate. Entirely unspecified.

Do not design or build until OPEN DECISION OD-23 (Bid/Proposal mechanics) is resolved with a full specification.

### Reports
Export surface and project history.

Contains:
- Export triggers: XLSX, CSV, JSON, PDF
- Export history (what was exported, by whom, when)
- Project audit log (correction events, approvals, role changes) — TBD whether this is here or a separate surface

Export always reflects the current approved takeoff state. Exported files are never the source of truth — see `../06_PAGES/EXPORT.md`.

---

## 4. Canonical Workflow Within a Project

```
DOCUMENT INPUT  (Documents tab — Upload action)
      │
      ▼
DOCUMENT UNDERSTANDING  (Documents tab — per-document processing status)
  Ingestion → Classification → OCR/Vision → Sheet Understanding
      │
      ▼
AI DETECTION  (background — Perception layer)
  Component detection / Geometry measurement
      │
      ▼
CANDIDATE TAKEOFF  (Workspace tab — proposed overlays)
  Items visible on canvas, status: proposed
  Human has NOT reviewed these
      │
      ▼
HUMAN REVIEW  (Workspace tab + Takeoff tab)
  Approve → status: approved
  Reject → status: rejected (retained)
  Edit → Correction Event recorded
  Add manual → same data model, source: human_created
      │
      ▼
VERIFIED TAKEOFF  (Takeoff tab)
  Only approved items
  Every item: quantity · unit · evidence · approval record
      │
      ├──────────────────────────────────────────┐
      ▼                                          ▼
EXPORT (Reports tab — MVP)            ESTIMATE [FUTURE]
XLSX / CSV / JSON / PDF               Materials + Labor + Markup
Point-in-time snapshot                         │
From verified takeoff only                     ▼
                                      BID / PROPOSAL [FUTURE]
                                      Scope + Pricing + Terms
```

---

## 5. AI Sessions Within a Project

When viewing a project, the Overview tab surfaces project-attached sessions:
```
AI Sessions
├── [Recent session 1]     2h ago
├── [Recent session 2]    12h ago
└── View all sessions →
```

"View all sessions" navigates to the global AI Sessions page, pre-filtered to this project.

"New session" opens the new-session composer with this project pre-selected in the context picker.

Clicking any session — from the project or from the global sessions page — opens the same AI Session interface. There is no separate project-specific chat UI.

---

## 6. Cross-References

- Global navigation structure: `../02_DESIGN/NAVIGATION.md`
- App routing graph: `../01_PRODUCT/APP_FLOW.md`
- Data entities: `../03_ARCHITECTURE/DATA_MODEL.md`
- Workflow business logic: `../01_PRODUCT/CORE_WORKFLOWS.md`
- Individual page specs: `../06_PAGES/PROJECT_OVERVIEW.md`, `DOCUMENT_UPLOAD.md`, `PROCESSING.md`, `DRAWING_VIEWER.md`, `TAKEOFF_REVIEW.md`, `EXPORT.md`
- AI Session global architecture: `../06_PAGES/AI_SESSION.md`
- MVP boundary: `../MVP_BOUNDARY.md`
- Open decisions: `../OPEN_DECISIONS.md` (OD-22, OD-23, OD-25)

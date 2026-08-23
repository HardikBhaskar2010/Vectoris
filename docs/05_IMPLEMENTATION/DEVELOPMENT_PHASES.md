# Vectoris — Development Phases

**Status:** RECOMMENDED  
**Owner of:** Phase-by-phase deliverables and exit criteria  
**Does not own:** Design content, overall sequencing rationale (→ IMPLEMENTATION_FLOW.md)

---

## Phase 0 — Architecture + Technical Decisions
**Deliverable:** This documentation set; resolved TBDs where feasible (DB engine, queue tech).  
**Exit criteria:** Core architecture documents (`../03_ARCHITECTURE/*`) reviewed and accepted by founder.

## Phase 0.5 — AI Technical Spike
**Deliverable:** Detection + measurement prototype tested on 5+ real, diverse (including messy/scanned) drawing packages.  
**Exit criteria:** Answers "can Vectoris understand messy real electrical drawings well enough to produce a useful takeoff?" with evidence, not assumption. Perception model choice(s) made per `../04_AI/PERCEPTION.md`.

## Phase 1 — Authentication + Organization + Project System
**Deliverable:** Org creation, invites, roles, project CRUD (per `../01_PRODUCT/USER_ROLES.md`, `../00_PROJECT/PRD.md`).  
**Exit criteria:** A user can create an org, invite a member, and create a project end-to-end.

## Phase 2 — Document Ingestion
**Deliverable:** PDF/scanned-PDF adapter, sheet splitting/classification, job/progress infrastructure (`../03_ARCHITECTURE/EVENT_SYSTEM.md`).  
**Exit criteria:** A real drawing package uploads and is classified into sheets reliably, with clear failure states for malformed input.

## Phase 3 — Drawing Viewer
**Deliverable:** PDF.js + canvas interaction layer (pan, zoom, fit-to-page, sheet nav, search).  
**Exit criteria:** A user can navigate a real multi-sheet package smoothly.

## Phase 4 — AI Detection
**Deliverable:** Perception pipeline producing evidence-linked detections and measurements against the viewer.  
**Exit criteria:** Detections render on the viewer with correct source-linkage; meets or documents gap against Gate 3 thresholds (legacy `THESIS.md`).

## Phase 5 — Takeoff Review
**Deliverable:** Correction workflow (accept/reject/edit/add/delete), structured correction capture (`../03_ARCHITECTURE/DATA_MODEL.md`).  
**Exit criteria:** A full correction round-trip is captured with all required fields (AI value, human value, delta, user, timestamp, model version).

## Phase 6 — Export
**Deliverable:** XLSX/CSV/JSON/PDF export from structured internal data.  
**Exit criteria:** Exported files accurately reflect approved takeoff state.

## Phase 7 — AI Evaluation
**Deliverable:** Vectoris Evaluation Suite operational across all categories (`../04_AI/EVALUATION.md`); benchmark dataset assembled.  
**Exit criteria:** Evaluation Suite gates future model changes per `../04_AI/MODEL_GOVERNANCE.md`.

## Phase 8 — Real Project Pilot
**Deliverable:** Shadow workflow test with a real user on a real project (per legacy `THESIS.md` Gate 4).  
**Exit criteria:** Matches the Success Criteria in `../00_PROJECT/PRD.md` §6.

## Cross-References

- `IMPLEMENTATION_FLOW.md`
- `../00_PROJECT/PRODUCT_SCOPE.md` — scope boundary each phase must stay within
- `../01_PRODUCT/ACCEPTANCE_CRITERIA.md` — cross-cutting acceptance bar the phases must satisfy


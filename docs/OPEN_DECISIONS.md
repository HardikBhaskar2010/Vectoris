# Vectoris — Open Decisions Registry

**Status:** LIVING DOCUMENT — append only  
**Owner of:** Every unresolved product/architectural decision that is blocking or will soon block implementation  
**Does not own:** Decided items (those belong in the owning document, cross-referenced here once resolved)

> An open decision is a decision that has not been made yet, where making it wrong would require rework or create contradictions. Resolved decisions must be removed from this list and recorded in the appropriate owning document — not left here after resolution.

---

## Registry

| ID | Decision | Blocking What | Owner | References | Status |
|---|---|---|---|---|---|
| OD-03 | **Realtime delivery mechanism:** WebSocket vs. SSE vs. polling | `03_ARCHITECTURE/EVENT_SYSTEM.md` §4, `06_PAGES/PROCESSING.md` | Engineering | `EVENT_SYSTEM.md` | **Open — RECOMMENDED: SSE or polling at MVP, WebSocket if sub-second updates required** |
| OD-04 | **Concurrent editing / conflict resolution:** last-write-wins, optimistic locking, or CRDT/OT | `03_ARCHITECTURE/EVENT_SYSTEM.md` §6, `01_PRODUCT/ACCEPTANCE_CRITERIA.md` AC-13 | Engineering / Product | `EVENT_SYSTEM.md` §6, `ACCEPTANCE_CRITERIA.md` | **Open — required before multi-user editing phase** |
| OD-05 | **Collaboration file-sharing mechanism:** How does a second user see a project whose raw files live on the first user's device? | `03_ARCHITECTURE/STORAGE.md` §5, `01_PRODUCT/USER_ROLES.md` | Founder / Engineering | `STORAGE.md` §5 | **Open — candidates: on-demand local sync, opt-in shared cloud copy, hybrid** |
| OD-06 | **Model training consent:** exact legal/privacy mechanics of opt-in, anonymization, data retention for training use | `04_AI/TRAINING.md` §4, `03_ARCHITECTURE/SECURITY.md` §4 | Founder / Legal | `TRAINING.md`, `SECURITY.md` | **Open — requires legal counsel before any production data collection** |
| OD-07 | **Perception model(s):** which local and/or cloud models are used for detection/measurement | `04_AI/PERCEPTION.md` §5, `03_ARCHITECTURE/TECH_STACK.md` | Engineering (post-spike) | `PERCEPTION.md` | **Open — determined by Phase 0.5 technical spike** |
| OD-08 | **Brain base model:** which open-source foundation model to fine-tune (or use prompted) | `04_AI/VECTORIS_BRAIN.md` §5 | Engineering (post-spike) | `VECTORIS_BRAIN.md` | **Open — determined by Phase 0.5 technical spike** |
| OD-09 | **Takeoff Run scope fields:** whether `Takeoff Run` stores a `documents_in_scope[]` or `sheets_in_scope[]` field for multi-document projects | `03_ARCHITECTURE/DATA_MODEL.md` §2 (Takeoff Run entity) | Engineering | `DATA_MODEL.md` | **Open — required before multi-document processing phase** |
| OD-11 | **Encryption at rest (local files):** whether and how local drawing files on the user's device are encrypted | `03_ARCHITECTURE/SECURITY.md` §2 | Engineering / Founder | `SECURITY.md` | **Open — TBD; OS keychain-based options via Tauri** |
| OD-13 | **Desktop app auto-update strategy:** how the Tauri application receives and applies updates | `05_IMPLEMENTATION/DEPLOYMENT.md` §2 | Engineering | `DEPLOYMENT.md` | **Open — TBD** |

| OD-15 | **Create Project: modal vs. dedicated page** | `06_PAGES/CREATE_PROJECT.md` Open Questions | Founder (design decision) | `CREATE_PROJECT.md` | **Open — currently listed as a page; likely modal in final design** |
| OD-16 | **Line Item Details: panel/drawer vs. full page** | `06_PAGES/LINE_ITEM_DETAILS.md` Open Questions | Founder (design decision) | `LINE_ITEM_DETAILS.md` | **Open — contextual surface preferred per founder direction** |
| OD-17 | **Takeoff Review: bulk-approve at MVP** | `06_PAGES/TAKEOFF_REVIEW.md` Open Questions | Product | `TAKEOFF_REVIEW.md` | **Open — TBD** |
| OD-18 | **Takeoff Review: inline AI Q&A vs. side-panel session** | `06_PAGES/TAKEOFF_REVIEW.md` Open Questions | Product / Design | `TAKEOFF_REVIEW.md` | **Open — TBD** |
| OD-19 | **Processing page: auto-navigate vs. prompt on completion** | `06_PAGES/PROCESSING.md` Open Questions | Product / Design | `PROCESSING.md` | **Open — TBD** |
| OD-22 | **Estimate entity model:** separate `Estimate` table with FK to TakeoffRun, or derived fields on TakeoffRun? | `03_ARCHITECTURE/DATA_MODEL.md` §3, future Estimate feature | Engineering | `DATA_MODEL.md` | **Open — must resolve before building Estimate** |
| OD-23 | **Bid/Proposal mechanics:** what does a Bid contain? pricing adjustments, alternates, terms, proposal format — entirely unspecified | `06_PAGES/PROJECT_NAVIGATION.md` | Founder / Product | `PROJECT_NAVIGATION.md`, `LONG_TERM_VISION.md` | **Open — requires discovery + spec. Do not design until resolved** |
| OD-25 | **Discipline Role model:** single- vs. multi-select, per-project vs. per-org default, fixed vs. org-customizable taxonomy, exact UI for curated first-view | `DOMAIN/COLLABORATION.md` §7 | Product / Founder | `DOMAIN/COLLABORATION.md`, `01_PRODUCT/USER_ROLES.md` §6 | **Open — required before Discipline Role tagging can be built** |
| OD-27 | **Stale evidence detection:** how changes/re-uploads to cited documents trigger stale-evidence flags on existing plan claims | `docs/PLAN.md` §11, `03_ARCHITECTURE/DATA_MODEL_SCHEMA.md` | Engineering | `docs/PLAN.md` §11 | **Open — candidate; deferred until document versioning/hash model is designed** |

---

## Resolved Decisions (Archive)

*(Move items here once resolved, with the date resolved and the owning document where the decision is recorded.)*

| ID | Decision | Resolved | Document |
|---|---|---|---|
| OD-01 | Database engine (Supabase PostgreSQL) | 2026-08-23 | `TECH_STACK.md`, `DATA_MODEL.md` |
| OD-02 | Job queue technology (Redis + Celery) | 2026-08-23 | `EVENT_SYSTEM.md`, `TECH_STACK.md` |
| OD-10 | Auth provider (Supabase Auth) | 2026-08-23 | `SECURITY.md`, `TECH_STACK.md` |
| OD-12 | Retention / deletion policy (30-day grace period) | 2026-08-23 | `DATA_LIFECYCLE.md` |
| OD-14 | Dashboard vs. Projects as separate surfaces | 2026-08-24 | `02_DESIGN/NAVIGATION.md` §5 — locked as separate (Dashboard = org pulse; Projects = library) |
| OD-20 | Typography (Urbanist + Plex Mono) | 2026-08-23 | `DESIGN_SYSTEM.md` |
| OD-21 | Spacing scale (8px base) | 2026-08-23 | `DESIGN_SYSTEM.md` |
| OD-24 | Project Intelligence grounding procedure + Decision/Activity entities | 2026-08-28 | `docs/PLAN.md` §2, `DOMAIN/PROJECT_INTELLIGENCE.md` (Resolved by founder authorization, 2026-08-28) |

---

## Cross-References

- `00_PROJECT/PRODUCT_SCOPE.md` §5 (scope change process, related)
- `03_ARCHITECTURE/DATA_MODEL.md` (ADR for DB engine — OD-01)
- `03_ARCHITECTURE/EVENT_SYSTEM.md` (queue + realtime — OD-02, OD-03, OD-04)
- `03_ARCHITECTURE/STORAGE.md` (collaboration file-sharing — OD-05)
- `04_AI/TRAINING.md` (training consent — OD-06)
- `07_OPERATIONS/DATA_LIFECYCLE.md` (retention/deletion — OD-12)

# Vectoris — MVP Boundary (Authoritative)

**Status:** LOCKED  
**Owner of:** Root-level definitive list of MVP in-scope and out-of-scope items  
**Does not own:** Feature-level detail (→ `01_PRODUCT/FEATURE_MAP.md`), page specs (→ `06_PAGES/*`), near-term/long-term vision (→ `LONG_TERM_VISION.md`)

> This document is the authoritative root-level statement. Any document that describes something outside the **In Scope** list below as currently buildable is inconsistent with this document and must be corrected. See `00_PROJECT/PRODUCT_SCOPE.md` for the full three-horizon model and the scope change process.

---

## In Scope — MVP (Build Now)

| Item | Detail |
|---|---|
| Document ingestion | PDF (native-vector and scanned/raster) as primary; ingestion abstraction also architected for DWG, DXF, image, Excel |
| Sheet classification | Identify sheet type: floor plan, schedule, legend, notes, single-line diagram |
| Electrical component detection | Symbol/component detection with bounding-box source evidence |
| Discrete counting | Aggregate detected instances into line-item counts |
| Geometry / length measurement | Cable tray, conduit, and similar linear/area quantities |
| Side-by-side review UI | Drawing canvas alongside AI-proposed takeoff — the Takeoff Workspace |
| Human correction workflow | Accept / reject / edit / add / delete on any detection or line item |
| Manual line item creation | User-drawn bounding box → classified line item in same data model |
| Structured correction capture | Every correction recorded as a `CorrectionEvent` with all required fields |
| Export | XLSX, CSV, JSON, PDF |
| Organizations | Create org, invite members via link, role assignment |
| Roles | Owner / Admin / Manager / Editor / Viewer with org/project/session scopes |
| Multi-user projects | Multiple users on the same project concurrently (conflict handling TBD) |
| AI chat sessions | Project-scoped agentic sessions with tool-using Brain; multiple sessions per project |
| Agentic AI (Brain + Perception + Tools + Memory + Control) | Full agentic hybrid architecture at MVP — prompting/scaffolding first, fine-tuning later |
| Audit / correction event ledger | Structured, append-only record; foundation for future learning pipeline |

---

## Explicitly Out of Scope — Do Not Build Yet

Consolidated from `README.md` (H1-specific) and `SCOPE.md` §24 (company-wide):

| Out of Scope Item | Horizon |
|---|---|
| Material / labor estimating | Near-term / Long-term |
| CPQ (Configure-Price-Quote) | Long-term — mature incumbent category |
| Pricing intelligence | Long-term |
| Commercial intelligence | Long-term |
| Proposal generation | Long-term |
| BOQ generation | Near-term / Long-term |
| Application / where-used mapping | Near-term |
| Product / material selection | Near-term / Long-term |
| Company memory (learning system) | Near-term foundations / Long-term full |
| Requirement-based entry (H2 pathway) | Near-term (post Gate H2-1) |
| Revision & addenda intelligence | Near-term candidate (competitively contested) |
| Cross-OEM configuration | Long-term |
| Full HVAC / plumbing takeoff | Long-term |
| Full MEP platform | Long-term |
| Project management | Long-term |
| CRM | Long-term |
| ERP | Long-term |
| Procurement marketplace | Long-term |
| Accounting | Long-term |
| Autonomous engineering approval | Rejected — human approval is non-negotiable |
| Autonomous pricing decisions | Rejected — human approval is non-negotiable |
| Full negotiation automation | Long-term |
| Conduit/wire quantity estimation without validation | Long-term (requires validated spike) |

---

## Why the Boundary Exists

The first job is: **turn electrical drawings into a trustworthy, editable, evidence-backed first-pass takeoff.**

Nothing else earns the right to be built until this works — per the original `README.md` statement, carried forward unchanged into this product generation.

The H1/H2 architectural merge (H1 and H2 as two entry points into one pipeline) is a **data-model and architecture** decision, not a scope expansion. It does not authorize building the requirement-entry (H2) pathway now — see `00_PROJECT/PRODUCT_SCOPE.md` §3.

---

## Scope Change Process

Any expansion of the MVP boundary requires:

1. A passed discovery Gate (per legacy `THESIS.md` Gates framework)
2. An explicit update to this document
3. A corresponding update to `00_PROJECT/PRODUCT_SCOPE.md` and `01_PRODUCT/FEATURE_MAP.md`
4. No document may silently assume expanded scope

---

## Cross-References

- `00_PROJECT/PRODUCT_SCOPE.md` — three-horizon model, change process
- `00_PROJECT/PRD.md` — functional requirements within this boundary
- `01_PRODUCT/FEATURE_MAP.md` — feature → horizon mapping
- `LONG_TERM_VISION.md` — the horizon this boundary deliberately does not build toward yet
- `OPEN_DECISIONS.md` — unresolved questions that could affect this boundary once answered

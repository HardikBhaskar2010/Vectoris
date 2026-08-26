# Vectoris — Product Scope

**Status:** LOCKED  
**Owner of:** Explicit MVP / near-term / long-term boundary  
**Does not own:** Page-level detail (→ 06_PAGES), architecture (→ ARCHITECTURE.md)

---

## 1. Three Horizons

| Horizon | Definition | Authorization |
|---|---|---|
| **CURRENT MVP** | Drawing-first takeoff: ingest → detect → count/measure → human correct/approve → export | Authorized now |
| **NEAR-TERM EXPANSION** | Requirement-based entry, multi-file agent reasoning, session sharing, early company memory | Requires passing relevant discovery Gates (legacy `THESIS.md`) before spec'd |
| **LONG-TERM VISION** | Full pipeline: engineering intelligence, BOQ, pricing, commercial intelligence, proposal generation, project management | Not authorized; architecture must not preclude it, implementation must not build toward it prematurely |

This mirrors the legacy `SCOPE.md`'s own discipline: *"The end state is large. The first product must be small."*

## 2. MVP Boundary (Authoritative — see also `../MVP_BOUNDARY.md`)

### In Scope Now
- PDF/scanned PDF ingestion, sheet classification
- Electrical symbol/component detection with evidence
- Discrete counting AND geometry/length measurement
- Side-by-side review, correction, approval workflow
- Structured correction event capture
- Export (XLSX/CSV/JSON/PDF)
- Organizations, roles, multi-user projects
- Project chat sessions (AI agent, tool-using, evidence-linked)

### Explicitly Out of Scope Now
Carried forward and generalized from legacy `README.md` (H1-specific) and `SCOPE.md` §24 (company-wide):

Full material/labor estimating · CPQ · pricing intelligence · commercial intelligence · proposal generation · full MEP/HVAC/plumbing takeoff · project management · CRM · ERP · procurement marketplace · accounting · autonomous engineering approval · autonomous pricing decisions · full negotiation automation · conduit/wire quantity estimation without validation.

## 3. Why H1/H2 Merge Doesn't Expand the MVP

The founder's decision to architect H1 and H2 as one pipeline (see `VISION.md` §4) is an **architectural** decision about how the eventual system's data model fits together (shared line-item structure, application/where-used semantics). It is explicitly **not** a decision to build the requirement-entry pathway now. The MVP remains drawing-only. Any document that describes requirement-entry, BOQ generation, pricing, or proposal generation as currently buildable is inconsistent with this document and must be corrected.

## 3a. Project Intelligence / Collaboration Reframing Does Not Expand the MVP

`VISION.md` §3a locks a broader framing of Vectoris as a shared Project Intelligence workspace (see `../DOMAIN/PROJECT_INTELLIGENCE.md`, `../DOMAIN/COLLABORATION.md`). Like the H1/H2 merge in §3 above, this is a **framing and target-architecture** decision, not a scope expansion. Grounded cross-document project synthesis ("explain this project"), Decision/Activity entities, and Discipline Role tagging are **NEAR-TERM, OPEN DECISION** (OD-24, OD-25 in `../OPEN_DECISIONS.md`) — none are authorized for build under the current MVP boundary.

## 4. Candidate Wedges Beyond Drawing Takeoff (Not Yet Authorized)

Preserved from legacy `SCOPE.md` §5 candidate wedge table: Revision & Addenda Intelligence (scripted, competitively contested as of Aug 2026), post-takeoff assembly mapping, engineering constraint intelligence, cross-OEM configuration, standalone product selection, proposal QA, bid pricing optimization. None are MVP scope. Feature-mapped in `../01_PRODUCT/FEATURE_MAP.md`.

## 5. Scope Change Process

Any expansion beyond the MVP boundary requires: (1) a passed discovery Gate, (2) an explicit update to this document and `MVP_BOUNDARY.md`, (3) a corresponding update to `FEATURE_MAP.md`. No document may silently assume expanded scope.

## 6. Cross-References

- `PRD.md` — functional requirements within this boundary
- `../MVP_BOUNDARY.md` — root-level summary
- `../LONG_TERM_VISION.md` — the horizon this scope deliberately does not build toward yet

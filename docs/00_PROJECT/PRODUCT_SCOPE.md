# Vectoris — Product Scope

**Status:** LOCKED  
**Owner of:** Explicit MVP / near-term / long-term boundary  
**Does not own:** Page-level detail (→ 06_PAGES), architecture (→ ARCHITECTURE.md)

---

## 1. Three Horizons

| Horizon | Definition | Authorization |
|---|---|---|
| **CURRENT MVP** | Drawing-first takeoff inside the Project workspace: Project context → Documents/Drawings → AI Detection → Human Verification → Takeoff → Export | Authorized now |
| **NEAR-TERM EXPANSION** | Downstream BOQ generation, engineering application mapping, requirement-based entry, project-level synthesis | Requires passing relevant discovery Gates (legacy `THESIS.md`) before implementation |
| **LONG-TERM VISION** | Full end-to-end workflow pipeline: BOQ → Engineering → Estimation → Commercial → Bids → Delivery inside the Project Intelligence workspace | Architecture accommodates this progression; implementation focuses on validated wedges |

This mirrors the core engineering discipline: *"The end state is large. The first product must be small and precise."*

## 2. MVP Boundary (Authoritative — see also `../MVP_BOUNDARY.md`)

### In Scope Now
- Native Project container: Multi-user projects, organizations, roles, project document repository
- PDF/scanned PDF ingestion, sheet classification
- Electrical symbol/component detection with evidence
- Discrete counting AND geometry/length measurement
- Side-by-side review, correction, approval workflow
- Structured correction event capture
- Export (XLSX/CSV/JSON/PDF)
- Project chat sessions (AI agent, tool-using, evidence-linked)

### Explicitly Out of Scope Now
Carried forward and generalized from legacy `README.md` and `SCOPE.md`:

Full material/labor estimating · CPQ · pricing intelligence · commercial intelligence · proposal generation · full MEP/HVAC/plumbing takeoff · generic CRM · generic ERP · procurement marketplace · accounting · autonomous engineering approval · autonomous pricing decisions · full negotiation automation · conduit/wire quantity estimation without validation.

## 3. Why H1/H2 Merge Doesn't Expand the MVP

The founder's decision to architect H1 and H2 as one pipeline (see `VISION.md` §4) is an **architectural** decision about how the eventual system's data model fits together (shared line-item structure, application/where-used semantics). It is explicitly **not** a decision to build the requirement-entry pathway now. The MVP remains drawing-only. Any document that describes requirement-entry, BOQ generation, pricing, or proposal generation as currently buildable is inconsistent with this document and must be corrected.

## 3a. Project-Centric Architecture vs. Implementation Scope

`VISION.md` §3 establishes that Vectoris is fundamentally a **Project Management and Project Intelligence workspace** where estimating, takeoff, and bidding are major sequential workflows:

$$\text{\bf Product Architecture (Project Container)} \ne \text{\bf Current Implementation Scope (Takeoff MVP)}$$

1. **Product Architecture**: The Project is the root object. Project Intelligence is the foundational context layer connecting Drawings, Documents, AI, and Collaboration.
2. **Implementation Scope**: The current MVP is focused on delivering the validated drawing-first takeoff wedge with excellence.
3. **Restraint**: Reframing Vectoris as a Project Workspace does **not** mean turning Vectoris into an ERP/CRM or building the entire downstream estimating and bidding pipeline immediately. Downstream workflows (BOQ, Estimation, Pricing, Bids) remain sequential horizons built upon the validated takeoff foundation.

## 4. Candidate Wedges Beyond Drawing Takeoff (Not Yet Authorized)

Preserved from legacy `SCOPE.md` §5 candidate wedge table: Revision & Addenda Intelligence (scripted, competitively contested as of Aug 2026), post-takeoff assembly mapping, engineering constraint intelligence, cross-OEM configuration, standalone product selection, proposal QA, bid pricing optimization. None are MVP scope. Feature-mapped in `../01_PRODUCT/FEATURE_MAP.md`.

## 5. Scope Change Process

Any expansion beyond the MVP boundary requires: (1) a passed discovery Gate, (2) an explicit update to this document and `MVP_BOUNDARY.md`, (3) a corresponding update to `FEATURE_MAP.md`. No document may silently assume expanded scope.

## 6. Cross-References

- `PRD.md` — functional requirements within this boundary
- `../MVP_BOUNDARY.md` — root-level summary
- `../LONG_TERM_VISION.md` — the horizon this scope deliberately does not build toward yet

# Vectoris — Long-Term Vision

**Status:** RECOMMENDED (detail) · LOCKED (direction)  
**Owner of:** Detailed description of the full long-term system — what Vectoris eventually becomes  
**Does not own:** MVP boundaries (→ `MVP_BOUNDARY.md`), near-term scope (→ `00_PROJECT/PRODUCT_SCOPE.md`), current phase plan (→ `05_IMPLEMENTATION/DEVELOPMENT_PHASES.md`)

> This document describes where Vectoris is going, not what is authorized to be built now. Nothing here overrides `MVP_BOUNDARY.md` or the Gates in the legacy `THESIS.md`. See `00_PROJECT/VISION.md` for the condensed version.

---

## 1. The Long-Term Destination

Vectoris is intended to become a **commercial engineering intelligence system** for electrical/MEP work: a single AI-native system that transforms a messy customer requirement or drawing package into a trustworthy, commercially viable, human-approved technical proposal.

The full pipeline, from any entry point to a delivered proposal:

```text
Any Project Input (Drawing Package / Customer Requirement / Existing BOQ / Specification / RFP)
        ↓
Project Understanding (type, scope, systems in scope)
        ↓
        ┌──────────────────────────────────────────────┐
        │ Drawing Path (H1)    │ Requirement Path (H2) │
        │ Symbol Detection     │ Requirement Parsing   │
        │ Quantity Takeoff     │ Solution Configuration│
        └──────────┬───────────┴──────────────────────┘
                   ↓
   Application / Where-Used Reasoning
   (what is this component for, within this project?)
                   ↓
   Product / Material Selection
   (which SKU from which vendor satisfies this requirement?)
                   ↓
   BOQ / BOM Generation
   (item · description · specification · application · qty · UOM · product · vendor)
                   ↓
   Current Company Pricing
   (retrieved from authoritative source — never baked into model weights)
                   ↓
   Cost Estimation (material + labor)
                   ↓
   Commercial Intelligence (margin, risk, historical context)
                   ↓
   Ideal Bid Price (recommended, not autonomous)
                   ↓
   Proposal Generation (technical summary + BOQ + commercial summary)
                   ↓
   Human Review & Approval (non-negotiable at every commercial stage)
                   ↓
   Project Outcome → Company Memory / Institutional Learning
```

This is the same diagram from the legacy `SCOPE.md` §23 ("Drawing Path" and "Requirement Path" converging), now expressed as the full system map.

---

## 2. Why This Shape

The H1/H2 merge decision (founder-locked, Aug 2026) recognized that a drawing-derived line item (H1 output) and a requirement-derived line item (H2 input) are structurally the same thing — both feed the same downstream pipeline. The long-term system is not two alternative tools; it is one pipeline that can be entered from whichever input the customer has today.

Evidence from the two historical BOQs (GB 300 data-center, Emerson PAC/HVAC) confirmed that real, commercially useful BOQ line items already carry:
- Application / where-used context (not just bare quantities)
- System/subsystem membership  
- Specification (cable sizing, ratings, etc.)  
- UOM-normalized quantities  
- Engineering basis / rationale

This means the long-term line-item data model is not a future invention — it is what real BOQs already look like. The MVP populates a deliberate subset; the long-term system populates the rest.

---

## 3. Long-Term Capabilities by Workstream

*(Directly from `SCOPE.md`'s 15-workstream map — summarized here for completeness)*

| Workstream | Long-Term Capability | Current Status |
|---|---|---|
| W1: Customer Discovery | Ongoing — not a product capability | Active |
| W2: Workflow Mapping | Ongoing | Active |
| W3: Project & Drawing Intelligence | Document ingestion (MVP), + BOQ/spec/RFQ input (future) | MVP: partial; Future: W3 extension |
| W4: Revision & Addenda Intelligence | Semantic diff across drawing revisions | Near-term candidate (competitively contested) |
| W5: Engineering & Solution Intelligence | Application/where-used mapping; bidirectional H1/H2 reasoning | Near-term / Long-term |
| W6: Cross-OEM Product Intelligence | Multi-vendor compatibility, equivalent-product discovery | Long-term |
| W7: Product Catalog Intelligence | Requirement → company product/SKU mapping | Long-term |
| W8: BOQ / BOM Generation | Full canonical BOQ with all semantics | Near-term / Long-term |
| W9: Pricing Intelligence | Retrieval of current authoritative price; current/historical/recommended distinction | Long-term |
| W10: Cost Estimation | Material + labor total project cost | Long-term |
| W11: Ideal Bid Pricing | Recommended commercial price — explainable, human-approved | Long-term |
| W12: Commercial Intelligence | Scenario analysis, margin risk, historical comparison | Long-term |
| W13: Proposal Generation | Full techno-commercial proposal | Long-term |
| W14: Human-in-the-Loop Control | Cross-workstream control principle — not a feature, an architectural rule | All phases |
| W15: Company Memory | Institutional learning from approved engineering/commercial decisions | Near-term foundations / Long-term full |

---

## 4. The Canonical Long-Term Line-Item Data Model

Carried forward from `README.md`'s "Canonical Line-Item Data Model" section:

```text
Project · Project Type · System/Subsystem · Category · Item / Requirement
  · Description · Where Used / Application · Specification · Quantity · UOM
  · Source Drawing / Document · Source Location · Engineering Rationale
  · Product Mapping · Manufacturer · Model / SKU · Pricing Source
  · Unit Price · Price Date · Human Approval · Confidence
```

The MVP populates: Item, Description, Specification, Quantity, UOM, Source Drawing/Document, Source Location, Human Approval status.  
Application/Where Used, Product Mapping, and Pricing fields are **Stage 4+ / Long-term** — not MVP output.

---

## 5. What Remains Unvalidated

The long-term vision is architecturally settled. What is **not** settled is the market evidence for each stage beyond H1's drawing takeoff:

| Pipeline Stage | Market Evidence Status |
|---|---|
| Drawing takeoff (H1) | Category validated (Quotr, Countfire, Beam AI, etc. all exist) — differentiation hypothesis is what needs validating |
| Requirement-based configuration (H2) | Weak-to-Medium (one discovery call, Shubham Singh / Schneider Electric, Aug 2026) |
| Application / where-used mapping | Workflow evidence only (historical BOQs) — no customer interview evidence |
| Product / material selection | Not yet scripted |
| BOQ generation | Covered as downstream output of H1/H2 discovery, not tested standalone |
| Pricing, commercial intelligence | Not yet scripted |
| Proposal generation | Not yet scripted |

Nothing in this document authorizes building beyond what has passed its Gate. See the Gates in legacy `THESIS.md` for the validation framework.

---

## 6. Core Principle Across All Horizons

> **AI proposes. The expert decides. The system remembers why.**

This principle does not get relaxed as the system grows. The more commercially consequential the AI's suggestion (a product selection, a price, a proposal), the more important the human-approval boundary becomes — see `04_AI/AI_SYSTEM.md` §3 and `03_ARCHITECTURE/SECURITY.md`.

---

## 7. Cross-References

- Condensed vision: `00_PROJECT/VISION.md`
- MVP boundary: `MVP_BOUNDARY.md`
- Three-horizon scope model: `00_PROJECT/PRODUCT_SCOPE.md`
- 15-workstream detail: legacy `SCOPE.md`
- H1/H2 merge rationale: `README.md` (H1 and H2 — Merged Pipeline section), legacy `THESIS.md`
- Canonical BOQ line-item: `README.md` (MVP Data Model), `SCOPE.md` §13

# Vectoris — Vision

**Status:** LOCKED (direction) · Details RECOMMENDED/TBD as marked  
**Owner of:** Long-term "why," product philosophy, north star  
**Does not own:** MVP boundaries (→ PRODUCT_SCOPE.md), tech choices (→ TECH_STACK.md), page detail (→ 06_PAGES)

---

## 1. What Vectoris Is

Vectoris is **one unified product**: an AI-native engineering and commercial intelligence system for electrical/MEP work, evolving toward AI-native project engineering and, eventually, broader project management.

It is not two products. The prior "H1" (Drawing Intelligence) and "H2" (Engineering & Commercial Intelligence) hypotheses from the DrawSpec discovery phase are **not separate products** — they are two entry pathways into one underlying pipeline. This framing was already emerging in the legacy README ("H1 and H2 as sequential, not competing") and is now a founder-locked architectural decision, not a hypothesis.

## 2. Core Principle

> **AI proposes. The human decides. The system remembers why.**

Every AI action in Vectoris must be traceable to evidence, reversible by a human, and recorded with enough context to reconstruct "what did Vectoris believe, and what did the human change."

## 3. The Long-Term Vision (Not the MVP)

The ultimate system spans:

```mermaid
flowchart LR
    A[Project Understanding] --> B[Project Design / Engineering Intelligence]
    B --> C[Drawing Intelligence / Requirements Understanding]
    C --> D[Takeoff]
    D --> E[Application / Where-Used Reasoning]
    E --> F[Product / Material Selection]
    F --> G[BOQ / BOM Generation]
    G --> H[Pricing Intelligence]
    H --> I[Commercial Intelligence]
    I --> J[Proposal Generation]
    J --> K[Collaboration + Company Memory]
    K --> L[Line-Item R&D / Engineering Research]
    L --> M[Project Execution + Project Management]
```

This diagram is the same convergent pipeline described in the legacy `SCOPE.md` §23 ("Drawing Path" and "Requirement Path" converging on BOQ → Pricing → Proposal), now generalized: Vectoris is the single agentic system that eventually operates across the whole loop, entered from whichever input the customer has (drawings, requirements, existing BOQs, specifications).

**This is vision, not a build plan.** See `PRODUCT_SCOPE.md` and `MVP_BOUNDARY.md` (root of `docs/`) for what is actually authorized to be built now.

## 4. Why This Problem, Why Now

Carried forward from the legacy discovery/thesis documents (evidence status preserved, not upgraded):

- **H1 evidence (Drawing Intelligence):** The "AI takeoff + human review" pattern is an already-served baseline (Quotr.ai, Countfire, Beam AI, BuildVision AI, Togal.AI, Bobyard, Drawer.AI). Differentiation must come from deeper electrical-specific interpretation, evidence-backed auditability, and — unvalidated — a compounding learning system, not from the existence of AI takeoff itself.
- **H2 evidence (Engineering & Commercial Intelligence):** Surfaced by a single discovery call (Shubham Singh, Schneider Electric, Aug 2026), graded **Weak-to-Medium** signal strength per the DrawSpec discovery framework — a real, specific pain description, not validated demand. CPQ is a mature, incumbent-owned category (Salesforce, SAP, Oracle, Tacton, servicepath); the plausible gap is narrow: electrical/MEP-specific, cross-OEM, compliance-aware configuration — not "AI CPQ" broadly.
- **Historical BOQ evidence** (GB 300, Emerson Climate Technologies) shows real completed line items already carry application/where-used semantics that pure symbol-counting would never capture — this is workflow evidence, not market validation, and is the origin of the founder's decision to unify H1/H2 into one pipeline with two entry points.

**Founder decision (locked, not hypothesis):** H1 and H2 are merged into a single Vectoris pipeline with two entry points — drawings-in and requirements-in — converging on the same downstream data model (line items → application mapping → product selection → BOQ → pricing → proposal). This decision is architectural. It does **not** change what is authorized to be built first (see §5 below and `MVP_BOUNDARY.md`).

## 5. What Ships First vs. What Vectoris Becomes

| | MVP (build now) | Near-term expansion | Long-term vision |
|---|---|---|---|
| Entry point | Drawings only | Requirements, existing BOQs | Any project input |
| Output | Evidence-backed takeoff | + BOQ, application mapping | Full proposal, pricing, PM |
| AI role | Detection + counting/measurement, human-corrected | + reasoning across files | Full agentic project partner |
| Collaboration | Single/multi-user org, basic roles | Session sharing | Company-wide institutional memory |

Full detail: `PRODUCT_SCOPE.md`, `MVP_BOUNDARY.md`, `FEATURE_MAP.md`.

## 6. Product Values

1. **Evidence over assertion.** Every AI output traces to a source (drawing region, document, prior decision).
2. **Human authority.** AI never silently overwrites approved data.
3. **Small first product, large architecture.** Architect for the full pipeline; build only the validated wedge.
4. **Local-first trust.** Customer drawings are confidential engineering/commercial data by default (see `STORAGE.md`, `SECURITY.md`).
5. **Honest uncertainty.** Unknown facts are marked TBD, not invented — in the product's own outputs and in this documentation.

## 7. Cross-References

- MVP boundary and scope discipline: `PRODUCT_SCOPE.md`, `../MVP_BOUNDARY.md`
- Long-term system detail: `../LONG_TERM_VISION.md`
- What the product must do at MVP: `PRD.md`
- Vocabulary: `GLOSSARY.md`

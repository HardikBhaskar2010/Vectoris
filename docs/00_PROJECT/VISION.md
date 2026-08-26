# Vectoris — Vision

**Status:** LOCKED (direction) · Details RECOMMENDED/TBD as marked  
**Owner of:** Long-term "why," product philosophy, north star  
**Does not own:** MVP boundaries (→ PRODUCT_SCOPE.md), tech choices (→ TECH_STACK.md), page detail (→ 06_PAGES)

---

## 1. What Vectoris Is

Vectoris is **one unified product**: an AI-native Project Management and Project Intelligence workspace for electrical and MEP engineering, where takeoff, estimation, and bidding are major sequential workflows inside the Project container.

It is **not** an ERP, CRM, or generic accounting suite. Nor is it merely an isolated, single-purpose "AI Takeoff App". 

Vectoris is the project-centric workspace where engineering, commercial estimation, and project intelligence converge around shared project evidence.

## 2. Core Principle

> **AI proposes. The human decides. The system remembers why.**

Every AI action in Vectoris must be traceable to evidence, reversible by a human, and recorded with enough context to reconstruct "what did Vectoris believe, and what did the human change."

## 3. The Target Product Architecture

The overarching Vectoris architecture we are converging toward is:

```text
                    VECTORIS
                       │
                 ┌──── PROJECT ────┐
                 │                 │
          PROJECT INTELLIGENCE     │
                 │                 │
     ┌───────────┼────────────┐    │
     ↓           ↓            ↓    ↓
  Drawings    Documents      AI   Collaboration
     │
     ↓
  Takeoff
     │
     ↓
    BOQ
     │
     ↓
 Engineering
     │
     ↓
 Estimation
     │
     ↓
 Commercial
     │
     ↓
    Bids
     │
     ↓
  Delivery
```

And today's **Takeoff MVP** is the first operational wedge executed directly inside this architecture:

```text
Project
  ↓
Documents / Drawings
  ↓
AI + Detection
  ↓
Human Verification
  ↓
Takeoff
  ↓
Export
```

This ensures that building the focused Takeoff MVP today happens inside the correct long-term Project-centric container without breaking the overarching architecture.

## 3a. The Project Is the Primary Object

**Status: LOCKED (Product Architecture & Foundation)**

Vectoris is not defined by any single isolated tool inside it. It is not an ad-hoc takeoff calculator, an isolated BOQ generator, or a detached document chatbot — those are workflows and capabilities that live *inside* Vectoris's primary container: the **Project**.

Project Intelligence is the foundational context layer of the workspace. It answers: *"What is this project, what evidence exists, what decisions have been made, and what is currently unresolved?"*

The sequential workflow progression across a Project lifecycle is:

```text
UNDERSTAND → EXPLORE → COLLABORATE → ENGINEER → ESTIMATE → BID → DELIVER
```

These are not disconnected products — they are progressive stages of the same underlying Project Intelligence workspace used by teams over time:
- **Drawings, Documents, AI Sessions, Collaboration**: Shared evidence and interaction surfaces within the project container (see `../DOMAIN/PROJECT_INTELLIGENCE.md`, `../DOMAIN/COLLABORATION.md`).
- **Takeoff → BOQ → Engineering → Estimation → Commercial → Bids → Delivery**: Sequential downstream workflows operating on validated project data.

**Scope Discipline**: Establishing the Project as the root architectural container does not mean building every downstream stage immediately. The MVP focuses strictly on the drawing-first takeoff wedge, while the project-centric architecture guarantees seamless extension into downstream estimating and commercial workflows.

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
- Project-as-primary-object detail: `../DOMAIN/PROJECT_INTELLIGENCE.md`, `../DOMAIN/COLLABORATION.md`

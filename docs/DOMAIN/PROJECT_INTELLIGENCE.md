# Vectoris — Project Intelligence (Domain Specification)

**Status:** LOCKED (Architecture & Workspace Framing) · Details as marked
**Owner of:** What "the Project understands about itself" means, how that understanding is assembled and grounded, and how a person (or the Agent, on a person's behalf) draws on it
**Does not own:** MVP scope authority (→ `../MVP_BOUNDARY.md`, `../00_PROJECT/PRODUCT_SCOPE.md`), org/role mechanics (→ `COLLABORATION.md`), AI Session UI (→ `../06_PAGES/AI_SESSION.md`), takeoff mechanics (→ `TAKEOFF.md`)

> Vectoris is fundamentally an **AI-native Project Management & Project Intelligence workspace**, where estimating, takeoff, and bidding are major sequential workflows inside the Project container.

---

## 1. What "Project Intelligence" Means

Project Intelligence is the answer Vectoris can give, at any point in a project's life, to: **"What is this project, and what do we currently know about it?"**

It is **not** an ad-hoc add-on feature deferred to the future. It is the foundational architectural container and context layer connecting all data Vectoris manages for a project — drawings, documents, AI sessions, takeoff runs, line items, and collaborative activity.

This directly embodies `VISION.md`'s core principle — **"AI proposes. The human decides. The system remembers why."** — at the project scope: the workspace maintains a grounded, evidence-backed understanding of project state.

## 2. Why This Is Needed (Not Just "a Chatbot Over Documents")

Per `AI_SESSION.md` §AI Behavior, the Vectoris Agent must produce evidence-linked responses and must not fabricate values. Project Intelligence extends this discipline across the entire project corpus.

The gap this closes: today, a general question like *"Explain this project to me"* requires the Agent to reason across every document, the takeoff state, and prior sessions in one pass. `PROJECT_OVERVIEW.md` summarizes project *state* (documents, progress, recent sessions) for quick scanning; Project Intelligence is the deeper synthesis capability that draws on verified evidence, explicit human decisions, and domain understanding.

## 3. What Project Intelligence Draws On (Evidence Sources)

| Source | Already Modeled? | What It Contributes |
|---|---|---|
| `Document` (uploaded files) | Yes (`DATA_MODEL.md`) | Raw project material — specs, drawings, schedules, RFPs |
| `LineItem` / `TakeoffRun` / `Detection` | Yes | What has been quantified, with source evidence |
| `CorrectionEvent` | Yes | What a human changed, and why |
| AI `Session` history | Yes (`AI_SESSION.md`) | Prior discussions and analytical findings |
| Project metadata (type, discipline) | Yes, with provenance (`ai_inferred` / `user_provided` / `verified`) | Scope framing |
| **Decisions** | **Candidate entity** | Explicit record of human determinations on ambiguous scope |
| **Activity feed** | **Candidate entity** | Chronological project-level event stream |

## 4. Grounded Synthesis — the Non-Negotiable Rule

- Every synthesized statement about a project must be traceable to specific evidence (a document, a takeoff line, a prior human-verified answer).
- Where evidence is absent or thin, Project Intelligence must state so explicitly ("unresolved" or "not yet analyzed").
- Project Intelligence distinguishes: **known from evidence**, **inferred**, **explicitly decided by a human**, and **unresolved/unknown**.
- A human Decision, once recorded, outranks automated inference.

## 5. Relationship to AI Sessions

Project Intelligence is the shared grounding layer that project-scoped AI Sessions draw upon:
- A project-scoped AI Session's context is grounded in Project Intelligence (what exists, what's verified, what's outstanding).
- Role-aware inquiries route to the relevant domain slice (e.g. electrical/lighting vs power feeder vs HVAC).
- Works with the Agent's tool-use and evidence-card mechanics (`AI_SESSION.md`).

## 6. Target Project Architecture

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

And the current **Takeoff MVP** is the operational wedge built directly inside this container:

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

## 7. MVP vs. Downstream Horizons

| Capability | Horizon | Rationale |
|---|---|---|
| Project workspace container + documents + takeoff summary scanning | **MVP (Built/In Scope)** | Core foundational container |
| Evidence-linked answers to project-scoped questions via AI Session | **MVP (Built/In Scope)** | Fully supported via `AI_SESSION.md` |
| Deep automated cross-document synthesis ("explain this project") | **NEAR-TERM (OD-24)** | Requires standardized grounding heuristic before release |
| Curated first-view by discipline role | **NEAR-TERM (OD-25)** | Builds on `COLLABORATION.md` discipline model |
| Downstream estimating, BOQ, bidding, delivery workflows | **SEQUENTIAL HORIZONS** | Built on the validated takeoff foundation |

## 8. Cross-References

- `../00_PROJECT/VISION.md` — "Project as Primary Object" framing this document supports
- `COLLABORATION.md` — how a project becomes useful to someone who did not create it
- `../06_PAGES/AI_SESSION.md` — the interface this capability grounds
- `../06_PAGES/PROJECT_OVERVIEW.md` — the existing, lighter-weight state-scanning surface (not superseded)
- `ESTIMATION_BIDDING_DOMAIN.md` — the evidence-classification discipline this document reuses (§4)
- `../OPEN_DECISIONS.md` — OD-24, OD-25

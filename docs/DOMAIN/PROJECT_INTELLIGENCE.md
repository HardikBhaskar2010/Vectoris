# Vectoris — Project Intelligence (Domain Specification)

**Status:** PROPOSED (framing) · NEAR-TERM/FUTURE (capability) — see §7 for MVP boundary
**Owner of:** What "the Project understands about itself" means, how that understanding is assembled and grounded, and how a person (or the Agent, on a person's behalf) draws on it
**Does not own:** MVP scope authority (→ `../MVP_BOUNDARY.md`, `../00_PROJECT/PRODUCT_SCOPE.md`), org/role mechanics (→ `COLLABORATION.md`), AI Session UI (→ `../06_PAGES/AI_SESSION.md`), takeoff mechanics (→ `TAKEOFF.md`)

> This document exists because the founder brief that produced it locks a reframing: **the Project — not the takeoff, not the BOQ, not any single AI Session — is Vectoris's primary object.** It supersedes no existing document's authority; it explains the concept that `VISION.md` §"Project as Primary Object" now references, and that `AI_SESSION.md` and `USER_ROLES.md` extend.

---

## 1. What "Project Intelligence" Means

Project Intelligence is the answer Vectoris can give, at any point in a project's life, to: **"What is this project, and what do we currently know about it?"**

It is not a new feature surface. It is a synthesis capability that reads across the data Vectoris already owns for a project — documents, drawings, takeoff, sessions, decisions, activity — and produces a grounded, evidence-linked account. Nothing in this document invents a new data store; it defines how existing and near-term entities (`Project`, `Document`, `LineItem`, `TakeoffRun`, AI `Session`, `CorrectionEvent`) are read *together*, not separately.

This directly extends `VISION.md`'s existing principle — **"AI proposes. The human decides. The system remembers why."** — to the project level: the system must also be able to *explain* what it currently believes about a project, on demand, with sources.

## 2. Why This Is Needed (Not Just "a Chatbot Over Documents")

Per `AI_SESSION.md` §AI Behavior, the Vectoris Agent already must produce evidence-linked responses and must not fabricate values. Project Intelligence does not relax that rule — it is the rule applied at a broader scope than a single question about a single drawing.

The gap this closes: today, a general question like *"Explain this project to me"* requires the Agent to reason across every document, the takeoff state, and prior sessions in one pass, without a defined procedure for doing so or a defined answer for what's grounded vs. absent. `PROJECT_OVERVIEW.md` (existing) summarizes project *state* (documents, progress, recent sessions) for scanning; Project Intelligence is the deeper synthesis capability that a person or the Agent draws on when the question is not "what happened" but "what does this project mean, and what's unresolved."

## 3. What Project Intelligence Draws On (Evidence Sources)

| Source | Already Modeled? | What It Contributes |
|---|---|---|
| `Document` (uploaded files) | Yes (`DATA_MODEL.md`) | Raw project material — specs, drawings, schedules, RFPs |
| `LineItem` / `TakeoffRun` / `Detection` | Yes | What has been quantified, with source evidence |
| `CorrectionEvent` | Yes | What a human changed, and why (where captured) |
| AI `Session` history | Yes (`AI_SESSION.md`) | Prior questions asked and answers given about this project |
| Project metadata (type, description) | Yes, with provenance (`ai_inferred` / `user_provided` / `verified`) | Scope framing |
| **Decisions** | **NEW — not yet in `DATA_MODEL.md`** | An explicit record that a person made a call on something ambiguous (e.g., "treat Sheet E-104 rev B as authoritative over rev A") — distinct from a `CorrectionEvent`, which is data-level; a Decision can be process- or scope-level and may have no single data field it corrects |
| **Activity feed** | **NEW — not yet in `DATA_MODEL.md`** | Chronological project-level event log a person can scan (uploads, approvals, invites, sessions started) — a superset view of what `CorrectionEvent` already captures at the data layer |

`Decision` and `Activity` are **PROPOSED entity candidates**, not additions to `DATA_MODEL.md` — same process as any schema change (per `MVP_BOUNDARY.md` §Scope Change Process): a passed Gate, then an explicit update to `DATA_MODEL.md`.

## 4. Grounded Synthesis — the Non-Negotiable Rule

Carried forward from `AI_SESSION.md` §AI Behavior and reinforced here at the project level:

- Every synthesized statement about a project ("this project involves three electrical systems," "cooling scope spans two drawings") must be traceable to specific evidence (a document, a takeoff line, a prior human-verified answer).
- Where evidence is absent or thin, Project Intelligence must say so explicitly — "unresolved" or "not yet analyzed" is a valid and required answer, not a failure state.
- Project Intelligence must distinguish, in its output, between: **known from evidence**, **inferred**, **explicitly decided by a human**, and **unresolved/unknown**. This is the same four-way distinction `ESTIMATION_BIDDING_DOMAIN.md` uses for commercial data (OBSERVED/INFERRED/DECIDED/etc.) — Project Intelligence is that discipline applied to project-understanding output, not just commercial output.
- Project Intelligence must never present a synthesized answer as more authoritative than an explicit human Decision on the same question — a Decision, once recorded, outranks a fresh inference.

## 5. Relationship to AI Sessions

Project Intelligence is not a separate chat surface. It is the grounding layer an AI Session draws on when the question is project-scoped (see `AI_SESSION.md`, which already scopes sessions to a `project_id`). Concretely:

- A project-scoped AI Session's first-turn context should include a summary drawn from Project Intelligence (what exists, what's resolved, what's outstanding) — not just the raw document list.
- Role-aware questions (see `../01_PRODUCT/USER_ROLES.md` and `AI_SESSION.md`) are answered by routing into the relevant slice of Project Intelligence (e.g., an HVAC engineer's question routes toward cooling-scope documents and takeoff lines, not the full project corpus indiscriminately) — see `COLLABORATION.md` §4 for how role/discipline informs this routing.
- Project Intelligence does not bypass the Agent's existing tool-use and evidence-card mechanics (`AI_SESSION.md` §AI Behavior); it is the context those tools draw from, not a replacement for them.

## 6. Cross-Domain Relationships (Conceptual, Not Implementation)

```text
Documents + Drawings
        ↓
Requirements (explicit or inferred)
        ↓
Takeoff / Detections  ──────────────┐
        ↓                          │
Engineering Interpretation          │  all feed
        ↓                          │  Project Intelligence
Estimation / BOQ (see              │  synthesis, evidence-linked
ESTIMATION_BIDDING_DOMAIN.md)       │
        ↓                          │
Decisions + Activity ───────────────┘
        ↓
Grounded Project Understanding (queryable by any authorized project member)
```

This diagram does not imply every project must traverse every layer — a project that has only uploaded documents and no takeoff yet still has valid, if thin, Project Intelligence ("scope unclear, no analysis run yet" is a legitimate answer).

## 7. MVP vs. Near-Term vs. Future

| Capability | Horizon | Rationale |
|---|---|---|
| Project metadata + document list + takeoff summary scanning (existing `PROJECT_OVERVIEW.md`) | **MVP (already scoped)** | Already specified; not new |
| Evidence-linked answers to project-scoped questions via AI Session, single document/sheet at a time | **MVP (already scoped)** | Already covered by `AI_SESSION.md` |
| Explicit "Decision" entity, distinct from `CorrectionEvent` | **NEAR-TERM — OPEN DECISION** | Requires `DATA_MODEL.md` extension; not yet authorized |
| Cross-document, cross-takeoff synthesized project summary ("explain this project") | **NEAR-TERM — OPEN DECISION** | Requires defined grounding procedure (§4) before build; see `../OPEN_DECISIONS.md` OD-24 |
| Activity feed as a first-class, project-level surface | **NEAR-TERM** | UI-light, data-model-light; natural extension of existing `CorrectionEvent` ledger |
| Role-routed context curation for a newly invited team member | **NEAR-TERM/FUTURE** | Depends on `COLLABORATION.md` discipline-role model landing first |

Nothing in this document authorizes building beyond `MVP_BOUNDARY.md`. It defines the target shape so near-term work does not have to be re-architected.

## 8. Cross-References

- `../00_PROJECT/VISION.md` — "Project as Primary Object" framing this document supports
- `COLLABORATION.md` — how a project becomes useful to someone who did not create it
- `../06_PAGES/AI_SESSION.md` — the interface this capability grounds
- `../06_PAGES/PROJECT_OVERVIEW.md` — the existing, lighter-weight state-scanning surface (not superseded)
- `ESTIMATION_BIDDING_DOMAIN.md` — the evidence-classification discipline this document reuses (§4)
- `../OPEN_DECISIONS.md` — OD-24, OD-25

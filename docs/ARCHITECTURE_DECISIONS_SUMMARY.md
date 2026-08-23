# Vectoris — Architecture Decisions Summary

**Status:** RECOMMENDED  
**Owner of:** Consolidated index of all Architecture Decision Records (ADRs) across the documentation set  
**Does not own:** Full ADR rationale (that lives in the owning document) — this is an index and cross-reference, not a restatement

> This document exists so engineers and founders can see every architectural decision in one place without hunting through individual files. Each row links to the owning document where the full rationale and trade-offs live.

---

## Decision Index

| ID | Decision | Status | Owning Document | Section |
|---|---|---|---|---|
| ADR-01 | **Desktop runtime: Tauri (Rust shell)** | **LOCKED** | `03_ARCHITECTURE/TECH_STACK.md` | §6 (ADR — Tauri vs. Web-Only) |
| ADR-02 | **Frontend framework: React + TypeScript + Vite** | **LOCKED** | `03_ARCHITECTURE/TECH_STACK.md` | §5 (ADR — Vite vs. Next.js) |
| ADR-03 | **Marketing/public web: Next.js (separate deployable from desktop app)** | **LOCKED** | `03_ARCHITECTURE/TECH_STACK.md` | §5 |
| ADR-04 | **Backend: Python + FastAPI** | RECOMMENDED | `03_ARCHITECTURE/TECH_STACK.md` | §3 (Why Python + FastAPI) |
| ADR-05 | **Database engine: Supabase/PostgreSQL** | **LOCKED** | `03_ARCHITECTURE/DATA_MODEL.md` | §4 (ADR) |
| ADR-06 | **AI architecture: Agentic hybrid (Perception + Brain + Memory + Tools + Control)** | **LOCKED** | `04_AI/AI_SYSTEM.md` | §1 (Core Architectural Decision) |
| ADR-07 | **Brain: fine-tuned open-source foundation model (prompting/scaffolding first at MVP)** | RECOMMENDED | `04_AI/VECTORIS_BRAIN.md` | §2 |
| ADR-08 | **Perception: Hybrid Execution Router (Local-first + Policy-based Cloud)** | **LOCKED** | `04_AI/PERCEPTION.md` | §3–5 |
| ADR-09 | **Training from scratch: rejected** | REJECTED | `04_AI/AI_SYSTEM.md` | §5 |
| ADR-10 | **Fine-tuning teaches behavior, not facts — volatile data goes in retrieval** | **LOCKED** | `04_AI/AI_SYSTEM.md` | §4 |
| ADR-11 | **Correction ≠ automatic retraining — classification and validation required** | **LOCKED** | `04_AI/TRAINING.md` | §3 |
| ADR-12 | **Confidence scores are internal-only — not exposed as primary UI** | **LOCKED** | `02_DESIGN/UX_PRINCIPLES.md` | §2 |
| ADR-13 | **Local-first storage: raw drawings stay on device by default** | **LOCKED** | `03_ARCHITECTURE/STORAGE.md` | §1 |
| ADR-14 | **Cloud processing of drawings requires explicit, auditable authorization** | **LOCKED** | `03_ARCHITECTURE/SECURITY.md` | §3 |
| ADR-15 | **Customer data does not enter global training by default** | **LOCKED** | `04_AI/TRAINING.md` | §4 |
| ADR-16 | **Every AI output is traceable to source document, coordinates, and model version** | **LOCKED** | `04_AI/MODEL_GOVERNANCE.md` | §1, §3 |
| ADR-17 | **Deployment: Vercel (marketing) + Render (API) + native installers (desktop)** | PROVISIONAL | `05_IMPLEMENTATION/DEPLOYMENT.md` | §1 |
| ADR-18 | **Motion library: Motion / Framer Motion** | RECOMMENDED | `02_DESIGN/MOTION.md` | §1 |
| ADR-19 | **Drawing viewer: PDF.js + React-Konva** | RECOMMENDED | `03_ARCHITECTURE/TECH_STACK.md` | §1 |
| ADR-20 | **Job queue technology: Redis + Celery** | **LOCKED** | `03_ARCHITECTURE/EVENT_SYSTEM.md` | §5 |
| ADR-21 | **Realtime delivery: TBD (SSE/WebSocket/polling)** | TBD | `03_ARCHITECTURE/EVENT_SYSTEM.md` | §4 |
| ADR-22 | **Auth provider: Supabase Auth** | **LOCKED** | `03_ARCHITECTURE/SECURITY.md` | §2 |
| ADR-23 | **Project type stored as three separate fields (ai_inferred / user_provided / verified), never conflated** | **LOCKED** | `03_ARCHITECTURE/DATA_MODEL.md` | §2 (Project entity) |
| ADR-24 | **State-mutating tool calls produce proposals, not final writes — approval required** | **LOCKED** | `04_AI/TOOL_SYSTEM.md` | §2 |
| ADR-25 | **H1 and H2 are one pipeline with two entry points — not two separate products** | **LOCKED** | `00_PROJECT/VISION.md` | §1, §4 |

---

## Decision Status Legend

| Status | Meaning |
|---|---|
| **LOCKED** | Decided; must not be re-opened without founder review |
| RECOMMENDED | Strong direction; not yet confirmed as LOCKED |
| PROVISIONAL | Temporary choice pending founder or technical confirmation |
| CANDIDATE | Under active evaluation; will be resolved by technical spike |
| TBD | Not yet decided; see `OPEN_DECISIONS.md` |
| REJECTED | Considered and explicitly ruled out |
| FUTURE | Reserved for a later phase; not an active decision yet |

---

## Cross-References

All full ADR rationale lives in the owning documents linked above.  
Unresolved decisions: `OPEN_DECISIONS.md`  
Technology choices: `03_ARCHITECTURE/TECH_STACK.md`  
AI architecture: `04_AI/AI_SYSTEM.md`

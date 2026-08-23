# Vectoris — Tech Stack

**Status:** Mixed — see per-row status  
**Owner of:** Concrete technology choices and their status  
**Does not own:** Architecture diagrams (→ ARCHITECTURE.md), rationale detail beyond brief justification (ADRs below own full rationale)

---

## 1. Stack Summary

| Layer | Technology | Status |
|---|---|---|
| Desktop runtime | Tauri (Rust shell) | **LOCKED** |
| Frontend framework | React + TypeScript | **LOCKED** |
| Frontend build tool | Vite | **LOCKED** |
| Frontend motion | Motion / Framer Motion | RECOMMENDED |
| Marketing/public web | Next.js | **FUTURE** (not the desktop app) |
| Backend framework | Python + FastAPI | RECOMMENDED |
| Native/OS integration | Rust (via Tauri) | **LOCKED** |
| Metadata database | Supabase / PostgreSQL | **LOCKED** |
| Authentication | Supabase Auth | **LOCKED** |
| Cloud edge/metadata services | Cloudflare (where appropriate) | PROVISIONAL |
| Background jobs | Redis + Celery | **LOCKED** |
| Perception model | Fine-tuned open-source or Gemini | PROVISIONAL |
| Brain model | Fine-tuned open-source foundation model | RECOMMENDED |
| Drawing viewer core | PDF.js | RECOMMENDED |
| Drawing viewer interaction layer | React-Konva (or equivalent) | RECOMMENDED |
| Product analytics | PostHog | RECOMMENDED |
| Deployment | Vercel (Frontend) + Render (Backend) | PROVISIONAL |

## 2. UI / Component Ecosystem

Vectoris uses a curated multi-library UI ecosystem. 

### ReactBits
**Purpose:** Custom interactive components, visual effects, premium UI interactions.
**Status:** **LOCKED**

### Bklit UI
**Purpose:** Dashboard components, data-heavy application interfaces, tables/cards/data surfaces.
**Status:** **LOCKED**

### assistant-ui
**Purpose:** AI Agent / Chat Session foundation, message rendering, tool interaction surfaces, AI conversation primitives.
**Status:** **LOCKED**

### Skiper UI
**Purpose:** Premium motion components, animated theme controls, Dynamic Island, specialized interaction patterns.
**Status:** **LOCKED** — selective usage

### Driver.js
**Purpose:** Product onboarding, guided tours, contextual feature walkthroughs.
**Status:** **LOCKED**

### Thinking Orbs
**Purpose:** AI activity visualization, agent processing states, thinking/working states.
**Status:** **LOCKED** — selective usage

*(Note: Tailark is explicitly excluded from the Vectoris ecosystem).*

## 3. Why Vite, Not Next.js, for the Desktop App

Vectoris is fundamentally a desktop/local-first engineering application: local files, local AI, filesystem access, large drawing packages, desktop-native workflows, potential GPU/local compute, offline capability. Next.js's SSR/routing model is oriented toward server-rendered web apps; it adds no value and real friction inside a Tauri shell. Next.js remains valid for the marketing site, public docs, and SEO-oriented pages — a separate deployable, not the desktop runtime. Full ADR: `ARCHITECTURE.md`-linked decision below.

## 4. Why Python + FastAPI for Backend

The AI/ML ecosystem (PyTorch, Transformers, OpenCV, OCR tooling, document processing, fine-tuning, evaluation) is Python-native. FastAPI provides async-friendly API surface suited to job-queue-backed long-running operations. Rust remains responsible for native application integration, filesystem, OS-level capability, and the Tauri layer itself — not for AI orchestration.

## 5. Perception Model Note

Gemini is a **candidate**, not a lock. The architecture must support local perception models, optional cloud perception models, model routing, fallback models, and model versioning (see `../04_AI/PERCEPTION.md`). The technical spike (Phase 0.5, see `../05_IMPLEMENTATION/DEVELOPMENT_PHASES.md`) determines the actual perception model(s) used.

## 6. ADR — Vite vs. Next.js

- **Decision:** Vite for the Vectoris desktop app; Next.js reserved for marketing/public web.
- **Status:** LOCKED
- **Context:** Vectoris is a local-first desktop engineering tool wrapped in Tauri, not a server-rendered web app.
- **Options considered:** Next.js (App Router) for everything; Vite for app + separate Next.js for marketing.
- **Decision rationale:** SSR/server-component paradigms add complexity with no benefit inside a Tauri shell with local filesystem access; Vite has first-class Tauri integration and faster dev iteration for a SPA-shaped desktop app.
- **Trade-offs:** Two separate frontend codebases (app vs. marketing site) instead of one; acceptable given very different concerns (desktop app vs. SEO site).
- **Consequences:** Marketing site is a fully separate deployable using Next.js on Vercel; no shared runtime with the desktop app.
- **Revisit conditions:** If Vectoris ever needs a full browser-based (non-desktop) product surface with SSR needs beyond what a SPA can serve.

## 7. ADR — Tauri vs. Web-Only

- **Decision:** Tauri desktop shell.
- **Status:** LOCKED
- **Context:** Local-first file access, large drawing packages, potential local/GPU compute, offline capability are core product requirements, not nice-to-haves.
- **Options considered:** Web-only (browser) app with cloud-only processing; Electron; Tauri.
- **Decision rationale:** Tauri gives native filesystem/OS access with a much smaller footprint than Electron and better security defaults (Rust-based, no bundled Chromium-Node combo with full Node API surface exposed).
- **Trade-offs:** Smaller ecosystem/tooling maturity than Electron; some native integrations require custom Rust plugin work.
- **Consequences:** Rust becomes a required skill in the stack (owned by native/OS layer, not by AI/backend engineers).
- **Revisit conditions:** If local-first requirement is ever relaxed (not currently anticipated).

## 8. Final Vectoris Core Stack (Architecture Diagram)

```text
                 VECTORIS
                     │
        ┌────────────┴────────────┐
        │                         │
     React                    Tauri
   TypeScript                  Rust
     Vite                       │
        └────────────┬───────────┘
                     │
               Local-First
                     │
              Python / FastAPI
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
     Supabase      Redis       AI Layer
     PostgreSQL   + Celery         │
     + Auth          │        ┌────┴────┐
                     │        │         │
                  Workers  Perception Brain
                                  │       │
                                  └───┬───┘
                                      ↓
                                    Tools
                                      ↓
                               Vectoris Runtime
```

## 9. Cross-References

- `ARCHITECTURE.md`, `SYSTEM_COMPONENTS.md`
- Database ADR: `DATA_MODEL.md`
- Perception detail: `../04_AI/PERCEPTION.md`

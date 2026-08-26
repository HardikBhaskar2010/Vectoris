# Vectoris — Documentation Manifest

**Status:** LOCKED (structure) · Content status varies per file  
**Purpose:** Canonical index of every document in the Vectoris documentation system — what it owns, what it must not contain, its dependencies, and generation order.

---

## How to Use This Manifest

Every document below has **one canonical responsibility** (see rule in §33 of the founder brief). If a decision seems to belong in two places, it belongs in the one listed as "Owner" here — everywhere else must cross-reference, not restate.

Decision statuses used throughout this doc set: **LOCKED**, **RECOMMENDED**, **PROVISIONAL**, **TBD**, **REJECTED**, **FUTURE**.

---

## Folder Tree

```text
docs/
├── DOCUMENTATION_MANIFEST.md
├── ARCHITECTURE_DECISIONS_SUMMARY.md
├── OPEN_DECISIONS.md
├── MVP_BOUNDARY.md
├── LONG_TERM_VISION.md
│
├── 00_PROJECT/
│   ├── VISION.md
│   ├── PRD.md
│   ├── PRODUCT_SCOPE.md
│   └── GLOSSARY.md
│
├── 01_PRODUCT/
│   ├── USER_ROLES.md
│   ├── CORE_WORKFLOWS.md
│   ├── APP_FLOW.md
│   ├── FEATURE_MAP.md
│   └── ACCEPTANCE_CRITERIA.md
│
├── 02_DESIGN/
│   ├── DESIGN.md
│   ├── DESIGN_SYSTEM.md
│   ├── UX_PRINCIPLES.md
│   ├── COMPONENTS.md
│   └── MOTION.md
│
├── 03_ARCHITECTURE/
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── SYSTEM_COMPONENTS.md
│   ├── DATA_MODEL.md
│   ├── API_ARCHITECTURE.md
│   ├── EVENT_SYSTEM.md
│   ├── STORAGE.md
│   └── SECURITY.md
│
├── 04_AI/
│   ├── AI_SYSTEM.md
│   ├── AGENT_RUNTIME.md
│   ├── VECTORIS_BRAIN.md
│   ├── PERCEPTION.md
│   ├── AI_MEMORY.md
│   ├── TOOL_SYSTEM.md
│   ├── TRAINING.md
│   ├── EVALUATION.md
│   └── MODEL_GOVERNANCE.md
│
├── 05_IMPLEMENTATION/
│   ├── IMPLEMENTATION_FLOW.md
│   ├── DEVELOPMENT_PHASES.md
│   ├── FRONTEND.md
│   ├── BACKEND.md
│   ├── AI_IMPLEMENTATION.md
│   ├── TESTING.md
│   └── DEPLOYMENT.md
│
├── 06_PAGES/
│   ├── LANDING.md
│   ├── AUTH.md
│   ├── DASHBOARD.md
│   ├── PROJECTS.md
│   ├── CREATE_PROJECT.md
│   ├── PROJECT_OVERVIEW.md
│   ├── DOCUMENT_UPLOAD.md
│   ├── PROCESSING.md
│   ├── DRAWING_VIEWER.md
│   ├── TAKEOFF_REVIEW.md
│   ├── LINE_ITEM_DETAILS.md
│   └── EXPORT.md
│
├── 07_OPERATIONS/
│   ├── OBSERVABILITY.md
│   ├── BACKUPS.md
│   ├── ENVIRONMENT.md
│   └── DATA_LIFECYCLE.md
│
└── DOMAIN/
    ├── PROJECT_INTELLIGENCE.md
    └── COLLABORATION.md
```

---

## Manifest Table

| # | File | Owns | Must NOT Contain | Depends On | Status |
|---|---|---|---|---|---|
| 1 | VISION.md | Long-term "why," north star, product philosophy | Page-level detail, tech stack, MVP scope detail | Legacy README/THESIS/SCOPE | Complete |
| 2 | PRD.md | What the product does (MVP + near-term), requirements | Visual design, DB schema, model choices | VISION | Complete |
| 3 | PRODUCT_SCOPE.md | Explicit MVP / near-term / long-term boundary | Page specs, architecture | PRD | Complete |
| 4 | GLOSSARY.md | Shared vocabulary (H1/H2, BOQ, takeoff, etc.) | Opinions/decisions | All | Complete |
| 5 | USER_ROLES.md | Org roles, permission scopes | UI layout | PRD | Complete |
| 6 | CORE_WORKFLOWS.md | End-to-end workflows (takeoff, correction, export) | Screen-by-screen UI | PRD, USER_ROLES | Complete |
| 7 | APP_FLOW.md | Navigation graph between pages/states | Individual page detail | CORE_WORKFLOWS | Complete |
| 8 | FEATURE_MAP.md | Feature → MVP/near-term/long-term mapping | Implementation detail | PRODUCT_SCOPE | Complete |
| 9 | ACCEPTANCE_CRITERIA.md | Cross-cutting MVP acceptance bar | Page-specific AC (those live in page docs) | PRD, CORE_WORKFLOWS | Complete |
| 10 | DESIGN.md | Visual/emotional design philosophy | Component-level spec, exact palettes beyond founder-given | VISION | Complete |
| 11 | DESIGN_SYSTEM.md | Color tokens, typography status, spacing scale | Final screen layouts | DESIGN | Complete |
| 12 | UX_PRINCIPLES.md | Interaction philosophy (confidence hiding, HITL UX) | Visual tokens | DESIGN | Complete |
| 13 | COMPONENTS.md | Reusable component inventory (conceptual) | Pixel specs | DESIGN_SYSTEM | Complete |
| 14 | MOTION.md | Motion principles, library choice | Component visuals | DESIGN_SYSTEM | Complete |
| 15 | ARCHITECTURE.md | System-level architecture, boundaries | Tech choices' rationale detail (→ TECH_STACK), schema | PRD | Complete |
| 16 | TECH_STACK.md | Concrete technology choices + status | Architecture diagrams | ARCHITECTURE | Complete |
| 17 | SYSTEM_COMPONENTS.md | Service/module inventory & responsibilities | API contracts | ARCHITECTURE | Complete |
| 18 | DATA_MODEL.md | Entity model, relationships | API routes | ARCHITECTURE | Complete |
| 19 | API_ARCHITECTURE.md | API design principles, contract shape | Full endpoint spec (future doc) | DATA_MODEL | Complete |
| 20 | EVENT_SYSTEM.md | Async/event/job architecture | Queue vendor final lock-in | ARCHITECTURE | Complete |
| 21 | STORAGE.md | Local-first storage & sync architecture | DB engine choice detail (→ DATA_MODEL ADR) | ARCHITECTURE | Complete |
| 22 | SECURITY.md | AuthN/Z, tenancy, encryption, consent | Legal certifications (TBD) | USER_ROLES, STORAGE | Complete |
| 23 | AI_SYSTEM.md | Overall agentic AI architecture | Brain fine-tuning detail (→ VECTORIS_BRAIN) | ARCHITECTURE | Complete |
| 24 | AGENT_RUNTIME.md | Agent control loop, guards, error contracts, async jobs | Tool inventory (→ TOOL_SYSTEM.md) | AI_SYSTEM | Complete |
| 25 | VECTORIS_BRAIN.md | Brain behavior, fine-tuning philosophy | Perception model detail | AI_SYSTEM | Complete |
| 26 | PERCEPTION.md | Vision/OCR/geometry layer | Brain reasoning | AI_SYSTEM | Complete |
| 27 | AI_MEMORY.md | Memory layers (project/company/user/session) | Tool implementations | AI_SYSTEM | Complete |
| 28 | TOOL_SYSTEM.md | Agent tool inventory & contracts | Model choice | AI_SYSTEM | Complete |
| 29 | TRAINING.md | Correction → dataset → fine-tune pipeline | Evaluation metrics detail (→ EVALUATION) | VECTORIS_BRAIN | Complete |
| 30 | EVALUATION.md | Evaluation suite categories & benchmark | Training pipeline mechanics | TRAINING | Complete |
| 31 | MODEL_GOVERNANCE.md | Versioning, consent, deployment gating | Evaluation metrics themselves | TRAINING, EVALUATION | Complete |
| 32 | IMPLEMENTATION_FLOW.md | Build sequence across all layers | Phase-internal task breakdown (→ DEVELOPMENT_PHASES) | PRODUCT_SCOPE, ARCHITECTURE | Complete |
| 33 | DEVELOPMENT_PHASES.md | Phase-by-phase deliverables & exit criteria | Design content | IMPLEMENTATION_FLOW | Complete |
| 34 | FRONTEND.md | Frontend implementation approach | Backend detail | TECH_STACK | Complete |
| 35 | BACKEND.md | Backend implementation approach | Frontend detail | TECH_STACK | Complete |
| 36 | AI_IMPLEMENTATION.md | How AI_SYSTEM gets built | AI theory (→ AI_SYSTEM) | AI_SYSTEM, BACKEND | Complete |
| 37 | TESTING.md | Test strategy across layers | AI evaluation (→ EVALUATION) | FRONTEND, BACKEND | Complete |
| 38 | DEPLOYMENT.md | Deployment topology & environments | CI pipeline YAML detail | TECH_STACK | Complete |
| 39 | MARKETING_LANDING.md | Marketing landing page | Core product layout | APP_FLOW | Complete |
| 40 | LANDING.md | Landing/unauthenticated page behavior | Cross-page navigation logic | APP_FLOW | Complete |
| 41 | AUTH.md | Auth/sign-in/sign-up page behavior | Cross-page navigation logic | APP_FLOW | Complete |
| 42 | ONBOARDING.md | Onboarding and guided tours | Persistent layouts | APP_FLOW | Complete |
| 43 | DASHBOARD.md | Dashboard page behavior | Cross-page navigation logic | APP_FLOW, CORE_WORKFLOWS | Complete |
| 44 | PROJECTS.md | Projects list page | — | APP_FLOW | Complete |
| 45 | CREATE_PROJECT.md | Create project form | — | APP_FLOW | Complete |
| 46 | PROJECT_OVERVIEW.md | Project hub page | — | APP_FLOW | Complete |
| 47 | SETTINGS.md | Organization and user settings page | — | APP_FLOW | Complete |
| 48 | DOCUMENT_UPLOAD.md | Upload surface | — | APP_FLOW | Complete |
| 49 | PROCESSING.md | Processing/progress page | — | APP_FLOW | Complete |
| 50 | DRAWING_VIEWER.md | Drawing/Takeoff Workspace | — | APP_FLOW | Complete |
| 51 | TAKEOFF_REVIEW.md | Takeoff review table | — | APP_FLOW | Complete |
| 52 | LINE_ITEM_DETAILS.md | Line item detail panel | — | APP_FLOW | Complete |
| 53 | EXPORT.md | Export interaction | — | APP_FLOW | Complete |
| 54 | AI_SESSION.md | AI chat session / assistant-ui layer | Core chat model | APP_FLOW, AI_SYSTEM | Complete |
| 55 | OBSERVABILITY.md | Logging/monitoring/analytics ownership | AI evaluation metrics | AI_SYSTEM | Complete |
| 56 | BACKUPS.md | Backup/restore policy | Storage architecture detail | STORAGE | Complete |
| 57 | ENVIRONMENT.md | Environments (local/staging/prod), config | Deployment topology (→ DEPLOYMENT) | DEPLOYMENT | Complete |
| 58 | DATA_LIFECYCLE.md | Retention, deletion, export/erasure | Security architecture (→ SECURITY) | SECURITY | Complete |
| R1 | ARCHITECTURE_DECISIONS_SUMMARY.md | Summary index of all ADRs across all docs | Full ADR rationale (that lives in owning files) | All architecture files | Complete |
| R2 | OPEN_DECISIONS.md | Registry of unresolved product/technical decisions | Decided items | All | Complete |
| R3 | MVP_BOUNDARY.md | Root-level authoritative MVP in/out list | Architecture, page detail | PRODUCT_SCOPE, PRD | Complete |
| R4 | LONG_TERM_VISION.md | Long-term vision detail beyond VISION.md | MVP boundaries | VISION | Complete |
| R5 | DEPENDENCIES.md | Centralized registry of all third-party libraries | Architecture context | TECH_STACK | Complete |
| R6 | DOCUMENTATION_MANIFEST.md | Canonical index of every document in the system | Document content | All | Complete |
| D1 | DOMAIN/PROJECT_INTELLIGENCE.md | Core Project Management & Project Intelligence architecture container and context grounding layer across Drawings, Documents, AI, and Collaboration | Generic ERP/CRM (out of scope) | VISION, AI_SESSION, DATA_MODEL | Locked (Architecture) · Automated synthesis (OD-24) |
| D2 | DOMAIN/COLLABORATION.md | Discipline Role (context curation) as distinct from Permission Role; referral/invite-to-existing-project flow | Permission matrix (that stays in USER_ROLES, LOCKED) | USER_ROLES, PROJECT_INTELLIGENCE | Complete (spec) — capability itself Near-term/OPEN |

## Generation Order

Followed exactly per founder brief §42: Manifest → 00_PROJECT → 01_PRODUCT → 02_DESIGN → 03_ARCHITECTURE → 04_AI → 05_IMPLEMENTATION → 06_PAGES → 07_OPERATIONS → summary docs.

## Legacy Source Documents (Inputs, Not Part of This Doc Set)

`README.md`, `SCOPE.md`, `DISCOVERY.md`, `THESIS.md`, `Call-Summary-Shubham-Singh.md` remain the historical discovery/thesis record for the pre-Vectoris-rename DrawSpec project. This documentation set **supersedes them for build purposes** but does not delete or contradict their evidentiary findings — see `VISION.md` for how H1/H2 discovery evidence carries forward into Vectoris.

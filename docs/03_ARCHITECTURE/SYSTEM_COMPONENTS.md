# Vectoris — System Components

**Status:** RECOMMENDED  
**Owner of:** Service/module inventory and responsibilities  
**Does not own:** API contracts (→ API_ARCHITECTURE.md), entity schema (→ DATA_MODEL.md)

---

## 1. Component Inventory

| Component | Responsibility | Layer |
|---|---|---|
| **Desktop Shell** | Native window, filesystem access, OS integration | Rust/Tauri |
| **UI Application** | Rendering, state, user interaction | React/TS/Vite |
| **API Gateway** | AuthN/Z, request routing, tenant scoping | Python/FastAPI |
| **Ingestion Service** | Format adapters, canonical document representation | Python |
| **Job Queue / Workers** | Async processing (ingestion, detection, measurement, export) | Python + Celery |
| **Perception Service** | Vision/OCR/geometry/detection (local and/or cloud-routed) | Python, model-backed |
| **Vectoris Brain (Agent Core)** | Reasoning, planning, tool selection, conversation | Python, fine-tuned model-backed |
| **Memory Service** | Project/company/user/session memory retrieval | Python + DB |
| **Tool Executor** | Executes agent-invoked tools against application state | Python |
| **Control/Verification Layer** | Validation, permission checks, evidence checks, approval boundaries | Python |
| **Correction/Audit Ledger** | Structured, append-only record of AI predictions + human corrections | Python + DB |
| **Export Service** | Transforms internal takeoff data into requested output format | Python |
| **Metadata DB** | Org/user/role/project metadata, sessions, audit metadata | Supabase/PostgreSQL (LOCKED) |
| **Auth Service** | Authentication, session tokens | TBD provider |
| **Object Storage** | Metadata/export artifacts (not raw drawings by default) | TBD provider |
| **Analytics** | Product usage analytics | PostHog |
| **Evaluation Suite Runner** | Runs the versioned Vectoris Evaluation Suite | Python, offline/CI |

## 2. Component Interaction Principle

The API Gateway is the single entry point for the UI; it never exposes internal services (Perception, Brain, Tool Executor) directly to the client. All AI-agent interaction flows through the API Gateway → Brain → (Tools/Perception/Memory) → Control/Verification → response.

## 3. Ownership Boundaries

| Boundary | Rule |
|---|---|
| UI ↔ API | UI never talks directly to Perception/Brain services |
| Brain ↔ Tools | Brain requests tool execution; it does not directly mutate application state |
| Tool Executor ↔ Data | Tool Executor is the only component permitted to write takeoff/line-item data on the agent's behalf, and only within Control/Verification's approval boundaries |
| Perception ↔ Model routing | Perception Service abstracts local vs. cloud model routing; callers do not need to know which backend served a request |

## 4. Cross-References

- `ARCHITECTURE.md` for the system diagram this table details
- `../04_AI/AI_SYSTEM.md`, `../04_AI/TOOL_SYSTEM.md` for agent-internal detail
- `EVENT_SYSTEM.md` for the job/worker mechanics

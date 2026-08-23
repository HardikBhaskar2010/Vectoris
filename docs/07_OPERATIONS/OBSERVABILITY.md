# Vectoris — Observability

**Status:** LOCKED (Performance SLAs) · RECOMMENDED (tooling)  
**Owner of:** Logging, monitoring, and analytics ownership split  
**Does not own:** AI evaluation metrics (→ `../04_AI/EVALUATION.md`), security audit trails (→ `../03_ARCHITECTURE/SECURITY.md`, `../04_AI/MODEL_GOVERNANCE.md`)

---

## 1. Purpose of This Document

Vectoris has three distinct observability concerns that must not be conflated:

1. **Application observability** — is the system running correctly? (infrastructure, API health, job success rates, error rates)
2. **Product analytics** — how are users behaving? (feature adoption, workflow completion, retention)
3. **AI evaluation** — is the AI performing well? (governed by `../04_AI/EVALUATION.md`, NOT this document)

---

## 2. Application Observability

### 2.1 Logging

**Principle:** Every meaningful backend action must produce a structured, queryable log record.

| Layer | What to log |
|---|---|
| API Gateway | Request/response (method, path, status, latency, tenant ID — never raw request bodies containing drawing content) |
| Ingestion Service | Document upload receipt, adapter used, sheet count, classification results, errors |
| Job Queue / Workers | Job created, started, completed, failed, retried (with retry count and reason) |
| Perception Service | Detection job start, model version used, output summary (counts, not raw drawing data), errors |
| Brain / Agent | Tool call intent, tool selected, tool result summary, clarification events, refusal events |
| Control / Verification | Permission denial events, evidence check failures, approval boundary triggers |
| Export Service | Export requested, format, status, delivery |
| Auth | Login success/failure (no raw credentials in logs) |

**Log format:** Structured JSON. Every log record includes: timestamp, service, tenant/org ID, project ID (where applicable), event type, status, correlation ID (to trace a user action across services).

**What must never appear in logs:** Raw drawing content, raw document text, personal credentials, session tokens. See `../03_ARCHITECTURE/SECURITY.md`.

### 2.2 Monitoring

| Metric | Alerting Threshold | Notes |
|---|---|---|
| API latency (normal ops) | **P95 > 500ms** | LOCKED SLA. Excludes AI/document processing. |
| API error rate | TBD — to be set at Phase 8 (real pilot) | 5xx rate spike |
| Job queue depth | TBD | Indicates processing backlog |
| Job failure rate | TBD | Persistent failures need alerting |
| Perception service latency | **N/A (Async)** | No arbitrary SLA for AI/document processing. Relies on async execution, visible progress, and job state. |
| Auth failure rate | TBD | Spike may indicate attack or outage |

All un-locked thresholds: **TBD** pending real-world baseline from Phase 8 pilot — do not invent thresholds without data.

**Monitoring tooling:** **TBD** — instrument for standard cloud observability (e.g., Render/Vercel built-in metrics at MVP; dedicated APM tool at scale). Not locked.

### 2.3 Error Alerting

Critical errors (job queue processing failures, data loss risk events, auth service outages) must trigger an immediate alert to the engineering team — mechanism TBD (email, Slack, PagerDuty, etc.).

---

## 3. Product Analytics

**Tool:** PostHog — **RECOMMENDED** (see `../03_ARCHITECTURE/TECH_STACK.md`).

**Purpose:** Understand how users move through the product, which features they use, and where they drop off.

### 3.1 Key Events to Track (MVP)

| Event | Why |
|---|---|
| `project_created` | Activation indicator |
| `document_uploaded` | Funnel step |
| `takeoff_completed` | Core job completion |
| `correction_submitted` | Learning pipeline health signal |
| `export_completed` | Full workflow completion |
| `session_started` | AI agent adoption |
| `session_message_sent` | Agent engagement depth |

### 3.2 Privacy Constraints

**No drawing content or personal engineering data enters analytics payloads.** Event properties may include: event type, timestamp, feature flags, workflow step, error type, format (for exports), session count. They must not include: file names, quantities, component types, or any data derived from customer drawings. See `../03_ARCHITECTURE/SECURITY.md`.

---

## 4. What This Document Does NOT Cover

- **AI model evaluation:** Governed entirely by `../04_AI/EVALUATION.md`. "The AI is performing well" is not measurable by application monitoring — it requires the Evaluation Suite and Benchmark.
- **Security audit trails:** Governed by `../03_ARCHITECTURE/SECURITY.md` and `../04_AI/MODEL_GOVERNANCE.md`. Those audit records exist for compliance and correctability, not operational observability.
- **Data lifecycle:** See `DATA_LIFECYCLE.md`.

---

## 5. Cross-References

- `../04_AI/EVALUATION.md` — AI-specific quality measurement
- `../04_AI/MODEL_GOVERNANCE.md` — AI auditability chain
- `../03_ARCHITECTURE/SECURITY.md` — what must not appear in logs
- `../03_ARCHITECTURE/TECH_STACK.md` — PostHog as product analytics tool

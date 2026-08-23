# Vectoris — API Architecture

**Status:** RECOMMENDED  
**Owner of:** API design principles, contract shape  
**Does not own:** Full endpoint-by-endpoint specification (future implementation doc), entity schema (→ DATA_MODEL.md)

---

## 1. Style

RESTful JSON API over HTTPS, served by FastAPI, as the primary contract between the desktop client and backend. Realtime/progress updates use a push mechanism (WebSocket or Server-Sent Events — exact choice TBD, see `EVENT_SYSTEM.md`).

## 2. Principles

1. **Tenant-scoped by default.** Every request is implicitly scoped to the authenticated user's organization/project context; cross-tenant access requires explicit, audited elevation (not applicable at MVP — single-tenant-per-request assumption holds).
2. **Long-running operations return immediately with a job reference.** Ingestion, detection, and measurement are never synchronous request/response; the client polls or subscribes to job status (see `EVENT_SYSTEM.md`).
3. **Structured error responses.** Every error includes a machine-readable code and a human-readable message; no bare 500s without context in production.
4. **Idempotent writes where feasible.** Especially for correction events and job submission, to support safe retries.
5. **Evidence-linked responses.** Any endpoint returning AI-derived data (detections, agent answers) includes source references (document/sheet/coordinates or prior decision) in the response shape, not as an afterthought.

## 3. Conceptual Endpoint Groups

| Group | Examples |
|---|---|
| Auth | login, session refresh, logout |
| Organizations | create, invite, list members, update role |
| Projects | create, list, get, update settings |
| Documents | upload, list, get status |
| Takeoff | trigger run, list detections, get line items |
| Corrections | submit correction event |
| Export | request export, get export status/download |
| Sessions | create session, post message, get history, share session |
| Jobs | get job status (polled or subscribed) |

Exact request/response schemas: **TBD** — to be specified in an implementation-phase API reference once `DATA_MODEL.md` entities are finalized.

## 4. Versioning

API versioning strategy: **LOCKED.** The API will use a `/v1/` prefix as the baseline before any external integrations. No evidence yet that more complex versioning (e.g., header-based) is needed at MVP scale.

## 5. Cross-References

- `DATA_MODEL.md` for entity shapes underlying responses
- `EVENT_SYSTEM.md` for async/job mechanics
- `SECURITY.md` for authN/authZ enforcement

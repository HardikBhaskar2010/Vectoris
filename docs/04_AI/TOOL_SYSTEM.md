# Vectoris — Tool System

**Status:** RECOMMENDED  
**Owner of:** Agent tool inventory and contracts  
**Does not own:** Model choice (→ AI_SYSTEM.md, VECTORIS_BRAIN.md), memory retrieval (→ AI_MEMORY.md)

---

## 1. Principle

Tools are the **only** way the Brain interacts with real application state or files. The Brain never mutates data directly — it requests a tool call, the Tool Executor performs it, and Control/Verification checks the result against permissions and evidence requirements before it's treated as final.

## 2. MVP Tool Inventory (Conceptual)

| Tool | Description | Writes State? |
|---|---|---|
| `read_project_files` | List/read documents in the current project | No |
| `inspect_drawing` | Open a specific sheet for perception-layer analysis | No |
| `search_project` | Search across project documents/line items | No |
| `perform_takeoff` | Run detection/counting/measurement on a document | Creates proposed detections (not approved) |
| `measure_geometry` | Measure length/area for a specified region | Creates proposed measurement (not approved) |
| `create_line_item` | Propose a new line item (AI- or user-directed) | Creates proposed line item |
| `update_line_item` | Propose a change to an existing line item | Creates a proposed correction, pending approval |
| `export_takeoff` | Generate an export file in the requested format | Creates export artifact (does not alter takeoff data) |
| `get_project_context` | Retrieve current project memory/context | No |

**Every state-mutating tool produces a *proposal*, not a final write.** Final approval remains a human action per `../02_DESIGN/UX_PRINCIPLES.md` §1 and `AI_SYSTEM.md` §3, except where a user has explicitly directed an action in the moment (e.g., "delete this detection" in chat) — even then, the action is logged as an attributed event, not silently applied.

## 3. Tool Contract Shape & Error Handling

Each tool defines: name, description, input schema, output schema, required permission scope, whether it mutates state, and whether it requires human approval before the result is considered final.

- Concrete JSON schemas for tool inputs/outputs, typed error payloads (`not_found`, `permission_denied`, `timeout`, `validation_failed`, `internal_error`), and parallel vs. sequential execution rules are canonically defined in `AGENT_RUNTIME.md`.
- Heavy tools (`perform_takeoff`, `measure_geometry`) dispatch to Celery asynchronously and return a `job_id` via the stream-and-continue pattern documented in `AGENT_RUNTIME.md` §4.

## 4. Verification Layer

Before any tool result is surfaced as fact or applied as a change:

1. **Evidence check** — does the result trace to a real source (document, coordinates, prior approved decision)?
2. **Permission check** — is the requesting user/agent action allowed under `../01_PRODUCT/USER_ROLES.md`?
3. **Approval boundary check** — does this action require explicit human approval before being final?

Any failure at this layer halts the action and surfaces a clear reason — it does not silently proceed with partial results.

## 5. Cross-References

- `AGENT_RUNTIME.md` (tool schemas, typed error contracts, async Celery dispatch)
- `AI_SYSTEM.md` §2–3 (agentic behavior, trust principles)
- `../03_ARCHITECTURE/SYSTEM_COMPONENTS.md` (Tool Executor component)
- `MODEL_GOVERNANCE.md` (auditability of tool actions)

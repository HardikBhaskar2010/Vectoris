# Vectoris — Project Plan Page Specification

## Status
LOCKED (MVP Implementation)

## Purpose
The Project Plan page is the central interface for viewing, reviewing, and governing the grounded synthesis of a project's Scope & outcomes, Milestones, Risks, and Dependencies.

It implements the non-negotiable pipeline:
```
AI proposes
    ↓
Draft recorded in database (never overwrites active plan)
    ↓
Human reviews claim-level diff (keyed by stable claim_id)
    ↓
Human resolves conflicts / Decisions
    ↓
Guarded RPC atomically activates approved snapshot (superseding previous active version)
    ↓
Audit history preserved
```

## Route & Navigation
- **Route:** `/project/:id/plan`
- **Navigation Position:** Tab 2 in `ProjectShell`, placed immediately after `Overview`:
  ```
  Overview  ·  Plan  ·  Documents  ·  Workspace  ·  Takeoff  ·  Reports
  ```

---

## Layout & Information Architecture

The page uses a split-panel layout:

### 1. Main Panel — Project Plan View & Claim Diffing
Displays the four fixed domain sections:
1. **Scope & outcomes**
2. **Milestones**
3. **Risks**
4. **Dependencies**

*(Note: These are presentation categories stored in `project_plan_claims.section`, not four separate database tables.)*

#### Section Header
- Section Title + Claim count
- Section Grounding Badge: If all claims in the section share a single grounding classification, displays that status. If claims have different classifications, displays **Mixed** with a count breakdown (never launders into a single artificial status).

#### Claim Cards
Each claim card surfaces:
- **Content:** The atomic statement or objective.
- **Grounding Classification Badge:**
  - `Known from evidence` (Emerald badge): Directly stated/measured in project documents.
  - `Inferred` (Sky blue badge): Derived logically; exposes an expandable inference rationale card.
  - `Human-decided` (Amber badge): Explicit human determination; links to the active `Decision` record.
  - `Unresolved` (Rose badge): Missing or ambiguous evidence; displays the explicit unresolved reason.
- **Evidence Citations:** Clickable source citations (Document name, Sheet number, region coordinates) that link to the Drawing Viewer or Document Inspector.
- **Lineage Badge (when modified in Draft):** Shows `Split` or `Merged` origin if the claim evolved from prior claims.
- **Conflict Warning (when in Draft):** Surfaces if an AI proposal contradicts an active `Decision`, displaying the existing decision text, proposed text, and conflict rationale.

### 2. Side Panel — Investigation Workshop & Synthesis Controls
Reuses the Investigation Workshop visual and interaction pattern:
- **Conversation Stream:** Investigation session attached to the plan via `plan_chat_sessions`.
- **Synthesis / Re-synthesis Controls:**
  - "Re-synthesize Plan" button → triggers explicit **Document Selection Modal** (default: all project documents).
  - Explicit notification that uploading new documents does *not* automatically overwrite or regenerate the plan.
- **Draft Action Bar (visible when a draft exists):**
  - "Accept Draft" (primary action, guarded RPC). If conflicts exist, opens the **Decision Resolution Modal**.
  - "Reject Draft" (destructive/dismiss action, guarded RPC).
  - Version diff summary (e.g. `+3 added · 1 modified · 1 conflict`).
- **Decision Conflict Resolution Modal:**
  Forces human decision for every unresolved conflict:
  1. *Accept Proposed*: Adopt AI proposal and create new/updated human Decision.
  2. *Keep Existing*: Reject AI change and maintain the existing human Decision.
  3. *Custom Decision*: Author a distinct human Decision with custom text and rationale.

---

## State Model

| State | Condition | UI Presentation |
|---|---|---|
| **Loading** | Fetching plan or version data | Skeleton claim cards in 4 sections |
| **Empty (No Documents)** | Project has 0 uploaded documents | Prompt to upload drawings/specs before synthesis |
| **No Active Plan** | Documents exist but no plan generated | "Synthesize Initial Project Plan" empty state call-to-action |
| **Active Plan** | Active version exists, no open draft | Four sections rendered with grounding badges, citations, and version metadata |
| **Draft Available** | Active plan exists + open draft exists | Side-by-side or inline claim diff (Added/Removed/Modified/Unchanged) with review actions |
| **Unresolved Conflict** | Draft contains Decision contradictions | Amber warning badges on conflicted claims; "Accept Draft" triggers resolution wizard |
| **Permission Denied** | User has `Viewer` role | Read-only mode; mutation controls, synthesis triggers, and accept/reject buttons disabled with explanation |
| **Error / Failed** | RPC or generation failure | Inline error alert with retry option; never leaves inconsistent state |

---

## Security & Invariants

1. **Content Immutability:** No direct client SQL `UPDATE` on `project_plan_versions` or `project_plan_claims`. Transitions happen only through `accept_project_plan_draft` and `reject_project_plan_draft`.
2. **Atomic Conflict Gating:** Activation strictly fails if any conflict remains unresolved.
3. **One Open Draft:** Partial unique index prevents multiple concurrent drafts per plan.
4. **Project Isolation:** Triggers and RLS enforce that all source documents, chat sessions, claims, decisions, and lineage edges belong strictly to the same project.
5. **No Activity Table:** Activity stream is derived from `audit_events`, `project_plan_versions`, `decisions`, and `messages`.
6. **No Downstream BOQ Pull:** Project Plan scope only; does not perform BOM explosion, pricing, labor estimation, or catalog mapping.

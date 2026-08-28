# Vectoris — Project Plan Page (Implementation Specification)

**Status:** APPROVED — concept and data model. OD-24 resolved by founder authorization, 2026-08-28 (not a THESIS.md discovery Gate — that framework governs H1/H2 market-validation hypotheses and has no bearing on this internal architecture decision). This document supersedes the original `PLAN.md` proposal.
**Not yet done:** propagation of this resolution into `OPEN_DECISIONS.md`, `MVP_BOUNDARY.md`, `PRODUCT_SCOPE.md`, `FEATURE_MAP.md`, `PROJECT_INTELLIGENCE.md`, and `NAVIGATION.md` (the last has a real, verified defect — see §9). That propagation is Phase 0 of the implementation plan and has not yet been applied to any file.
**Owner of:** The Project Plan concept, its data model, its AI-tool contract, and the invariants that bound its implementation.
**Does not own:** The canonical text of `OPEN_DECISIONS.md`/`PROJECT_INTELLIGENCE.md` themselves — this document specifies what those files should say once updated; it isn't a substitute for updating them.

---

## 1. The Core Pipeline

Every mechanism in this document exists to make this sequence true, always, with no shortcut around any step:

```
AI proposes
    ↓
System records a DRAFT (never overwrites the active version)
    ↓
Human reviews claim-level changes
    ↓
Human resolves conflicts / Decisions
    ↓
Guarded RPC atomically activates the approved snapshot
```

Nothing in this spec should be read in a way that contradicts this pipeline. Where an earlier draft of this design implied the system might *reject* a draft outright when it touched an existing Decision, that was wrong and is corrected in §5 below — the draft is always recorded so the human can see the proposed change; only *activation* is ever blocked.

## 2. OD-24 Resolution Record

**Grounding procedure.** Every atomic plan claim receives exactly one of four classifications, owned canonically by `PROJECT_INTELLIGENCE.md` §4 — this document references that taxonomy, it does not redefine it:
- **Known from evidence** — directly stated/measured; cites source document and location.
- **Inferred** — derived from cited sources; includes reasoning and uncertainty.
- **Human-decided** — explicitly accepted or edited by a human; references a first-class `Decision`.
- **Unresolved/unknown** — evidence absent, contradictory, or insufficient; reason shown.

A section containing mixed classifications is visibly marked as mixed, never laundered into a single status.

**Decision and Activity.**
- `Decision` is a **first-class, append-only entity**. It belongs to a **claim identity** (`plan_claim_identities.claim_id`), not to any single plan version — the same identity persists across v1, v2, v3, and a Decision made against it in v1 still governs it in v3, unless a human explicitly supersedes it.
- `Activity` is **not** a new entity. The activity feed is derived from existing `audit_events`, chat messages, plan-version history, and `Decision` records. Introducing a separate Activity table would duplicate existing event sources for no correctness benefit.

**Authorization basis, recorded accurately:** "Resolved by founder authorization, 2026-08-28." Not a passed discovery Gate — none exists for this class of decision, and none should be invented to make this look like it went through the market-validation Gates framework it was never part of.

## 3. Data Model

### 3.1 Claim identity — final, settled

```
plan_claim_identities
  claim_id uuid primary key default gen_random_uuid()   -- created once, ever; never reused
  project_id
  created_at

project_plan_claims                                      -- one row per claim PER VERSION
  id uuid primary key default gen_random_uuid()
  claim_id uuid not null references plan_claim_identities(claim_id)
  plan_version_id uuid not null references project_plan_versions(id)
  section text not null                                   -- 'scope_outcomes' | 'milestones' | 'risks' | 'dependencies' — see §4
  content, grounding, evidence_links, inference_rationale, unresolved_reason
  unique (plan_version_id, claim_id)
```

No `claim_key`, semantic grouping key, text hash, or array-position identity exists anywhere in this model. If a future feature genuinely needs grouping across claim lineages, that is a separate, explicitly documented decision — not something implied by an unstated column meaning in the first migration.

### 3.2 Lineage

```
claim_lineage
  parent_claim_id uuid not null references plan_claim_identities(claim_id)
  child_claim_id uuid not null references plan_claim_identities(claim_id)
  relationship text not null check (relationship in ('split','merge'))
  occurred_at timestamptz not null default now()
  triggering_plan_version_id uuid not null references project_plan_versions(id)
  check (parent_claim_id <> child_claim_id)
```
`triggering_plan_version_id` gets the same cross-project integrity trigger already used for `detections`, `line_items`, and `takeoff_run_documents` in `DATA_MODEL_SCHEMA.md` — it must resolve to the same project as both claim identities it connects. This is the one new FK the feature introduces; it does not get an exemption from a pattern everything else in the schema already follows.

Split/merge lineage **never automatically propagates a Decision.** A Decision attached to a parent claim does not transfer to its children, or vice versa for a merge — it always surfaces as an explicit, human-resolvable conflict (§5).

### 3.3 Plans, versions, and immutability — corrected

```
project_plans
  id, project_id (one logical plan per project)

project_plan_versions
  id, plan_id, version_number
  status text not null check (status in ('draft','active','superseded'))
  created_at, created_by
```

**Precise statement of immutability, replacing the earlier loose phrasing:** *plan version **content** (the claims belonging to it, and their grounding/evidence) is immutable after creation. Only lifecycle **metadata** — `status` and its associated timestamps — may transition, and only through the guarded RPCs in §5, never a raw client `UPDATE`.* This distinction matters enough to state explicitly, because "immutable versioned snapshot" read literally implies zero mutation of any kind, which isn't actually true and would confuse a future implementer into either over-restricting (blocking legitimate status transitions) or under-restricting (assuming immutable meant "convention only," not enforced).

**Concurrent-draft rule, enforced at the database level, not just in application logic:**
```sql
create unique index one_open_draft_per_plan
  on project_plan_versions (plan_id)
  where status = 'draft';
```
A new draft-creation call while one is already open fails at the constraint, closing the race window an RPC-only pre-check would leave open between two near-simultaneous calls.

### 3.4 Source documents

Plan-version-to-document links are normalized, not JSONB. Every linked document must belong to the same project as the plan version — enforced by trigger, same pattern as elsewhere in this schema.

## 4. Section Taxonomy — fixed, and explicitly not a table structure

**Founder-approved decision, recorded with OD-24, dated 2026-08-28:** the four initial sections are **Scope & outcomes, Milestones, Risks, Dependencies.**

**This is a presentation/domain taxonomy carried on `project_plan_claims.section` as a text/enum column — it is not four separate tables, and must never become four separate tables.** The claim model already handles this:
```
Plan Version
  └── Claims
       ├── section = 'scope_outcomes'
       ├── section = 'milestones'
       ├── section = 'risks'
       └── section = 'dependencies'
```
A future implementer inventing `project_plan_risks`, `project_plan_milestones`, etc. as separate persistence models would be reintroducing exactly the kind of premature-taxonomy-lock-in the whole `claim_key` removal (§3.1) was designed to avoid, one layer up.

## 5. Draft Lifecycle and Conflict Handling — corrected

The earlier draft of this design said the draft-creation RPC "rejects attempts to silently alter a claim covered by an active Decision" and, separately, that the tool "must surface that as an unresolved conflict" — those two statements contradict each other: a rejected draft can't also contain a visible conflict for review. Corrected behavior, matching §1's pipeline exactly:

```
AI proposes revision
        ↓
Draft creation RPC
        ↓
Does the proposal contradict an active Decision?
      ↙ NO                           ↘ YES
Normal draft claim              Draft claim created WITH an
                                 explicit, visible unresolved
                                 conflict — never silently applied,
                                 never silently dropped
        ↓                                    ↓
                    Both paths converge on:
              Human reviews the draft
                        ↓
        Activation is blocked while any conflict
        is unresolved — enforced by the accept RPC,
        not by refusing to create the draft
```

**Accept RPC, made concrete.** "Acceptance atomically creates any approved human Decisions" was underspecified — the system has no way to know what "approved" means without the human's actual resolutions as input. Conceptual signature:
```
accept_project_plan_draft(draft_version_id, decision_resolutions[])
```
where each resolution states, per conflicted claim, one of: accept the new claim as a new/updated Decision; keep the existing Decision unchanged and discard the proposed change; or explicitly record a new human Decision that differs from both. The RPC:
1. Validates every conflict has a resolution before proceeding — an unresolved conflict blocks activation entirely.
2. Atomically: applies the resolutions (creating/superseding `Decision` rows as directed), marks the draft version `active`, supersedes the prior active version, writes `audit_events`.

**Reject RPC** supersedes only the rejected draft and writes an audit event — no Decision changes occur on rejection.

## 6. AI Tool Contract

Full pipeline, matching the already-locked Vectoris AI architecture — this is not a second chat system, it is one new tool inside the existing one:

```
User
  ↓
Investigation Workshop (ordinary project-scoped chat_sessions row)
  ↓
Vectoris Router
  ↓
Agent Runtime
  ↓
Relevant Skills
  ↓
propose_project_plan_revision  (the one new tool this feature adds)
  ↓
Grounded draft
```

**The tool is explicitly not permitted to:**
- Activate any plan version, under any condition
- Modify an active version directly
- Create or silently modify a `Decision`
- Bypass RLS
- Directly mutate `project_plan_claims` outside the draft-creation RPC path
- Fabricate evidence, or cite evidence outside the explicitly selected document scope
- Use documents outside the currently selected project/document scope

## 7. Document Selection and Regeneration

```
Documents change
      ↓
Plan remains stable — no automatic regeneration
      ↓
User explicitly chooses "Re-synthesize"
      ↓
User selects documents (default: all project documents)
      ↓
AI proposes a new draft
      ↓
Human reviews (§5)
      ↓
Accept → active
```
Uploading or modifying a document never triggers regeneration on its own.

## 8. Chat/Session Model — settled

Project Plan does not own an independent conversation model. Its AI interaction is always an ordinary project-scoped Investigation Workshop `chat_sessions` row — never a separate "Plan Chat" system.

A plan may have **multiple sessions over time**, via a normalized link table rather than a single `project_plans.chat_session_id` column:
```
plan_chat_sessions
  plan_id, chat_session_id, created_at
```
Settled specifics:
- **Starting a new Plan conversation is its own guarded RPC** that atomically creates the `chat_sessions` row and its `plan_chat_sessions` link together — there is never a window where a session exists unlinked, or where a link points at a session belonging to a different project.
- The link table carries the same cross-project check as everything else in this schema: the linked session's `project_id` must match the plan's `project_id`.
- **A link, once created, is permanent** — consistent with this schema's general bias toward append-only history over mutable state (the same reasoning `correction_events` and `audit_events` already follow). A session doesn't get unlinked; if it's no longer the active conversation, a new session is simply started alongside it.

## 9. Activity — no new table

Confirmed unchanged from §2: the activity feed derives from `audit_events`, plan-version history, `Decision` records, and chat messages. No `Activity` table.

## 10. Documentation Corrections Required (Phase 0, not yet applied)

- `NAVIGATION.md` — **verified defect**: it currently claims, in its introduction and cross-references, that it already resolves OD-24. It does not. This needs correcting once the scope change below is actually applied — not before, so the correction reflects real state rather than anticipating it.
- `OPEN_DECISIONS.md` — record OD-24 as resolved per §2, with the accurate authorization basis from §2, not a fabricated Gate.
- `MVP_BOUNDARY.md`, `PRODUCT_SCOPE.md`, `FEATURE_MAP.md` — move grounded Project Plan synthesis into MVP scope. Whoever applies these edits should verify each table's actual current column structure directly before drafting a diff against it — an earlier draft of this scope-change diff assumed a three-column `MVP_BOUNDARY.md` table that doesn't match the file's real two-column structure; that mistake should not be repeated.
- `PROJECT_INTELLIGENCE.md` — becomes the canonical owner of the four grounding classes, section-aggregation rules, decision precedence, and the split/merge conflict rule. This document references that spec; it must never independently reinterpret it. If `PROJECT_INTELLIGENCE.md` doesn't yet state these precisely enough to be unambiguous, that's a prerequisite edit, not something to leave implicit here.
- `DATA_MODEL.md` / `DATA_MODEL_SCHEMA.md` — add the conceptual and concrete entities from §3 respectively, following the exact RLS/RPC/column-grant conventions already established there (see `AUDIT_04.md` for the specific failure patterns — missing column grants on UPDATE, insufficiently constrained `WITH CHECK` — to check against before considering this done).
- Add `docs/06_PAGES/PROJECT_PLAN.md`, matching the Investigation Workshop page-spec format.

## 11. Flagged for Later, Not Solved Now — stale evidence provenance

A real gap, raised in review: if a claim cites `Drawing A-102` as evidence and that document is later replaced, nothing currently detects that the citation may now be stale. This is **not solved in this revision** — `documents` has no version or content-hash column today, so genuine staleness detection isn't buildable yet without a separate change to the document model first.

What this spec does commit to now: plan-version-to-document links (§3.4) preserve enough provenance — which specific document a claim's evidence pointed at, at the time — that staleness detection can be built later without a data migration. The detection mechanism itself is out of scope here. Recommend logging this as a new candidate open decision (**OD-27** — OD-26 is already reserved, from the earlier `evidence_links` JSONB-normalization note in `DATA_MODEL_SCHEMA.md`) rather than quietly promising a capability this revision doesn't actually deliver.

## 12. Non-Negotiable Invariants

Preserved from review, corrected for internal consistency (notably #6, which previously implied outright rejection rather than conflict-flagging — see §5), and merged with the additions settled earlier in this design process. These are implementation boundaries, not architectural intent — a build that violates any of these is wrong regardless of what else it gets right.

1. Plan version **content** is immutable after creation. Only lifecycle metadata (status, timestamps) transitions, and only through guarded RPCs.
2. AI can only create drafts. AI can never activate, supersede, reject, or directly mutate an active plan.
3. AI cannot create or silently modify human Decisions.
4. A Decision belongs to a plan claim **identity** (`plan_claim_identities.claim_id`), not to a specific plan version.
5. Decision propagation across claim lineage is never automatic. Split/merge relationships always require human resolution.
6. When a proposed revision would contradict an active Decision, the draft is still created, with the conflict explicitly visible — it is not silently applied and the draft is not rejected outright. **Activation** of that draft is blocked until the conflict is resolved.
7. All evidence must reference project-scoped documents; enforced by trigger, not convention.
8. Plan generation uses only explicitly selected project documents. Default selection is all documents.
9. Uploading or modifying a document never automatically regenerates a Plan.
10. Project Plan uses the existing Investigation Workshop/chat infrastructure exclusively. No second chat/session system is introduced, even as multiple sessions per plan become possible (§8).
11. Activity remains derived from existing audit/history/chat/Decision sources. No Activity table is introduced.
12. The four Plan sections are a fixed domain taxonomy carried as a column value, not four separate persistence models.
13. Every AI-generated claim exposes its grounding classification and evidence — never an unlabeled assertion.
14. No claim, Decision, evidence relationship, or lineage edge may cross project boundaries, including through direct Data API access — enforced by RLS and triggers, not by client-side discipline alone.
15. Only one open draft may exist per plan at a time, enforced by a database constraint (§3.3), not an RPC-level check alone.
16. Every `claim_lineage` edge carries a non-null `occurred_at` and `triggering_plan_version_id`, and that version is verified (by trigger) to belong to the same project as both claims it connects.
17. Starting a new Plan chat session is atomic — the session and its plan-link are created together, never independently, via a single guarded RPC.

## 13. Cross-References

- `../OPEN_DECISIONS.md` — OD-24 (resolved, this document), OD-26 (evidence-links JSONB normalization, still open), OD-27 (proposed — stale-evidence detection, §11)
- `../MVP_BOUNDARY.md`, `00_PROJECT/PRODUCT_SCOPE.md`, `01_PRODUCT/FEATURE_MAP.md` — scope-change targets, §10
- `DOMAIN/PROJECT_INTELLIGENCE.md` — canonical owner of the grounding taxonomy this document only references (§2, §6)
- `03_ARCHITECTURE/DATA_MODEL.md`, `03_ARCHITECTURE/DATA_MODEL_SCHEMA.md` — where §3's entities need a concrete home, following existing RLS/RPC/column-grant conventions
- `Research Folder/AUDIT_04.md` — the specific column-grant and `WITH CHECK` failure patterns to verify against before any table in §3 is considered done
- `06_PAGES/AI_SESSION.md` — the Investigation Workshop pattern §6 and §8 build on directly, not alongside
# AUDIT_04 — Supabase Integration Landing (commits `306f320`..`d7a0a10`)

**Scope:** Four commits since `AUDIT_03.md` (`18da768`): `306f320` (Supabase integration + AI agent framework scaffold), `d2747b7` (v0.2.2, multi-tenant org/role resolution), `ddb2cf9` (desktop deep-link auth callback), `d7a0a10` (auth error diagnostics). This is the commit where the backend actually landed — `supabase/migrations/`, `src/services/{auth,organization,project,document,takeoff,session}Service.ts`, `src/ai/**`, and `docs/03_ARCHITECTURE/DATA_MODEL_SCHEMA.md` (my v2 spec, committed verbatim) all appear for the first time.

**Verdict up front:** the SQL implementation of the schema/RLS spec is unusually faithful — better than "close," genuinely correct on most of what it touches, and it independently fixed a real bug in my own spec (§2 below). But this same commit also put real, named client data into a **public** GitHub repository, which is a more serious problem than anything in the schema and should be treated as the top priority, not a footnote.

---

## 1. CRITICAL — Real client BOQ data committed to a public repo

`306f320` added `Research Folder/1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx` (17.3 MB) to a **public** GitHub repository (confirmed: `git clone`/`git fetch` against `HardikBhaskar2010/Vectoris` succeed with zero credentials). `Research Folder/Sample BOQ/` already contained `BOQ for GB 300 -R1.xlsx` and `BOQ. Emerson Climate Technologies.pdf` from an earlier commit — same exposure, just older.

Worse, `supabase/migrations/20260827100000_seed_historical_boq_dev_data.sql` doesn't just reference these files by path — it transcribes line items from them directly into SQL, with a comment explicitly reading `-- Line Items — GB 300 (All Authentic Quantities & Specs from Historical BOQ)` and `-- Line Items — EMERSON PAC (All Authentic Quantities & Specs from Historical BOQ)`. Item codes, specs, and quantities from both real BOQs are now literal `INSERT` values in a migration file, alongside `documents` rows whose `local_reference` points at the exact repo-relative path of the raw client file.

This is precisely what this project's own `SECURITY.md` / `DATA_LIFECYCLE.md` / (in the prior DrawSpec-era README) Data Rights & Governance section says must never happen without documented authorization — "Pricing and supplier quotes," "Completed estimates and takeoffs," and "Any data that could be used as a model training example" are all named as requiring written, specific authorization before entering *any* system, pipeline, or storage. A public GitHub repo is a considerably more severe exposure than the "workplace observation, not a data acquisition event" framing that governed the original review of these two BOQs.

**This is not a schema problem and no RLS policy fixes it** — RLS controls who can query a *running database*; it does nothing for a file already sitting in git history on a public remote.

**Recommended immediate action, in order:**
1. Treat both source files (and the seed migration's transcribed line items) as already leaked — rotating/removing them from the current `HEAD` does not remove them from git history, which is likely already cached by GitHub, any forks, and search-indexing crawlers the moment the commit was pushed.
2. Contact whoever owns the actual authorization relationship with the two BOQ sources (Emerson Climate Technologies / the GB 300 project owner) before deciding next steps — this is a permissions question, not an engineering one, and it's outside what I should decide unilaterally.
3. If removal is the right call once that's resolved: rewrite git history (`git filter-repo` or equivalent) to strip the files from every commit, force-push, and separately ask GitHub support to purge cached views/forks — a plain `git rm` + new commit is not sufficient, the blob stays reachable via history.
4. Replace the seed migration with synthetic data. The seed data's actual *purpose* — proving RLS/tenant-isolation and exercising the schema end-to-end (the migration's own third dataset, "ISOLATED TENANT TEST ORG," is exactly this and is fine) — doesn't require real quantities or a real client name at all. Fabricated line items exercise the schema identically.
5. Add `Research Folder/*.xlsx`, `Research Folder/**/*.pdf`, or similar to `.gitignore` going forward — currently `.gitignore` only excludes `.env*`.

I'm flagging this with the priority it deserves rather than downplaying it because the rest of the commit is good engineering — the two are unrelated, and the second doesn't offset the first.

---

## 2. `effective_project_role()` / `my_org_role()`: SECURITY DEFINER instead of INVOKER — this is a correct fix to a bug in my own spec, not a regression

My v2 spec explicitly specified `security invoker` for these two helpers, with a paragraph arguing that was the *right* choice for least-privilege. The migration changed both to `security definer`. On inspection, my spec's choice would not actually work: `org_members_select`'s policy is `using (my_org_role(organization_id) is not null)`, and `my_org_role()` itself does `select role from org_members where ...`. Under `SECURITY INVOKER`, that inner `SELECT` is itself subject to `org_members`'s own RLS policies — i.e., evaluating `org_members_select` requires evaluating `org_members_select`, which Postgres detects and rejects as **infinite recursion in policy for relation "org_members"**. The same applies to `effective_project_role()` against `project_members`/`projects`.

`SECURITY DEFINER` is the standard, documented fix for exactly this pattern (a helper function used inside a table's own RLS policy, querying that same table) — it lets the helper's internal query bypass RLS so the recursion never starts. It remains safe here because neither function accepts a caller-supplied identity: both derive the acting user from `auth.uid()` internally, which is exactly the hardening point I originally asked for — it's just achieved with `SECURITY DEFINER` instead of `SECURITY INVOKER`. `EXECUTE` is correctly still restricted to `authenticated` only.

**Action:** update `DATA_MODEL_SCHEMA.md` §4.0 to reflect `SECURITY DEFINER` as the correct form and remove the now-inaccurate "invoker is intentional" paragraph — the spec is wrong here, not the implementation. I'll produce that correction alongside this audit.

---

## 3. New finding — `org_members` / `project_members` UPDATE policies don't restrict which columns change (not caught in the prior review, present in both my spec and the migration)

`org_members_update` and `project_members_update` gate the request with `role_rank(...)` checks, but — unlike `projects`, `documents`, `line_items`, `correction_events`, and `detections`, which all pair their UPDATE/INSERT policy with an explicit `revoke ... / grant update (columns)` — neither membership table has a column-level grant restricting the UPDATE surface. `WITH CHECK (role_rank(role) <= ...)` only re-validates the `role` column; it says nothing about `user_id`, `organization_id`/`project_id`, `invited_by`/`assigned_by`, or `joined_at`/`assigned_at`.

Concretely: an Owner/Admin/Manager authorized to change a lower-ranked member's `role` can, via the same `UPDATE`, also silently rewrite that row's `user_id` — reassigning someone else's membership seat to an arbitrary different user, with no audit trail distinguishing this from an ordinary role change (no `audit_events` row is written by a raw table `UPDATE` at all, only the RPC-mediated mutations in §5 of the spec do that).

**Fix (small, same pattern already used elsewhere in this migration):**
```sql
revoke update on org_members from authenticated;
grant update (role) on org_members to authenticated;

revoke update on project_members from authenticated;
grant update (role) on project_members to authenticated;
```
This is a one-line-per-table fix, not a redesign — flagging it because it's the same class of bug the earlier review caught elsewhere (§5 "line_items UPDATE policy" point), just in a spot neither of us checked at the time.

---

## 4. New finding, more serious — `chat_sessions_update` allows session ownership hijack by a shared editor

`chat_sessions_update`'s policy has a `USING` clause but no explicit `WITH CHECK`. Per standard Postgres behavior, when `WITH CHECK` is omitted on an UPDATE policy, `USING` is reused as the check on the *new* row. `USING` is:
```sql
created_by = auth.uid()
or exists (select 1 from session_shares ss where ... and ss.role = 'editor')
```
There is also no column-level `GRANT` narrowing what an authorized `UPDATE` can touch (unlike `projects`/`documents`/`line_items`).

Combine those two gaps: a user who only has an **editor share** on someone else's session (not the creator) is permitted by `USING` to update the row, and the reused `WITH CHECK` only requires that the *resulting* row satisfy `created_by = auth.uid() OR (has an editor share)` — and since they already have the editor share, that's true no matter what they set `created_by` to. **A shared editor can set `created_by = <their own user id>`, and the update passes.** Session ownership has just changed hands.

This matters because `session_shares_manage` — the policy governing who can add/remove/modify `session_shares` rows — is gated entirely on `cs.created_by = auth.uid()`. Once an editor rewrites `created_by` to themselves, they gain exclusive control over sharing for that session, including the ability to remove the original creator's access via `session_shares` (the creator's *own* access, having never had a `session_shares` row of their own — they relied on `created_by` — would now show them as having no access at all: `chat_sessions_select`'s first branch `created_by = auth.uid()` no longer matches them, and no `session_shares` row exists for them either, unless the new "owner" chooses to add one). This is a real privilege-escalation / lockout path, not a theoretical one — it requires nothing more than an ordinary `PATCH` to the `chat_sessions` table via the anon-key REST API, available to anyone the session was legitimately shared with as an editor.

**Fix:**
```sql
revoke update on chat_sessions from authenticated;
grant update (title, updated_at) on chat_sessions to authenticated;
-- title/updated_at are the only fields a legitimate edit should ever touch;
-- created_by and project_id become effectively immutable post-creation.
```
This closes it the same way the column-grant pattern closes it everywhere else in the migration — `created_by`/`project_id` simply aren't in the grantable set, so no `WITH CHECK` clause even needs to reason about them.

---

## 5. Confirmed correct — everything else in the RLS/RPC surface

Checked in detail and matching the v2 spec faithfully, with no gaps found beyond §3/§4 above:
- All 16 tables have `ENABLE ROW LEVEL SECURITY` and an explicit policy set (no `-- repeat` shorthand — the earlier review's point 4 is fully addressed).
- `role_rank()`-gated INSERT/UPDATE/DELETE on `project_members` correctly makes it structurally impossible for a Manager to grant Admin/Owner (confirmed by re-deriving: `role_rank('admin')=4 > role_rank('manager')=3` fails the `<=` check).
- `projects_delete`/`documents` soft-delete are genuinely RPC-only now (`soft_delete_project`, `restore_project`, `soft_delete_document`) — `deleted_at` is absent from every client column grant, closing the original "delete policy is actually an unrestricted update policy" finding.
- `is_training_candidate` is excluded from the client `INSERT` column grant entirely (not just defaulted) and `mark_training_candidate()` correctly checks `auth.jwt() ->> 'role' = 'service_role'` in addition to its `EXECUTE` grant being `service_role`-only.
- `detections`: `confidence` is correctly excluded from the client `SELECT` column grant — the product's "confidence never reaches the UI" decision is enforced at the database layer, not just by convention.
- All three cross-project referential-integrity triggers (`detections`, `line_items`, `takeoff_run_documents`) are present, correctly walk the multi-hop chains, and fire on both `INSERT`/`UPDATE` where appropriate.
- `approve_line_item()`/`reject_line_item()` correctly bundle the status transition and the resulting `correction_event` in one transaction, and both re-check `effective_project_role()` internally rather than trusting `GRANT EXECUTE` alone to be sufficient authorization.
- `storage_mode` + `local_reference`/`cloud_bucket`/`cloud_object_path` + `CHECK` constraint implemented exactly as specified, on both `documents` and `exports`.
- **Beyond the spec, in a good way:** `create_organization_with_owner()` — my spec described this need in a comment (§4.1: "organization creation happens via a dedicated signup/onboarding RPC...") but never actually wrote the function. The migration added it, correctly: checks `auth.uid() is not null`, creates the org + the creator's `owner` `org_members` row + an `audit_events` row in one transaction. This is exactly the right shape and fills a real gap I left open.
- `supabaseClient.ts` only ever reads `VITE_SUPABASE_ANON_KEY`; no `service_role` string appears anywhere in `src/`, including the new `src/ai/**` agent framework (checked directly — the framework doesn't hold or use elevated credentials, consistent with §7/§8 of the spec deferring backend-mediated AI orchestration).
- Application-layer service files (`projectService.ts`, `documentService.ts`, `takeoffService.ts`) correctly call the RPCs (`soft_delete_project`, `soft_delete_document`, `approve_line_item`, `reject_line_item`, `restore_project`, `create_organization_with_owner`) for every guarded state transition — I found no raw `.update()` call anywhere touching `status`, `deleted_at`, or `is_training_candidate` directly. The two raw `.update()` calls that do exist and touch membership/session rows (`organizationService.ts:247`, `sessionService.ts:236`) are exactly the two gaps in §3/§4 — the frontend itself behaves safely today, but nothing at the database layer stops a direct API call from doing otherwise, which is the actual point of RLS/column grants existing in the first place.

## 6. Not checked in this pass (scope note)

Given time, I prioritized the schema/RLS surface (where the prior review's findings lived) and the data-governance issue (found opportunistically while checking commit contents). Not yet reviewed: the `src/ai/**` agent framework's tool-calling logic in depth (`toolRegistry.ts` is 998 lines — worth a dedicated pass, particularly for whether any tool can be induced to call the guarded RPCs or read `detections.confidence`-adjacent data in ways that route around the column grants), `useAuth.ts`/`OnboardingPage.tsx`/`InviteMemberModal.tsx` UX-layer correctness (separate from the DB-layer guarantees audited here), and the desktop deep-link auth callback added in `ddb2cf9`.

---

*Companion to `Research Folder/AUDIT_01.md`, `AUDIT_02.md`, `AUDIT_03.md`, and `docs/03_ARCHITECTURE/DATA_MODEL_SCHEMA.md`.*

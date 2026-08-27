# Vectoris — Concrete Data Model Schema (Postgres/Supabase)

**Status:** PROPOSED — implementation-ready refinement of `03_ARCHITECTURE/DATA_MODEL.md`
**Revision:** v2 — incorporates a full security review of v1 (role-hierarchy gaps, an overbroad delete policy, an unhardened RLS helper, missing cross-table integrity, an ambiguous storage field, and incomplete RLS coverage). Every fix is called out inline as `[v2 FIX]` so the delta from v1 is traceable.
**Owner of:** Concrete table definitions, constraints, indexes, RLS policies, and the RPC surface for state transitions
**Does not own:** Conceptual entity relationships (→ `DATA_MODEL.md`, unchanged), API contracts (→ `API_ARCHITECTURE.md`)
**Depends on:** `DATA_MODEL.md` (LOCKED: Supabase/PostgreSQL engine), `01_PRODUCT/USER_ROLES.md` (LOCKED: role matrix), `MVP_BOUNDARY.md` (LOCKED: scope)

> Nothing here introduces new product scope. Future/out-of-scope entities (`Estimate`, `Estimate Line Item`, `Bid`) remain undefined per `MVP_BOUNDARY.md` and OD-22/OD-23.

---

## 1. Scope Note

Same as v1: does not resolve OD-01–OD-25 beyond what's flagged; does not decide FastAPI-vs-PostgREST timing beyond §7 (unchanged from v1 — the review explicitly endorsed keeping FastAPI/Redis/Celery deferred). Raw drawing bytes are never modeled here — see §3.5/§3.11 for the storage-reference redesign.

## 2. Extensions & Conventions

```sql
create extension if not exists "pgcrypto";

-- Convention: id uuid pk default gen_random_uuid(), created_at timestamptz
-- default now(), updated_at where mutable, deleted_at for soft-delete
-- (30-day grace period per SECURITY.md §5 / DATA_LIFECYCLE.md §2).
--
-- [v2] General pattern adopted throughout this revision: sensitive or
-- state-owning columns are excluded from client GRANT UPDATE/INSERT lists
-- and are instead mutated only through SECURITY DEFINER RPC functions
-- that (a) check authorization explicitly, (b) write the resulting
-- audit_events row in the SAME transaction, and (c) set search_path
-- explicitly. RLS policies alone cannot express "this column is
-- off-limits even to an otherwise-authorized row" — column-level GRANTs
-- do that; the two mechanisms are used together, not as alternatives.
```

## 3. Core Tables

### 3.1 organizations
```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null, -- references auth.users(id)
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

### 3.2 org_members
```sql
create type org_role as enum ('owner','admin','manager','editor','viewer');

create table org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id)
  role org_role not null,
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on org_members(user_id);
```

### 3.3 project_members
```sql
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  role org_role not null,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique (project_id, user_id)
);
```
`[v2 NOTE]` `assigned_by` remains a provenance column only — it records who made the change, it does not authorize anything. Authorization is enforced entirely by the RLS policies in §4.2, which is the gap the review correctly identified.

### 3.4 projects
```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  inferred_type text,
  user_provided_type text,
  verified_type text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_projects_org on projects(organization_id) where deleted_at is null;
```

### 3.5 documents `[v2 FIX — storage reference split]`
The review is right that a single `storage_reference text` field silently overloading "local path" and "cloud object pointer" is a liability the moment code has to branch on it. Split explicitly:
```sql
create type storage_mode as enum ('local','cloud');

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  filename text not null,
  format text not null,
  upload_status upload_status not null default 'queued',
  storage_mode storage_mode not null default 'local',
  local_reference text,       -- populated when storage_mode = 'local'
  cloud_bucket text,          -- populated when storage_mode = 'cloud'
  cloud_object_path text,     -- populated when storage_mode = 'cloud'
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  error_message text,
  deleted_at timestamptz,
  constraint documents_storage_reference_check check (
    (storage_mode = 'local' and local_reference is not null
       and cloud_bucket is null and cloud_object_path is null)
    or
    (storage_mode = 'cloud' and cloud_bucket is not null and cloud_object_path is not null
       and local_reference is null)
  )
);
create type upload_status as enum ('queued','ingesting','classifying','detecting','complete','parsed','error');
create index idx_documents_project on documents(project_id) where deleted_at is null;
```
*(Type declaration ordering note: `upload_status` enum must be created before the table in an actual migration — shown after here only for reading flow; see §6 phase ordering for the real sequence.)*

### 3.6 sheets
```sql
create type sheet_classification as enum ('floor_plan','schedule','single_line','legend','notes');

create table sheets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  sheet_index int not null,
  classification sheet_classification,
  page_width numeric,
  page_height numeric,
  created_at timestamptz not null default now(),
  unique (document_id, sheet_index)
);
```

### 3.7 takeoff_runs / takeoff_run_documents
```sql
create type run_status as enum ('pending','running','complete','error');

create table takeoff_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  triggered_by uuid not null references auth.users(id),
  model_version text not null,
  status run_status not null default 'pending',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table takeoff_run_documents ( -- proposed resolution for OD-09, unchanged from v1
  takeoff_run_id uuid not null references takeoff_runs(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  primary key (takeoff_run_id, document_id)
);
```

### 3.8 detections
```sql
create table detections (
  id uuid primary key default gen_random_uuid(),
  takeoff_run_id uuid not null references takeoff_runs(id) on delete cascade,
  sheet_id uuid not null references sheets(id) on delete cascade,
  component_type text not null,
  quantity numeric,
  geometry jsonb,
  source_coordinates jsonb not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  model_version text not null,
  created_at timestamptz not null default now()
);
create index idx_detections_run on detections(takeoff_run_id);
create index idx_detections_sheet on detections(sheet_id);
```
`[v2 FIX]` — v1 noted confidence "should never reach the client" only as a comment. §4.9 now enforces this with a column-level `GRANT SELECT` list, not just documentation.

### 3.9 line_items `[v2 FIX — RPC-gated status transitions]`
```sql
create type line_item_status as enum ('proposed','approved','rejected');
create type detection_source as enum ('ai_detection','human_created');

create table line_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  linked_detection_id uuid references detections(id),
  source detection_source not null,
  item_code text,
  name text not null,
  category text,
  current_value numeric not null,
  unit_of_measure text not null,
  status line_item_status not null default 'proposed',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_line_items_project on line_items(project_id);
create index idx_line_items_status on line_items(project_id, status);
```
Column ownership, per the review's three-way split:
- **Review-owned** (`status`, `reviewed_by`, `reviewed_at`) — mutated only by `approve_line_item()` / `reject_line_item()` (§5).
- **Editable** (`name`, `category`, `current_value`, `unit_of_measure`) — direct client `UPDATE`, gated by RLS.
- **System-owned** (`source`, `linked_detection_id`, `project_id`) — no client `UPDATE` grant at all, at any role.

### 3.10 correction_events `[v2 FIX — is_training_candidate now unreachable by clients]`
```sql
create type correction_type as enum (
  'missed','false_positive','wrong_symbol','wrong_classification',
  'duplicate','scope_excluded','sheet_conflict','manual_override','other'
);

create table correction_events (
  id uuid primary key default gen_random_uuid(),
  line_item_id uuid not null references line_items(id) on delete cascade,
  ai_value text,
  human_value text not null,
  delta text,
  correction_type correction_type not null,
  correction_reason text,
  user_id uuid not null references auth.users(id),
  model_version text,
  is_training_candidate boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_correction_events_line_item on correction_events(line_item_id);
create index idx_correction_events_user on correction_events(user_id);
```
`[v2 FIX]` §4.10 excludes `is_training_candidate` from the client's `INSERT` column grant entirely (so a client `INSERT` naming it fails outright, and any omitted insert takes the `DEFAULT false`), grants no `UPDATE`/`DELETE` to `authenticated` at all, and adds `mark_training_candidate()`, executable only by `service_role`.

### 3.11 exports `[v2 FIX — same storage split as documents]`
```sql
create table exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  format export_format not null,
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  storage_mode storage_mode not null default 'local',
  local_reference text,
  cloud_bucket text,
  cloud_object_path text,
  constraint exports_storage_reference_check check (
    (storage_mode = 'local' and local_reference is not null
       and cloud_bucket is null and cloud_object_path is null)
    or
    (storage_mode = 'cloud' and cloud_bucket is not null and cloud_object_path is not null
       and local_reference is null)
  )
);
create type export_format as enum ('XLSX','CSV','JSON','PDF');
```

### 3.12 chat_sessions / messages / session_shares
```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type message_role as enum ('user','agent');

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  tool_calls jsonb not null default '[]',
  evidence_links jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index idx_messages_session on messages(session_id, created_at);

create table session_shares (
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null,
  role org_role not null check (role in ('viewer','editor')),
  primary key (session_id, user_id)
);
```
`[v2 NOTE — technical debt, flagged not fixed]` The review is correct that `evidence_links jsonb` should not become the permanent schema for evidence. This revision keeps it as JSONB for MVP (no normalized `evidence` table exists yet, and building one now would be scope creep ahead of the Investigation Workshop evidence-navigation feature actually landing), but records the debt explicitly: **before evidence navigation/verification ships, `evidence_links` must be normalized into a first-class `evidence` table** (`message_id, document_id, sheet_id, region jsonb, finding text`), matching the `Message → Evidence → Document → Sheet → Region → Finding` chain the review described. Tracking this as a new open decision — recommend adding **OD-26** to `OPEN_DECISIONS.md` rather than letting it stay an implicit assumption in this file alone.

### 3.13 audit_events
```sql
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_audit_events_org on audit_events(organization_id, created_at desc);
```
`[v2 FIX]` See §4.16 — no `UPDATE`/`DELETE` grant to `authenticated` at all (true append-only for application-level access). See §5 for the transactional-write pattern that answers the review's "project deleted ✓ / audit event failed ✗" concern by writing both in the same RPC transaction rather than as two separate client calls.

`[v2 HONESTY NOTE]` RLS and column `GRANT`s restrict the `authenticated`/`anon` Postgres roles used by API clients — they do **not** restrict the table owner or a `superuser` role used for direct database administration/migrations. "Append-only" as specified here is enforced against application access, not against someone with raw database admin credentials. If audit-record tamper-resistance against admin access is a real requirement (e.g., for a future compliance claim), that needs a different mechanism (e.g., external write-once log shipping, or a separate audit database with different credential ownership) — flagging this rather than silently implying a guarantee this schema doesn't actually provide.

---

## 4. Row-Level Security — Complete Policy Set

`[v2 FIX]` Every table gets an explicit `ENABLE ROW LEVEL SECURITY` and a complete policy set below — no `-- repeat` shorthand.

### 4.0 Hardened Helper Functions `[v2 FIX]`

The review's core concern: `effective_project_role()` sits underneath nearly every policy in this document, so its own correctness and tamper-resistance matter more than any individual policy. Two changes: (1) it no longer accepts a caller-supplied `p_user_id` — it derives the acting user from `auth.uid()` internally, so no policy can be tricked by passing someone else's id; (2) `search_path` is pinned and every table reference is schema-qualified, closing the standard Postgres function search-path-hijack vector.

```sql
create or replace function role_rank(r org_role) returns int
language sql immutable
set search_path = public, pg_temp
as $$
  select case r
    when 'owner' then 5
    when 'admin' then 4
    when 'manager' then 3
    when 'editor' then 2
    when 'viewer' then 1
  end
$$;

-- Public-facing: NO p_user_id parameter. Always evaluates for the calling
-- session's own auth.uid(). This is the only version RLS policies call.
create or replace function effective_project_role(p_project_id uuid)
returns org_role
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select pm.role from public.project_members pm
       where pm.project_id = p_project_id and pm.user_id = auth.uid()),
    (select om.role from public.org_members om
       join public.projects p on p.organization_id = om.organization_id
       where p.id = p_project_id and om.user_id = auth.uid())
  );
$$;

create or replace function my_org_role(p_org_id uuid) returns org_role
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select role from public.org_members where organization_id = p_org_id and user_id = auth.uid();
$$;

-- Internal-only variant, for the small set of legitimately trusted backend
-- operations (e.g., a future admin console) that need to evaluate another
-- user's role. SECURITY DEFINER, and execution is revoked from every
-- client-facing role — only service_role may call it. This satisfies
-- "never trust arbitrary caller-supplied p_user_id" by making the
-- unsafe form structurally unreachable from the client, rather than
-- just documenting that it shouldn't be misused.
create or replace function _effective_role_for(p_project_id uuid, p_user_id uuid)
returns org_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select pm.role from public.project_members pm
       where pm.project_id = p_project_id and pm.user_id = p_user_id),
    (select om.role from public.org_members om
       join public.projects p on p.organization_id = om.organization_id
       where p.id = p_project_id and om.user_id = p_user_id)
  );
$$;
revoke all on function _effective_role_for(uuid, uuid) from public, authenticated, anon;
grant execute on function _effective_role_for(uuid, uuid) to service_role;

revoke all on function effective_project_role(uuid) from public;
grant execute on function effective_project_role(uuid) to authenticated;
revoke all on function my_org_role(uuid) from public;
grant execute on function my_org_role(uuid) to authenticated;
grant execute on function role_rank(org_role) to authenticated;
```

`security invoker` (the default, stated explicitly here) is intentional, not an oversight: `effective_project_role()`/`my_org_role()` only read `org_members`/`project_members`, and every user needs to be able to read their own membership rows anyway (granted below in §4.1/§4.2) for the function to work at all under RLS. Making it `SECURITY DEFINER` would be a *wider* privilege grant than necessary — the review asked for "SECURITY DEFINER only if required," and here it genuinely isn't.

### 4.1 organizations
```sql
alter table organizations enable row level security;

create policy organizations_select on organizations for select
  using (my_org_role(id) is not null);

revoke update on organizations from authenticated;
grant update (name, settings, updated_at) on organizations to authenticated;
create policy organizations_update on organizations for update
  using (my_org_role(id) = 'owner')
  with check (my_org_role(id) = 'owner');

-- No client INSERT policy: organization creation happens via a dedicated
-- signup/onboarding RPC that also creates the creator's 'owner' org_members
-- row transactionally (a bare INSERT into organizations would otherwise
-- create an org with no owner row, which nothing in this schema prevents
-- by FK alone).
-- No client DELETE policy at all: org deletion is DATA_LIFECYCLE.md §3.2's
-- multi-step cascading procedure (revoke training consent, anonymize
-- attribution, remove membership) — not a single-table delete. See
-- request_org_deletion() in §5.
```

### 4.2 org_members
```sql
alter table org_members enable row level security;

create policy org_members_select on org_members for select
  using (my_org_role(organization_id) is not null);

create policy org_members_insert on org_members for insert
  with check (
    my_org_role(organization_id) in ('owner','admin')
    and role_rank(role) <= role_rank(my_org_role(organization_id))
  );

-- [v2 FIX] "cannot touch a member at or above your own rank" applies to
-- UPDATE and DELETE both — using() checks the row's CURRENT role,
-- with check() (UPDATE only) checks the proposed NEW role.
create policy org_members_update on org_members for update
  using (
    my_org_role(organization_id) in ('owner','admin')
    and role_rank(org_members.role) < role_rank(my_org_role(organization_id))
  )
  with check (role_rank(role) <= role_rank(my_org_role(organization_id)));

create policy org_members_delete on org_members for delete
  using (
    my_org_role(organization_id) in ('owner','admin')
    and role_rank(org_members.role) < role_rank(my_org_role(organization_id))
  );
```
Per `USER_ROLES.md` §2, Manager is explicitly "Scoped" to *project*-level management and cannot manage org-level settings — so Manager is deliberately absent from `org_members_insert/update/delete` (only Owner/Admin), unlike `project_members` below where Manager does participate. This asymmetry is intentional, not an inconsistency.

### 4.3 project_members `[v2 FIX — this was entirely missing before]`
```sql
alter table project_members enable row level security;

create policy project_members_select on project_members for select
  using (effective_project_role(project_id) is not null);

-- INSERT: Owner/Admin/Manager only, AND the assigned role's rank must not
-- exceed the assigner's own rank. This is the exact rule the review asked
-- for: a Manager (rank 3) satisfies role_rank(role) <= 3, so they can grant
-- Manager/Editor/Viewer but role_rank('admin')=4 and role_rank('owner')=5
-- both fail the check — a Manager structurally cannot grant Admin or Owner.
create policy project_members_insert on project_members for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager')
    and role_rank(role) <= role_rank(effective_project_role(project_id))
  );

create policy project_members_update on project_members for update
  using (
    effective_project_role(project_id) in ('owner','admin','manager')
    and role_rank(project_members.role) < role_rank(effective_project_role(project_id))
  )
  with check (role_rank(role) <= role_rank(effective_project_role(project_id)));

create policy project_members_delete on project_members for delete
  using (
    effective_project_role(project_id) in ('owner','admin','manager')
    and role_rank(project_members.role) < role_rank(effective_project_role(project_id))
  );
```
`[v2 OPEN QUESTION — flagging rather than silently deciding]` The rank-based rule above means a Manager cannot modify or remove another Manager (equal rank, `<` fails), only Editor/Viewer. Whether Managers should be able to manage *peer* Managers within their "scoped" area is genuinely ambiguous in `USER_ROLES.md` §2's one-line description. This spec takes the conservative reading (no touching equal-or-higher rank, full stop). If the founder wants Manager-on-Manager management allowed, that's a one-word change (`<=` instead of `<`) — but it should be an explicit decision, not an accidental default, so it's called out here rather than picked silently.

### 4.4 projects `[v2 FIX — delete/update conflation resolved]`
```sql
alter table projects enable row level security;

create policy projects_select on projects for select
  using (exists (
    select 1 from org_members om
    where om.organization_id = projects.organization_id and om.user_id = auth.uid()
  ));

create policy projects_insert on projects for insert
  with check (exists (
    select 1 from org_members om
    where om.organization_id = projects.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin','manager','editor')
  ));

-- [v2 FIX] Ordinary edits are now column-restricted AND excludes deleted_at
-- entirely from what a direct client UPDATE can touch — soft-delete is no
-- longer reachable via this policy at all, closing the "delete policy is
-- actually an update policy" gap the review flagged.
revoke update on projects from authenticated;
grant update (name, description, user_provided_type, verified_type, updated_at)
  on projects to authenticated;
create policy projects_update on projects for update
  using (effective_project_role(id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(id) in ('owner','admin','manager','editor'));

-- No DELETE policy, and no UPDATE grant on deleted_at, at all. Soft-delete
-- and restore are RPC-only — see soft_delete_project() / restore_project()
-- in §5, which also satisfies the audit-transactionality point (§4.16).
```

### 4.5 documents
```sql
alter table documents enable row level security;

create policy documents_select on documents for select
  using (effective_project_role(project_id) is not null);

create policy documents_insert on documents for insert
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));

-- Client may update status-adjacent fields the upload flow itself owns
-- (e.g. retry after an error); storage fields are immutable post-upload,
-- and deleted_at is RPC-only (soft_delete_document(), §5), mirroring projects.
revoke update on documents from authenticated;
grant update (error_message) on documents to authenticated;
create policy documents_update on documents for update
  using (effective_project_role(project_id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));
-- upload_status transitions are worker/ingestion-pipeline-owned (service_role),
-- not client-settable at all — consistent with EVENT_SYSTEM.md's job lifecycle
-- being server-driven.
```

### 4.6 sheets
```sql
alter table sheets enable row level security;

create policy sheets_select on sheets for select
  using (exists (
    select 1 from documents d
    where d.id = sheets.document_id and effective_project_role(d.project_id) is not null
  ));

-- No INSERT/UPDATE/DELETE grant to authenticated at all. Sheets are written
-- exclusively by the ingestion pipeline (service_role) — there is no product
-- action where a client directly creates or edits a sheet record.
```

### 4.7 takeoff_runs / takeoff_run_documents
```sql
alter table takeoff_runs enable row level security;

create policy takeoff_runs_select on takeoff_runs for select
  using (effective_project_role(project_id) is not null);

create policy takeoff_runs_insert on takeoff_runs for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and triggered_by = auth.uid()
  );
-- status/completed_at/model_version are exclusively worker-owned; no UPDATE
-- grant to authenticated at all — a client can start a run, never mutate
-- its lifecycle fields directly.

alter table takeoff_run_documents enable row level security;

create policy takeoff_run_documents_select on takeoff_run_documents for select
  using (exists (
    select 1 from takeoff_runs tr
    where tr.id = takeoff_run_documents.takeoff_run_id
      and effective_project_role(tr.project_id) is not null
  ));

create policy takeoff_run_documents_insert on takeoff_run_documents for insert
  with check (exists (
    select 1 from takeoff_runs tr
    where tr.id = takeoff_run_documents.takeoff_run_id
      and effective_project_role(tr.project_id) in ('owner','admin','manager','editor')
  ));
```

### 4.8 detections `[v2 FIX — confidence excluded at the column-grant level]`
```sql
alter table detections enable row level security;

revoke select on detections from authenticated;
grant select (id, takeoff_run_id, sheet_id, component_type, quantity, geometry,
              source_coordinates, model_version, created_at)
  on detections to authenticated;
-- 'confidence' is deliberately absent from this list. This enforces the
-- product's LOCKED "confidence never reaches the client" decision (ADR-12)
-- at the database layer — a client SELECT * would previously succeed and
-- silently leak it; now it errors, which is the correct failure mode.

create policy detections_select on detections for select
  using (exists (
    select 1 from takeoff_runs tr
    where tr.id = detections.takeoff_run_id and effective_project_role(tr.project_id) is not null
  ));

-- No INSERT/UPDATE/DELETE grant to authenticated — written only by the
-- Perception worker (service_role).
```

### 4.9 line_items `[v2 FIX — column split + RPC-gated status]`
```sql
alter table line_items enable row level security;

create policy line_items_select on line_items for select
  using (effective_project_role(project_id) is not null);

-- Only the "editable" column group (§3.9) is directly client-writable.
-- status / reviewed_by / reviewed_at / source / linked_detection_id /
-- project_id are excluded from this grant entirely.
revoke update on line_items from authenticated;
grant update (name, category, current_value, unit_of_measure, updated_at)
  on line_items to authenticated;
create policy line_items_update on line_items for update
  using (effective_project_role(project_id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));

create policy line_items_insert on line_items for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and source = 'human_created' -- AI-sourced line items are only ever
                                  -- created by the takeoff pipeline (service_role)
  );

-- No client DELETE at all — per DATA_MODEL.md §2, rejected items are
-- retained for audit, never removed. "Deleting" a manually-created line
-- item a user added by mistake is a status='rejected' transition, not a
-- row deletion — see reject_line_item() in §5.
```

### 4.10 correction_events `[v2 FIX — is_training_candidate structurally unreachable]`
```sql
alter table correction_events enable row level security;

-- Client can INSERT everything except is_training_candidate. Naming that
-- column in a client INSERT statement fails outright (no grant exists for
-- it); an insert that omits it takes the column DEFAULT of false. This is
-- stronger than a CHECK constraint or a BEFORE INSERT trigger resetting the
-- value, because it fails the statement rather than silently overriding it.
revoke insert on correction_events from authenticated;
grant insert (line_item_id, ai_value, human_value, delta, correction_type,
              correction_reason, user_id, model_version)
  on correction_events to authenticated;

create policy correction_events_insert on correction_events for insert
  with check (exists (
    select 1 from line_items li
    where li.id = correction_events.line_item_id
      and effective_project_role(li.project_id) in ('owner','admin','manager','editor')
  ));

create policy correction_events_select on correction_events for select
  using (exists (
    select 1 from line_items li
    where li.id = correction_events.line_item_id
      and effective_project_role(li.project_id) is not null
  ));

-- No UPDATE or DELETE grant to authenticated at all: true append-only
-- from the client's perspective (subject to the §3.13 honesty note about
-- table-owner/superuser access).

create or replace function mark_training_candidate(p_correction_event_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.jwt() ->> 'role' reflects the PostgREST/Supabase-issued JWT's role
  -- claim; this check exists as defense-in-depth even though EXECUTE on
  -- this function is already restricted to service_role below — belt and
  -- suspenders, since a future refactor could accidentally widen the GRANT.
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'only the trusted validation pipeline may set training-candidate status';
  end if;
  update correction_events set is_training_candidate = p_value where id = p_correction_event_id;
end;
$$;
revoke all on function mark_training_candidate(uuid, boolean) from public, authenticated, anon;
grant execute on function mark_training_candidate(uuid, boolean) to service_role;
```

### 4.11 exports
```sql
alter table exports enable row level security;

create policy exports_select on exports for select
  using (effective_project_role(project_id) is not null);

create policy exports_insert on exports for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and generated_by = auth.uid()
  );
-- No UPDATE/DELETE — exports are immutable historical records once created.
```

### 4.12 chat_sessions `[v2 FIX — explicit policies, isolation stated precisely]`
```sql
alter table chat_sessions enable row level security;

create policy chat_sessions_select on chat_sessions for select
  using (
    created_by = auth.uid()
    or exists (select 1 from session_shares ss
               where ss.session_id = chat_sessions.id and ss.user_id = auth.uid())
  );

create policy chat_sessions_insert on chat_sessions for insert
  with check (
    created_by = auth.uid()
    and (project_id is null or effective_project_role(project_id) is not null)
  );

create policy chat_sessions_update on chat_sessions for update
  using (
    created_by = auth.uid()
    or exists (select 1 from session_shares ss
               where ss.session_id = chat_sessions.id and ss.user_id = auth.uid() and ss.role = 'editor')
  );

create policy chat_sessions_delete on chat_sessions for delete
  using (created_by = auth.uid());
```
`[v2 OPEN QUESTION]` This does **not** grant a project's Owner/Admin automatic visibility into every session in that project — only the session's creator and anyone explicitly added via `session_shares` can see it, per the strict reading of `USER_ROLES.md` §5's isolation principle. An oversight override for project Owner/Admin is plausible product behavior but isn't stated anywhere in the locked docs, so this spec does not invent it. If that's wanted, it's an explicit addition to make later (`or effective_project_role(project_id) in ('owner','admin')` in the `select` policy), not a silent default here.

### 4.13 session_shares
```sql
alter table session_shares enable row level security;

-- Only the session's creator (its "owner" in the review's terms) manages
-- who it's shared with — covers select/insert/update/delete in one policy
-- since the authorization condition is identical for all four.
create policy session_shares_manage on session_shares for all
  using (exists (select 1 from chat_sessions cs
                 where cs.id = session_shares.session_id and cs.created_by = auth.uid()))
  with check (exists (select 1 from chat_sessions cs
                       where cs.id = session_shares.session_id and cs.created_by = auth.uid()));

-- A shared user can also see their own share row (so the UI can show them
-- "you have viewer access"), without being able to modify it.
create policy session_shares_self_select on session_shares for select
  using (user_id = auth.uid());
```

### 4.14 messages `[v2 FIX — explicit tunnel-prevention statement]`
```sql
alter table messages enable row level security;

create policy messages_select on messages for select
  using (
    exists (select 1 from chat_sessions cs where cs.id = messages.session_id and cs.created_by = auth.uid())
    or exists (select 1 from session_shares ss where ss.session_id = messages.session_id and ss.user_id = auth.uid())
  );

create policy messages_insert on messages for insert
  with check (
    exists (select 1 from chat_sessions cs where cs.id = messages.session_id and cs.created_by = auth.uid())
    or exists (select 1 from session_shares ss
               where ss.session_id = messages.session_id and ss.user_id = auth.uid() and ss.role = 'editor')
  );
-- No UPDATE/DELETE on messages — session transcripts are append-only,
-- consistent with DATA_LIFECYCLE.md §5 treating them as export/audit content.
```
`[v2 — the "accidental tunnel" concern, addressed directly]` The review is right to worry that a shared session could become a backdoor into project documents/takeoff data. The mechanism that prevents this: `messages.evidence_links` only ever stores *pointers* (`doc_id`, `sheet_id`, coordinates) as JSONB — it is not a foreign key and grants no access by itself. Dereferencing an evidence pointer into an actual `documents` or `line_items` row still goes through `documents_select` / `line_items_select` (§4.5/§4.9), both of which require `effective_project_role(project_id) is not null`. A session Viewer who is not also a project member can read the message text and see *that* it references sheet E-103, but a query joining out to the actual `documents`/`sheets` row returns nothing for them. This is enforced by RLS on those tables independently of session access, not by any logic in the messages policies themselves — worth stating plainly since it's easy to assume the message policies are what does this work, when actually it's the *absence* of a shortcut that does it.

### 4.15 organizations, again — RPC-only destructive ops
Covered in §5.

### 4.16 audit_events `[v2 FIX]`
```sql
alter table audit_events enable row level security;

create policy audit_events_select on audit_events for select
  using (exists (
    select 1 from org_members om
    where om.organization_id = audit_events.organization_id
      and om.user_id = auth.uid() and om.role in ('owner','admin')
  ));

create policy audit_events_insert on audit_events for insert
  with check (exists (
    select 1 from org_members om
    where om.organization_id = audit_events.organization_id and om.user_id = auth.uid()
  ));

-- No UPDATE or DELETE grant to authenticated, and none to anon. This is
-- the explicit write/select/never-update/never-delete semantics the
-- review asked for. See §3.13 for the honest caveat about table-owner
-- access, and §5 for why sensitive mutations write their own audit row
-- transactionally rather than relying on a second client-side INSERT call.
```

---

## 5. RPC Catalog — State Transitions That Must Not Be Bare UPDATEs

`[v2 — new section, directly answering points 2, 5, 6, and 11 together]` The review correctly identified that several state transitions need more than a row-level policy: they need the *shape* of the change constrained, and in the case of destructive/audited operations, the audit write needs to be transactional with the action, not a separate client call that can fail independently.

```sql
create or replace function soft_delete_project(p_project_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid;
begin
  if effective_project_role(p_project_id) not in ('owner','admin') then
    raise exception 'insufficient privileges to delete project';
  end if;
  select organization_id into v_org_id from projects where id = p_project_id;
  update projects set deleted_at = now() where id = p_project_id and deleted_at is null;
  insert into audit_events (organization_id, actor_id, action, entity_type, entity_id)
    values (v_org_id, auth.uid(), 'project.soft_deleted', 'project', p_project_id);
end;
$$;

create or replace function restore_project(p_project_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid;
begin
  if effective_project_role(p_project_id) not in ('owner','admin') then
    raise exception 'insufficient privileges to restore project';
  end if;
  select organization_id into v_org_id from projects where id = p_project_id;
  update projects set deleted_at = null where id = p_project_id
    and deleted_at is not null and deleted_at > now() - interval '30 days';
  insert into audit_events (organization_id, actor_id, action, entity_type, entity_id)
    values (v_org_id, auth.uid(), 'project.restored', 'project', p_project_id);
end;
$$;

create or replace function soft_delete_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_project_id uuid; v_org_id uuid;
begin
  select project_id into v_project_id from documents where id = p_document_id;
  if effective_project_role(v_project_id) not in ('owner','admin','manager','editor') then
    raise exception 'insufficient privileges to delete document';
  end if;
  select organization_id into v_org_id from projects where id = v_project_id;
  update documents set deleted_at = now() where id = p_document_id and deleted_at is null;
  insert into audit_events (organization_id, actor_id, action, entity_type, entity_id)
    values (v_org_id, auth.uid(), 'document.soft_deleted', 'document', p_document_id);
end;
$$;

-- approve_line_item / reject_line_item: the only sanctioned way to move a
-- line item out of 'proposed'. Both write the status transition AND the
-- resulting correction_event in one transaction, so a correction_event can
-- never exist without a matching status change, or vice versa.
create or replace function approve_line_item(
  p_line_item_id uuid, p_human_value text, p_correction_type correction_type, p_reason text default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_project_id uuid;
begin
  select project_id into v_project_id from line_items where id = p_line_item_id;
  if effective_project_role(v_project_id) not in ('owner','admin','manager','editor') then
    raise exception 'insufficient privileges to approve line item';
  end if;
  update line_items
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where id = p_line_item_id;
  insert into correction_events (line_item_id, human_value, correction_type, correction_reason, user_id)
    values (p_line_item_id, p_human_value, p_correction_type, p_reason, auth.uid());
end;
$$;

create or replace function reject_line_item(
  p_line_item_id uuid, p_correction_type correction_type, p_reason text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_project_id uuid;
begin
  select project_id into v_project_id from line_items where id = p_line_item_id;
  if effective_project_role(v_project_id) not in ('owner','admin','manager','editor') then
    raise exception 'insufficient privileges to reject line item';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'a reason is required to reject a line item';
  end if;
  update line_items
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where id = p_line_item_id;
  insert into correction_events (line_item_id, human_value, correction_type, correction_reason, user_id)
    values (p_line_item_id, 'rejected', p_correction_type, p_reason, auth.uid());
end;
$$;

grant execute on function
  soft_delete_project(uuid), restore_project(uuid), soft_delete_document(uuid),
  approve_line_item(uuid, text, correction_type, text),
  reject_line_item(uuid, correction_type, text)
  to authenticated;
-- (each function still re-checks role internally, per §4.0's "never trust
-- the caller" principle applied consistently — GRANT EXECUTE only means
-- "may call it," not "call succeeds regardless of role")
```

`request_org_deletion(p_org_id uuid)` is deliberately **not** specified here as a single-transaction RPC: `DATA_LIFECYCLE.md` §3.2 describes org deletion as a multi-step, partially manual procedure (revoke training consent, anonymize N users, cascade-delete M projects, issue admin confirmation) that likely needs to run as a queued backend job once the FastAPI layer exists (§7), not as a synchronous RPC a client call blocks on. For now this should raise a flagged/pending request row (a candidate for `audit_events` with `action = 'org.deletion_requested'`) for manual/backend follow-through, not attempt the cascade inline.

---

## 6. Cross-Project Referential Integrity `[v2 FIX — new section]`

The review's example (a `line_item` in Project B pointing at a `detection` that actually belongs to Project A, with every individual foreign key still valid) is a real gap: Postgres foreign keys are single-hop and can't express "these two multi-hop-derived project_ids must match." This needs triggers.

```sql
-- A detection's sheet (via document) must belong to the same project as
-- its takeoff_run.
create or replace function check_detection_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_takeoff_project uuid; v_sheet_project uuid;
begin
  select project_id into v_takeoff_project from takeoff_runs where id = new.takeoff_run_id;
  select d.project_id into v_sheet_project
    from sheets s join documents d on d.id = s.document_id where s.id = new.sheet_id;
  if v_takeoff_project is null or v_sheet_project is null or v_takeoff_project <> v_sheet_project then
    raise exception 'detection sheet and takeoff_run must belong to the same project';
  end if;
  return new;
end;
$$;
create trigger trg_detection_project_consistency
  before insert or update on detections
  for each row execute function check_detection_project_consistency();

-- A line item's linked_detection (when present) must resolve, through
-- detection -> sheet -> document, to the same project_id as the line item.
create or replace function check_line_item_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_detection_project uuid;
begin
  if new.linked_detection_id is not null then
    select d.project_id into v_detection_project
      from detections det
      join sheets sh on sh.id = det.sheet_id
      join documents d on d.id = sh.document_id
      where det.id = new.linked_detection_id;
    if v_detection_project is null or v_detection_project <> new.project_id then
      raise exception 'linked_detection_id must belong to the same project as the line item';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_line_item_project_consistency
  before insert or update on line_items
  for each row execute function check_line_item_project_consistency();

-- A row in takeoff_run_documents must pair a run and a document from the
-- same project.
create or replace function check_takeoff_run_document_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_run_project uuid; v_doc_project uuid;
begin
  select project_id into v_run_project from takeoff_runs where id = new.takeoff_run_id;
  select project_id into v_doc_project from documents where id = new.document_id;
  if v_run_project is null or v_doc_project is null or v_run_project <> v_doc_project then
    raise exception 'document must belong to the same project as the takeoff run';
  end if;
  return new;
end;
$$;
create trigger trg_takeoff_run_document_consistency
  before insert on takeoff_run_documents
  for each row execute function check_takeoff_run_document_consistency();
```
These triggers fire regardless of caller (including `service_role`), which is correct — this is a data-integrity guarantee, not an authorization check, so it should hold even for trusted backend writers.

---

## 7. Migration Phases

Unchanged in structure from v1, now includes the trigger/RPC work explicitly per phase:

| Phase | Tables | RLS + RPCs + Triggers | Unblocks |
|---|---|---|---|
| 1 — Foundation | `organizations`, `org_members` | §4.1, §4.2 helper functions (§4.0) | Auth wiring, org creation |
| 2 — Projects | `projects`, `project_members` | §4.3, §4.4, `soft_delete_project`/`restore_project` | Real Projects CRUD — smallest real slice, see §9 |
| 3 — Documents | `documents`, `sheets` | §4.5, §4.6, `soft_delete_document` | Real upload metadata |
| 4 — Takeoff | `takeoff_runs`, `takeoff_run_documents`, `detections`, `line_items` | §4.7–§4.9, all three §6 triggers, `approve_line_item`/`reject_line_item` | Requires the Phase 0.5 Perception spike — do not build ahead of it |
| 5 — Audit | `correction_events`, `audit_events` | §4.10, §4.16, `mark_training_candidate` | Correction ledger, `04_AI/TRAINING.md` foundation |
| 6 — Sessions | `chat_sessions`, `messages`, `session_shares` | §4.12–§4.14 | Investigation Workshop persistence |
| 7 — Export | `exports` | §4.11 | Export history |

Every table's RLS policies, column grants, and triggers ship in the same migration as the table itself — never a table without its full policy set in the same commit.

## 8. Recommendation on Backend Boundary — Unchanged from v1

The review explicitly endorsed keeping this unchanged: no FastAPI/Redis/Celery yet for Phases 1–3 (Supabase PostgREST + RLS directly from the Tauri client is sufficient — there's no async job or AI call yet to justify custom backend infrastructure). FastAPI enters at Phase 4, and becomes the sole holder of the `service_role` key used by `mark_training_candidate()` and the Perception/worker-side writes to `sheets`/`detections`. See v1 §7 for the full rationale; `AUDIT_03.md` §13 reaches the same conclusion independently.

## 9. Summary of v1 → v2 Changes

| # | Review point | Fix |
|---|---|---|
| 1 | `project_members` had no INSERT/UPDATE/DELETE policies; no rank enforcement | §4.3 — full policy set with `role_rank()` gating |
| 2 | `projects_delete` was actually an unrestricted UPDATE policy | §4.4 — column-restricted UPDATE + RPC-only soft-delete (§5) |
| 3 | `effective_project_role()` trusted a caller-supplied `p_user_id` | §4.0 — parameter removed from the public function; unsafe form isolated behind `service_role`-only `_effective_role_for()` |
| 4 | RLS enablement used `-- repeat` shorthand | §4 — all 16 tables enumerated explicitly |
| 5 | `line_items` UPDATE didn't constrain which fields change or gate status transitions | §3.9/§4.9 — three-way column split + `approve_line_item()`/`reject_line_item()` RPCs |
| 6 | `is_training_candidate` was client-settable in principle | §4.10 — excluded from the client `INSERT` grant entirely; `mark_training_candidate()` is `service_role`-only |
| 7 | No cross-table project-consistency guarantee | §6 — three `BEFORE INSERT/UPDATE` triggers |
| 8 | `storage_reference` ambiguously mixed local/cloud | §3.5/§3.11 — `storage_mode` enum + mode-specific columns + `CHECK` constraint |
| 9 | `evidence_links` JSONB risked becoming permanent schema by default | §3.12 — explicit technical-debt note, proposed OD-26 |
| 10 | Session-sharing policies unspecified; tunnel-into-project risk unaddressed | §4.12–§4.14 — explicit policies + explicit statement of the mechanism (independent RLS on `documents`/`line_items`) that prevents the tunnel |
| 11 | `audit_events` write/delete semantics and transactionality unspecified | §4.16 (no UPDATE/DELETE grant) + §5 (RPCs write action + audit row in one transaction) + §3.13 honesty note on table-owner access |

## 10. Cross-References

- `../03_ARCHITECTURE/DATA_MODEL.md`, `SECURITY.md`, `../01_PRODUCT/USER_ROLES.md` — unchanged dependencies from v1
- `../OPEN_DECISIONS.md` — OD-09 (§3.7, unresolved), OD-12 (§3.13), OD-22/OD-23 (excluded), proposed **OD-26** (§3.12, evidence normalization — not yet added to the registry, flagged here for the founder to add)
- `Research Folder/AUDIT_03.md` §13 — backend-boundary sequencing this document's §8 confirms

-- =============================================================================
-- Migration: 20260827000001_initial_schema.sql
-- Vectoris Concrete Data Model Schema (Postgres / Supabase)
-- Source of Truth: docs/03_ARCHITECTURE/DATA_MODEL_SCHEMA.md (v2 Revision)
-- =============================================================================

-- 1. Extensions
create extension if not exists "pgcrypto";

-- 2. Enumerated Types
create type org_role as enum ('owner', 'admin', 'manager', 'editor', 'viewer');
create type storage_mode as enum ('local', 'cloud');
create type upload_status as enum ('queued', 'ingesting', 'classifying', 'detecting', 'complete', 'parsed', 'error');
create type sheet_classification as enum ('floor_plan', 'schedule', 'single_line', 'legend', 'notes');
create type run_status as enum ('pending', 'running', 'complete', 'error');
create type line_item_status as enum ('proposed', 'approved', 'rejected');
create type detection_source as enum ('ai_detection', 'human_created');
create type correction_type as enum (
  'missed', 'false_positive', 'wrong_symbol', 'wrong_classification',
  'duplicate', 'scope_excluded', 'sheet_conflict', 'manual_override', 'other'
);
create type export_format as enum ('XLSX', 'CSV', 'JSON', 'PDF');
create type message_role as enum ('user', 'agent');

-- 3. Core Tables

-- 3.1 organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 3.2 org_members
create table org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role org_role not null,
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on org_members(user_id);
create index idx_org_members_org on org_members(organization_id);

-- 3.3 projects
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

-- 3.4 project_members
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role org_role not null,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index idx_project_members_user on project_members(user_id);
create index idx_project_members_project on project_members(project_id);

-- 3.5 documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  filename text not null,
  format text not null,
  upload_status upload_status not null default 'queued',
  storage_mode storage_mode not null default 'local',
  local_reference text,
  cloud_bucket text,
  cloud_object_path text,
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
create index idx_documents_project on documents(project_id) where deleted_at is null;

-- 3.6 sheets
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
create index idx_sheets_document on sheets(document_id);

-- 3.7 takeoff_runs & takeoff_run_documents
create table takeoff_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  triggered_by uuid not null references auth.users(id),
  model_version text not null,
  status run_status not null default 'pending',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_takeoff_runs_project on takeoff_runs(project_id);

create table takeoff_run_documents (
  takeoff_run_id uuid not null references takeoff_runs(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  primary key (takeoff_run_id, document_id)
);

-- 3.8 detections
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

-- 3.9 line_items
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

-- 3.10 correction_events
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

-- 3.11 exports
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
create index idx_exports_project on exports(project_id);

-- 3.12 chat_sessions, messages, session_shares
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_chat_sessions_project on chat_sessions(project_id);
create index idx_chat_sessions_creator on chat_sessions(created_by);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  tool_calls jsonb not null default '[]'::jsonb,
  evidence_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_messages_session on messages(session_id, created_at);

create table session_shares (
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role org_role not null check (role in ('viewer','editor')),
  primary key (session_id, user_id)
);

-- 3.13 audit_events
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_events_org on audit_events(organization_id, created_at desc);

-- 4. Hardened Helper Functions

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

create or replace function effective_project_role(p_project_id uuid)
returns org_role
language sql
stable
security definer
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
security definer
set search_path = public, pg_temp
as $$
  select role from public.org_members where organization_id = p_org_id and user_id = auth.uid();
$$;

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

-- 5. Cross-Project Referential Integrity Triggers

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

-- 6. Row-Level Security (RLS) & Column-Level Grants

-- 6.1 organizations
alter table organizations enable row level security;

create policy organizations_select on organizations for select
  using (my_org_role(id) is not null);

revoke update on organizations from authenticated;
grant update (name, settings, updated_at) on organizations to authenticated;

create policy organizations_update on organizations for update
  using (my_org_role(id) = 'owner')
  with check (my_org_role(id) = 'owner');

-- 6.2 org_members
alter table org_members enable row level security;

create policy org_members_select on org_members for select
  using (my_org_role(organization_id) is not null);

create policy org_members_insert on org_members for insert
  with check (
    my_org_role(organization_id) in ('owner','admin')
    and role_rank(role) <= role_rank(my_org_role(organization_id))
  );

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

-- 6.3 project_members
alter table project_members enable row level security;

create policy project_members_select on project_members for select
  using (effective_project_role(project_id) is not null);

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

-- 6.4 projects
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

revoke update on projects from authenticated;
grant update (name, description, user_provided_type, verified_type, updated_at)
  on projects to authenticated;

create policy projects_update on projects for update
  using (effective_project_role(id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(id) in ('owner','admin','manager','editor'));

-- 6.5 documents
alter table documents enable row level security;

create policy documents_select on documents for select
  using (effective_project_role(project_id) is not null);

create policy documents_insert on documents for insert
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));

revoke update on documents from authenticated;
grant update (error_message) on documents to authenticated;

create policy documents_update on documents for update
  using (effective_project_role(project_id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));

-- 6.6 sheets
alter table sheets enable row level security;

create policy sheets_select on sheets for select
  using (exists (
    select 1 from documents d
    where d.id = sheets.document_id and effective_project_role(d.project_id) is not null
  ));

-- 6.7 takeoff_runs & takeoff_run_documents
alter table takeoff_runs enable row level security;

create policy takeoff_runs_select on takeoff_runs for select
  using (effective_project_role(project_id) is not null);

create policy takeoff_runs_insert on takeoff_runs for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and triggered_by = auth.uid()
  );

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

-- 6.8 detections
alter table detections enable row level security;

revoke select on detections from authenticated;
grant select (id, takeoff_run_id, sheet_id, component_type, quantity, geometry,
              source_coordinates, model_version, created_at)
  on detections to authenticated;

create policy detections_select on detections for select
  using (exists (
    select 1 from takeoff_runs tr
    where tr.id = detections.takeoff_run_id and effective_project_role(tr.project_id) is not null
  ));

-- 6.9 line_items
alter table line_items enable row level security;

create policy line_items_select on line_items for select
  using (effective_project_role(project_id) is not null);

revoke update on line_items from authenticated;
grant update (name, category, current_value, unit_of_measure, updated_at)
  on line_items to authenticated;

create policy line_items_update on line_items for update
  using (effective_project_role(project_id) in ('owner','admin','manager','editor'))
  with check (effective_project_role(project_id) in ('owner','admin','manager','editor'));

create policy line_items_insert on line_items for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and source = 'human_created'
  );

-- 6.10 correction_events
alter table correction_events enable row level security;

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

-- 6.11 exports
alter table exports enable row level security;

create policy exports_select on exports for select
  using (effective_project_role(project_id) is not null);

create policy exports_insert on exports for insert
  with check (
    effective_project_role(project_id) in ('owner','admin','manager','editor')
    and generated_by = auth.uid()
  );

-- 6.12 chat_sessions, session_shares, messages
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

alter table session_shares enable row level security;

create policy session_shares_manage on session_shares for all
  using (exists (select 1 from chat_sessions cs
                 where cs.id = session_shares.session_id and cs.created_by = auth.uid()))
  with check (exists (select 1 from chat_sessions cs
                       where cs.id = session_shares.session_id and cs.created_by = auth.uid()));

create policy session_shares_self_select on session_shares for select
  using (user_id = auth.uid());

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

-- 6.13 audit_events
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

-- 7. RPC Catalog (Secure State Transitions)

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

create or replace function mark_training_candidate(p_correction_event_id uuid, p_value boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'only the trusted validation pipeline may set training-candidate status';
  end if;
  update correction_events set is_training_candidate = p_value where id = p_correction_event_id;
end;
$$;

revoke all on function mark_training_candidate(uuid, boolean) from public, authenticated, anon;
grant execute on function mark_training_candidate(uuid, boolean) to service_role;

-- Organization Onboarding Transactional RPC
create or replace function create_organization_with_owner(
  p_name text,
  p_settings jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'user must be authenticated to create an organization';
  end if;

  insert into organizations (name, owner_id, settings)
    values (p_name, v_user_id, coalesce(p_settings, '{}'::jsonb))
    returning id into v_org_id;

  insert into org_members (organization_id, user_id, role)
    values (v_org_id, v_user_id, 'owner');

  insert into audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_org_id, v_user_id, 'organization.created', 'organization', v_org_id, jsonb_build_object('name', p_name));

  return v_org_id;
end;
$$;

grant execute on function
  soft_delete_project(uuid),
  restore_project(uuid),
  soft_delete_document(uuid),
  approve_line_item(uuid, text, correction_type, text),
  reject_line_item(uuid, correction_type, text),
  create_organization_with_owner(text, jsonb)
  to authenticated;

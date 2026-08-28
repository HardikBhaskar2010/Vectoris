-- =============================================================================
-- Migration: 20260828100000_project_plan.sql
-- Vectoris Project Plan Schema & Guarded Lifecycle RPCs
-- Source of Truth: docs/PLAN.md, docs/03_ARCHITECTURE/DATA_MODEL_SCHEMA.md
-- =============================================================================

-- 1. Enumerated Types
create type plan_version_status as enum ('draft', 'active', 'superseded');
create type claim_section as enum ('scope_outcomes', 'milestones', 'risks', 'dependencies');
create type claim_grounding as enum ('known_from_evidence', 'inferred', 'human_decided', 'unresolved');
create type lineage_relationship as enum ('split', 'merge');

-- 2. Core Project Plan Tables

-- 2.1 plan_claim_identities: Stable claim identity created once, never reused, project-scoped
create table plan_claim_identities (
  claim_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_plan_claim_identities_proj on plan_claim_identities(project_id);

-- 2.2 project_plans: Exactly one logical plan per project
create table project_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_project_plans_proj on project_plans(project_id);

-- 2.3 project_plan_versions: Versioned snapshots with status lifecycle
create table project_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references project_plans(id) on delete cascade,
  version_number int not null,
  status plan_version_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  superseded_at timestamptz,
  unique (plan_id, version_number)
);
create index idx_project_plan_versions_plan on project_plan_versions(plan_id, version_number desc);

-- Partial unique constraint: Exactly one open draft per plan
create unique index one_open_draft_per_plan
  on project_plan_versions (plan_id)
  where status = 'draft';

-- Partial unique constraint: Exactly one active version per plan
create unique index one_active_version_per_plan
  on project_plan_versions (plan_id)
  where status = 'active';

-- 2.4 plan_version_documents: Normalized association between plan version and source documents
create table plan_version_documents (
  plan_version_id uuid not null references project_plan_versions(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  primary key (plan_version_id, document_id)
);

-- 2.5 decisions: First-class append-only entity attached to stable claim identity
create table decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references plan_claim_identities(claim_id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  decision_text text not null,
  rationale text,
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  superseded_by uuid references decisions(id),
  superseded_at timestamptz,
  is_active boolean not null default true
);
create index idx_decisions_claim on decisions(claim_id) where is_active is true;
create index idx_decisions_project on decisions(project_id);

-- 2.6 project_plan_claims: Immutable claim instances per version
create table project_plan_claims (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references plan_claim_identities(claim_id) on delete cascade,
  plan_version_id uuid not null references project_plan_versions(id) on delete cascade,
  section claim_section not null,
  content text not null,
  grounding claim_grounding not null,
  evidence_links jsonb not null default '[]'::jsonb,
  inference_rationale text,
  unresolved_reason text,
  conflict_with_decision_id uuid references decisions(id),
  conflict_details text,
  created_at timestamptz not null default now(),
  unique (plan_version_id, claim_id)
);
create index idx_plan_claims_version on project_plan_claims(plan_version_id);
create index idx_plan_claims_identity on project_plan_claims(claim_id);

-- 2.7 claim_lineage: Split and merge history across claims
create table claim_lineage (
  id uuid primary key default gen_random_uuid(),
  parent_claim_id uuid not null references plan_claim_identities(claim_id) on delete cascade,
  child_claim_id uuid not null references plan_claim_identities(claim_id) on delete cascade,
  relationship lineage_relationship not null,
  occurred_at timestamptz not null default now(),
  triggering_plan_version_id uuid not null references project_plan_versions(id) on delete cascade,
  check (parent_claim_id <> child_claim_id)
);
create index idx_claim_lineage_parent on claim_lineage(parent_claim_id);
create index idx_claim_lineage_child on claim_lineage(child_claim_id);

-- 2.8 plan_chat_sessions: Permanent link between Project Plan and Investigation Workshop sessions
create table plan_chat_sessions (
  plan_id uuid not null references project_plans(id) on delete cascade,
  chat_session_id uuid not null references chat_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, chat_session_id)
);

-- 3. Cross-Project Referential Integrity Triggers

-- 3.1 Decision project consistency
create or replace function check_decision_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_claim_project uuid;
begin
  select project_id into v_claim_project from plan_claim_identities where claim_id = new.claim_id;
  if v_claim_project is null or v_claim_project <> new.project_id then
    raise exception 'decision project must match claim identity project';
  end if;
  return new;
end;
$$;

create trigger trg_decision_project_consistency
  before insert or update on decisions
  for each row execute function check_decision_project_consistency();

-- 3.2 Claim lineage project consistency
create or replace function check_claim_lineage_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_parent_project uuid;
  v_child_project uuid;
  v_version_project uuid;
begin
  select project_id into v_parent_project from plan_claim_identities where claim_id = new.parent_claim_id;
  select project_id into v_child_project from plan_claim_identities where claim_id = new.child_claim_id;
  select pp.project_id into v_version_project
    from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    where ppv.id = new.triggering_plan_version_id;

  if v_parent_project is null or v_child_project is null or v_version_project is null or
     v_parent_project <> v_child_project or v_parent_project <> v_version_project then
    raise exception 'lineage parent, child, and triggering plan version must belong to the same project';
  end if;
  return new;
end;
$$;

create trigger trg_claim_lineage_project_consistency
  before insert or update on claim_lineage
  for each row execute function check_claim_lineage_project_consistency();

-- 3.3 Plan version document consistency
create or replace function check_plan_version_doc_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_version_project uuid;
  v_doc_project uuid;
begin
  select pp.project_id into v_version_project
    from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    where ppv.id = new.plan_version_id;
  select project_id into v_doc_project from documents where id = new.document_id;

  if v_version_project is null or v_doc_project is null or v_version_project <> v_doc_project then
    raise exception 'linked document must belong to the same project as the plan version';
  end if;
  return new;
end;
$$;

create trigger trg_plan_version_doc_project_consistency
  before insert on plan_version_documents
  for each row execute function check_plan_version_doc_project_consistency();

-- 3.4 Plan chat session consistency
create or replace function check_plan_chat_session_project_consistency()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_plan_project uuid;
  v_session_project uuid;
begin
  select project_id into v_plan_project from project_plans where id = new.plan_id;
  select project_id into v_session_project from chat_sessions where id = new.chat_session_id;

  if v_plan_project is null or v_session_project is null or v_plan_project <> v_session_project then
    raise exception 'linked chat session must belong to the same project as the plan';
  end if;
  return new;
end;
$$;

create trigger trg_plan_chat_session_project_consistency
  before insert on plan_chat_sessions
  for each row execute function check_plan_chat_session_project_consistency();

-- 4. Row-Level Security (RLS) & Strict Column Grants

-- 4.1 plan_claim_identities
alter table plan_claim_identities enable row level security;
create policy plan_claim_identities_select on plan_claim_identities for select
  using (effective_project_role(project_id) is not null);

-- 4.2 project_plans
alter table project_plans enable row level security;
create policy project_plans_select on project_plans for select
  using (effective_project_role(project_id) is not null);

-- 4.3 project_plan_versions
alter table project_plan_versions enable row level security;
create policy project_plan_versions_select on project_plan_versions for select
  using (exists (
    select 1 from project_plans pp
    where pp.id = project_plan_versions.plan_id
      and effective_project_role(pp.project_id) is not null
  ));

-- 4.4 plan_version_documents
alter table plan_version_documents enable row level security;
create policy plan_version_documents_select on plan_version_documents for select
  using (exists (
    select 1 from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    where ppv.id = plan_version_documents.plan_version_id
      and effective_project_role(pp.project_id) is not null
  ));

-- 4.5 decisions
alter table decisions enable row level security;
create policy decisions_select on decisions for select
  using (effective_project_role(project_id) is not null);

-- 4.6 project_plan_claims
alter table project_plan_claims enable row level security;
create policy project_plan_claims_select on project_plan_claims for select
  using (exists (
    select 1 from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    where ppv.id = project_plan_claims.plan_version_id
      and effective_project_role(pp.project_id) is not null
  ));

-- 4.7 claim_lineage
alter table claim_lineage enable row level security;
create policy claim_lineage_select on claim_lineage for select
  using (exists (
    select 1 from plan_claim_identities pci
    where pci.claim_id = claim_lineage.parent_claim_id
      and effective_project_role(pci.project_id) is not null
  ));

-- 4.8 plan_chat_sessions
alter table plan_chat_sessions enable row level security;
create policy plan_chat_sessions_select on plan_chat_sessions for select
  using (exists (
    select 1 from project_plans pp
    where pp.id = plan_chat_sessions.plan_id
      and effective_project_role(pp.project_id) is not null
  ));

-- Zero direct client mutation: revoke insert/update/delete on plan entities from authenticated & anon
revoke insert, update, delete on plan_claim_identities from authenticated, anon;
revoke insert, update, delete on project_plans from authenticated, anon;
revoke insert, update, delete on project_plan_versions from authenticated, anon;
revoke insert, update, delete on plan_version_documents from authenticated, anon;
revoke insert, update, delete on decisions from authenticated, anon;
revoke insert, update, delete on project_plan_claims from authenticated, anon;
revoke insert, update, delete on claim_lineage from authenticated, anon;
revoke insert, update, delete on plan_chat_sessions from authenticated, anon;

grant select on
  plan_claim_identities,
  project_plans,
  project_plan_versions,
  plan_version_documents,
  decisions,
  project_plan_claims,
  claim_lineage,
  plan_chat_sessions
  to authenticated;

-- 5. Guarded RPC Catalog (Atomic State Transitions)

-- 5.1 Create Project Plan Draft RPC
create or replace function create_project_plan_draft(
  p_project_id uuid,
  p_document_ids uuid[],
  p_claims jsonb,
  p_lineage jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_next_version int;
  v_draft_version_id uuid;
  v_doc_id uuid;
  v_claim record;
  v_lineage record;
  v_claim_id uuid;
  v_active_decision_id uuid;
  v_active_decision_text text;
  v_conflict_decision_id uuid;
  v_conflict_details text;
  v_org_id uuid;
begin
  -- 1. Validate permissions (Editor rank or higher)
  if effective_project_role(p_project_id) not in ('owner', 'admin', 'manager', 'editor') then
    raise exception 'insufficient privileges to create project plan draft';
  end if;

  select organization_id into v_org_id from projects where id = p_project_id;
  if v_org_id is null then
    raise exception 'project not found';
  end if;

  -- 2. Ensure project_plans record exists
  insert into project_plans (project_id)
    values (p_project_id)
    on conflict (project_id) do update set updated_at = now()
    returning id into v_plan_id;

  -- 3. Check for existing open draft (enforced by constraint, but informative error)
  if exists (select 1 from project_plan_versions where plan_id = v_plan_id and status = 'draft') then
    raise exception 'an open draft already exists for this project plan';
  end if;

  -- 4. Calculate next version number
  select coalesce(max(version_number), 0) + 1 into v_next_version
    from project_plan_versions
    where plan_id = v_plan_id;

  -- 5. Create draft version snapshot
  insert into project_plan_versions (plan_id, version_number, status, created_by)
    values (v_plan_id, v_next_version, 'draft', auth.uid())
    returning id into v_draft_version_id;

  -- 6. Link source documents (normalized)
  if p_document_ids is not null and array_length(p_document_ids, 1) > 0 then
    foreach v_doc_id in array p_document_ids loop
      -- Verify document exists and belongs to project
      if not exists (select 1 from documents where id = v_doc_id and project_id = p_project_id and deleted_at is null) then
        raise exception 'document % does not belong to project %', v_doc_id, p_project_id;
      end if;
      insert into plan_version_documents (plan_version_id, document_id)
        values (v_draft_version_id, v_doc_id);
    end loop;
  end if;

  -- 7. Insert claims with stable identity & Decision conflict detection
  if p_claims is not null and jsonb_array_length(p_claims) > 0 then
    for v_claim in select * from jsonb_to_recordset(p_claims) as x(
      claim_id uuid,
      section claim_section,
      content text,
      grounding claim_grounding,
      evidence_links jsonb,
      inference_rationale text,
      unresolved_reason text
    ) loop
      -- Establish or verify claim identity
      if v_claim.claim_id is not null then
        if not exists (select 1 from plan_claim_identities where claim_id = v_claim.claim_id and project_id = p_project_id) then
          raise exception 'claim identity % does not belong to project %', v_claim.claim_id, p_project_id;
        end if;
        v_claim_id := v_claim.claim_id;
      else
        insert into plan_claim_identities (project_id)
          values (p_project_id)
          returning claim_id into v_claim_id;
      end if;

      -- Check conflict with active human Decision
      v_conflict_decision_id := null;
      v_conflict_details := null;

      select id, decision_text into v_active_decision_id, v_active_decision_text
        from decisions
        where claim_id = v_claim_id and is_active is true;

      if v_active_decision_id is not null then
        if trim(v_active_decision_text) <> trim(v_claim.content) then
          v_conflict_decision_id := v_active_decision_id;
          v_conflict_details := 'Proposal conflicts with active human Decision: "' || v_active_decision_text || '"';
        end if;
      end if;

      -- Insert immutable claim row
      insert into project_plan_claims (
        claim_id,
        plan_version_id,
        section,
        content,
        grounding,
        evidence_links,
        inference_rationale,
        unresolved_reason,
        conflict_with_decision_id,
        conflict_details
      ) values (
        v_claim_id,
        v_draft_version_id,
        v_claim.section,
        v_claim.content,
        v_claim.grounding,
        coalesce(v_claim.evidence_links, '[]'::jsonb),
        v_claim.inference_rationale,
        v_claim.unresolved_reason,
        v_conflict_decision_id,
        v_conflict_details
      );
    end loop;
  end if;

  -- 8. Insert claim lineage if provided
  if p_lineage is not null and jsonb_array_length(p_lineage) > 0 then
    for v_lineage in select * from jsonb_to_recordset(p_lineage) as y(
      parent_claim_id uuid,
      child_claim_id uuid,
      relationship lineage_relationship
    ) loop
      insert into claim_lineage (
        parent_claim_id,
        child_claim_id,
        relationship,
        triggering_plan_version_id
      ) values (
        v_lineage.parent_claim_id,
        v_lineage.child_claim_id,
        v_lineage.relationship,
        v_draft_version_id
      );
    end loop;
  end if;

  -- 9. Record structured audit event
  insert into audit_events (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_org_id,
    auth.uid(),
    'project_plan.draft_created',
    'project_plan_version',
    v_draft_version_id,
    jsonb_build_object(
      'project_id', p_project_id,
      'plan_id', v_plan_id,
      'version_number', v_next_version,
      'document_count', coalesce(array_length(p_document_ids, 1), 0),
      'claim_count', coalesce(jsonb_array_length(p_claims), 0)
    )
  );

  return v_draft_version_id;
end;
$$;

-- 5.2 Accept Project Plan Draft RPC (with Atomic Conflict Resolution)
create or replace function accept_project_plan_draft(
  p_draft_version_id uuid,
  p_decision_resolutions jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_project_id uuid;
  v_org_id uuid;
  v_version_status plan_version_status;
  v_version_number int;
  v_conflicted_claim record;
  v_res record;
  v_matching_res jsonb;
  v_action text;
  v_custom_text text;
  v_rationale text;
  v_old_decision_id uuid;
begin
  -- 1. Validate version existence and draft status
  select ppv.plan_id, ppv.status, ppv.version_number, pp.project_id, p.organization_id
    into v_plan_id, v_version_status, v_version_number, v_project_id, v_org_id
    from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    join projects p on p.id = pp.project_id
    where ppv.id = p_draft_version_id;

  if v_plan_id is null then
    raise exception 'project plan draft not found';
  end if;

  if v_version_status <> 'draft' then
    raise exception 'only draft plan versions can be accepted; current status is %', v_version_status;
  end if;

  -- 2. Validate permissions
  if effective_project_role(v_project_id) not in ('owner', 'admin', 'manager', 'editor') then
    raise exception 'insufficient privileges to accept project plan draft';
  end if;

  -- 3. Verify that ALL Decision conflicts have explicit resolutions
  for v_conflicted_claim in
    select id, claim_id, content, conflict_with_decision_id, conflict_details
    from project_plan_claims
    where plan_version_id = p_draft_version_id
      and conflict_with_decision_id is not null
  loop
    -- Look for resolution by claim_id in p_decision_resolutions
    select elem into v_matching_res
      from jsonb_array_elements(coalesce(p_decision_resolutions, '[]'::jsonb)) as elem
      where (elem ->> 'claim_id')::uuid = v_conflicted_claim.claim_id;

    if v_matching_res is null then
      raise exception 'cannot activate draft: unresolved Decision conflict on claim % (decision %). An explicit human resolution is required.',
        v_conflicted_claim.claim_id, v_conflicted_claim.conflict_with_decision_id;
    end if;

    v_action := v_matching_res ->> 'action'; -- 'accept_proposed' | 'keep_existing' | 'custom_decision'
    v_rationale := v_matching_res ->> 'rationale';
    v_custom_text := v_matching_res ->> 'custom_decision_text';
    v_old_decision_id := v_conflicted_claim.conflict_with_decision_id;

    if v_action = 'accept_proposed' then
      -- Supersede old decision
      update decisions
        set is_active = false, superseded_at = now()
        where id = v_old_decision_id;

      -- Insert new active decision matching proposed content
      insert into decisions (
        claim_id,
        project_id,
        decision_text,
        rationale,
        decided_by,
        superseded_by,
        is_active
      ) values (
        v_conflicted_claim.claim_id,
        v_project_id,
        v_conflicted_claim.content,
        coalesce(v_rationale, 'Human approved proposed plan revision'),
        auth.uid(),
        null,
        true
      );

      -- Update claim to human_decided and clear conflict pointer
      update project_plan_claims
        set grounding = 'human_decided',
            conflict_with_decision_id = null,
            conflict_details = null
        where id = v_conflicted_claim.id;

    elsif v_action = 'keep_existing' then
      -- Keep existing decision active; update draft claim text to match existing decision
      select decision_text into v_custom_text from decisions where id = v_old_decision_id;
      update project_plan_claims
        set content = v_custom_text,
            grounding = 'human_decided',
            conflict_with_decision_id = null,
            conflict_details = null
        where id = v_conflicted_claim.id;

    elsif v_action = 'custom_decision' then
      if v_custom_text is null or length(trim(v_custom_text)) = 0 then
        raise exception 'custom_decision action requires custom_decision_text';
      end if;

      -- Supersede old decision
      update decisions
        set is_active = false, superseded_at = now()
        where id = v_old_decision_id;

      -- Create new decision with custom text
      insert into decisions (
        claim_id,
        project_id,
        decision_text,
        rationale,
        decided_by,
        is_active
      ) values (
        v_conflicted_claim.claim_id,
        v_project_id,
        v_custom_text,
        coalesce(v_rationale, 'Human resolved conflict with custom decision'),
        auth.uid(),
        true
      );

      -- Update draft claim
      update project_plan_claims
        set content = v_custom_text,
            grounding = 'human_decided',
            conflict_with_decision_id = null,
            conflict_details = null
        where id = v_conflicted_claim.id;

    else
      raise exception 'invalid conflict resolution action: % (must be accept_proposed, keep_existing, or custom_decision)', v_action;
    end if;
  end loop;

  -- 4. Supersede prior active version
  update project_plan_versions
    set status = 'superseded',
        superseded_at = now()
    where plan_id = v_plan_id
      and status = 'active';

  -- 5. Mark draft active
  update project_plan_versions
    set status = 'active',
        activated_at = now()
    where id = p_draft_version_id;

  -- 6. Update plan timestamp
  update project_plans
    set updated_at = now()
    where id = v_plan_id;

  -- 7. Write audit event
  insert into audit_events (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_org_id,
    auth.uid(),
    'project_plan.draft_accepted',
    'project_plan_version',
    p_draft_version_id,
    jsonb_build_object(
      'project_id', v_project_id,
      'plan_id', v_plan_id,
      'version_number', v_version_number,
      'resolutions_count', coalesce(jsonb_array_length(p_decision_resolutions), 0)
    )
  );
end;
$$;

-- 5.3 Reject Project Plan Draft RPC
create or replace function reject_project_plan_draft(
  p_draft_version_id uuid,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_project_id uuid;
  v_org_id uuid;
  v_version_status plan_version_status;
  v_version_number int;
begin
  -- 1. Validate version existence and draft status
  select ppv.plan_id, ppv.status, ppv.version_number, pp.project_id, p.organization_id
    into v_plan_id, v_version_status, v_version_number, v_project_id, v_org_id
    from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    join projects p on p.id = pp.project_id
    where ppv.id = p_draft_version_id;

  if v_plan_id is null then
    raise exception 'project plan draft not found';
  end if;

  if v_version_status <> 'draft' then
    raise exception 'only draft plan versions can be rejected; current status is %', v_version_status;
  end if;

  -- 2. Validate permissions
  if effective_project_role(v_project_id) not in ('owner', 'admin', 'manager', 'editor') then
    raise exception 'insufficient privileges to reject project plan draft';
  end if;

  -- 3. Mark draft superseded
  update project_plan_versions
    set status = 'superseded',
        superseded_at = now()
    where id = p_draft_version_id;

  -- 4. Record audit event (no Decision changes on rejection)
  insert into audit_events (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_org_id,
    auth.uid(),
    'project_plan.draft_rejected',
    'project_plan_version',
    p_draft_version_id,
    jsonb_build_object(
      'project_id', v_project_id,
      'plan_id', v_plan_id,
      'version_number', v_version_number,
      'reason', p_reason
    )
  );
end;
$$;

-- 5.4 Start/Link Plan Chat Session RPC
create or replace function start_plan_chat_session(
  p_project_id uuid,
  p_title text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_session_id uuid;
begin
  -- 1. Validate permissions
  if effective_project_role(p_project_id) is null then
    raise exception 'insufficient privileges to start session on this project';
  end if;

  -- 2. Ensure project plan exists
  insert into project_plans (project_id)
    values (p_project_id)
    on conflict (project_id) do update set updated_at = now()
    returning id into v_plan_id;

  -- 3. Create chat session
  insert into chat_sessions (
    project_id,
    title,
    created_by
  ) values (
    p_project_id,
    coalesce(p_title, 'Project Plan Investigation'),
    auth.uid()
  ) returning id into v_session_id;

  -- 4. Atomically link in plan_chat_sessions
  insert into plan_chat_sessions (plan_id, chat_session_id)
    values (v_plan_id, v_session_id);

  return v_session_id;
end;
$$;

-- Grant EXECUTE on guarded RPCs to authenticated role
grant execute on function
  create_project_plan_draft(uuid, uuid[], jsonb, jsonb),
  accept_project_plan_draft(uuid, jsonb),
  reject_project_plan_draft(uuid, text),
  start_plan_chat_session(uuid, text)
  to authenticated;

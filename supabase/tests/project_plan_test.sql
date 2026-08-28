-- =============================================================================
-- Test Suite: supabase/tests/project_plan_test.sql
-- Vectoris Project Plan PostgreSQL Integration & Invariant Tests
-- =============================================================================

begin;

-- Create test helper assertion function
create or replace function test_assert(condition boolean, message text) returns void as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$ language plpgsql;

-- 1. Setup Test Fixtures
do $$
declare
  v_owner_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_org_id uuid;
  v_proj1_id uuid;
  v_proj2_id uuid;
  v_doc1_id uuid;
  v_doc2_id uuid;
  v_draft1_id uuid;
  v_draft2_id uuid;
  v_claim1_id uuid;
  v_claim2_id uuid;
  v_decision_id uuid;
  v_chat_session_id uuid;
  v_claims_json jsonb;
  v_active_count int;
  v_err_caught boolean;
begin
  -- 1.1 Create test org and project
  insert into organizations (id, name, owner_id)
    values (gen_random_uuid(), 'Test Org', v_owner_id)
    returning id into v_org_id;

  insert into projects (id, organization_id, name, created_by)
    values (gen_random_uuid(), v_org_id, 'Project Alpha', v_owner_id)
    returning id into v_proj1_id;

  insert into projects (id, organization_id, name, created_by)
    values (gen_random_uuid(), v_org_id, 'Project Beta', v_owner_id)
    returning id into v_proj2_id;

  insert into documents (id, project_id, organization_id, filename, format, storage_reference, uploaded_by)
    values (gen_random_uuid(), v_proj1_id, v_org_id, 'Alpha_Electrical.pdf', 'PDF', 'ref1', v_owner_id)
    returning id into v_doc1_id;

  insert into documents (id, project_id, organization_id, filename, format, storage_reference, uploaded_by)
    values (gen_random_uuid(), v_proj2_id, v_org_id, 'Beta_Electrical.pdf', 'PDF', 'ref2', v_owner_id)
    returning id into v_doc2_id;

  -- 1.2 Test create_project_plan_draft with valid claims
  v_claims_json := jsonb_build_array(
    jsonb_build_object(
      'section', 'scope_outcomes',
      'content', 'Scope claim 1: 4 Data Halls',
      'grounding', 'known_from_evidence',
      'evidence_links', jsonb_build_array(jsonb_build_object('document_id', v_doc1_id))
    ),
    jsonb_build_object(
      'section', 'milestones',
      'content', 'Milestone 1: Substation Energization',
      'grounding', 'known_from_evidence'
    )
  );

  v_draft1_id := create_project_plan_draft(
    v_proj1_id,
    array[v_doc1_id],
    v_claims_json
  );

  perform test_assert(v_draft1_id is not null, 'Draft 1 ID should not be null');

  -- 1.3 Test Single Open Draft Constraint: second draft must fail
  v_err_caught := false;
  begin
    perform create_project_plan_draft(
      v_proj1_id,
      array[v_doc1_id],
      v_claims_json
    );
  exception when others then
    v_err_caught := true;
  end;
  perform test_assert(v_err_caught, 'Second open draft must be rejected by single draft invariant');

  -- 1.4 Test Cross-Project Document Consistency Trigger
  v_err_caught := false;
  begin
    insert into plan_version_documents (plan_version_id, document_id)
      values (v_draft1_id, v_doc2_id);
  exception when others then
    v_err_caught := true;
  end;
  perform test_assert(v_err_caught, 'Linking document from different project must be rejected by trigger');

  -- 1.5 Test Accept Draft: activates draft snapshot
  perform accept_project_plan_draft(v_draft1_id);

  select count(*) into v_active_count
    from project_plan_versions ppv
    join project_plans pp on pp.id = ppv.plan_id
    where pp.project_id = v_proj1_id and ppv.status = 'active';

  perform test_assert(v_active_count = 1, 'Exactly one active version must exist after acceptance');

  -- 1.6 Create a Decision attached to a claim in the active plan
  select claim_id into v_claim1_id
    from project_plan_claims
    where plan_version_id = v_draft1_id and section = 'scope_outcomes'
    limit 1;

  insert into decisions (claim_id, project_id, decision_text, rationale, decided_by)
    values (v_claim1_id, v_proj1_id, 'Scope claim 1: 4 Data Halls', 'Client sign-off', v_owner_id)
    returning id into v_decision_id;

  -- 1.7 Propose Draft v2 with conflicting content for v_claim1_id
  v_claims_json := jsonb_build_array(
    jsonb_build_object(
      'claim_id', v_claim1_id,
      'section', 'scope_outcomes',
      'content', 'Scope claim 1: Expanded to 8 Data Halls (Contradiction)',
      'grounding', 'inferred',
      'inference_rationale', 'Proposed from revised market demand'
    )
  );

  v_draft2_id := create_project_plan_draft(
    v_proj1_id,
    array[v_doc1_id],
    v_claims_json
  );

  -- Verify that draft claim has conflict_with_decision_id populated
  perform test_assert(
    exists (
      select 1 from project_plan_claims
      where plan_version_id = v_draft2_id
        and conflict_with_decision_id = v_decision_id
    ),
    'Draft claim must be flagged with conflict_with_decision_id'
  );

  -- 1.8 Attempt activation without conflict resolution: MUST fail
  v_err_caught := false;
  begin
    perform accept_project_plan_draft(v_draft2_id);
  exception when others then
    v_err_caught := true;
  end;
  perform test_assert(v_err_caught, 'Draft activation with unresolved Decision conflict must fail');

  -- 1.9 Resolve conflict via accept_proposed resolution and activate
  perform accept_project_plan_draft(
    v_draft2_id,
    jsonb_build_array(
      jsonb_build_object(
        'claim_id', v_claim1_id,
        'action', 'accept_proposed',
        'rationale', 'Engineer accepted 8 Data Hall expansion'
      )
    )
  );

  -- Verify old decision superseded and new decision active
  perform test_assert(
    exists (select 1 from decisions where id = v_decision_id and is_active is false),
    'Previous decision must be marked inactive'
  );

  perform test_assert(
    exists (
      select 1 from decisions
      where claim_id = v_claim1_id
        and is_active is true
        and decision_text = 'Scope claim 1: Expanded to 8 Data Halls (Contradiction)'
    ),
    'New active decision must be recorded for accepted proposal'
  );

  -- 1.10 Verify start_plan_chat_session
  v_chat_session_id := start_plan_chat_session(v_proj1_id, 'Plan Discussion');
  perform test_assert(v_chat_session_id is not null, 'Plan chat session must be created');
  perform test_assert(
    exists (
      select 1 from plan_chat_sessions pcs
      join project_plans pp on pp.id = pcs.plan_id
      where pp.project_id = v_proj1_id and pcs.chat_session_id = v_chat_session_id
    ),
    'Plan chat session link table record must exist'
  );

end;
$$;

rollback; -- Clean rollback of test transactions

-- =============================================================================
-- Migration: 20260828000001_audit04_fixes.sql
-- Fixes two RLS gaps found in AUDIT_04.md (§3, §4). Apply after
-- 20260827000001_initial_schema.sql.
-- =============================================================================

-- AUDIT_04 §3 — org_members / project_members: restrict UPDATE to the
-- `role` column only. Without this, an otherwise-authorized role change
-- can silently carry a rewritten user_id (membership-seat hijack) since
-- WITH CHECK only re-validates the role_rank(role) condition, not identity.
revoke update on org_members from authenticated;
grant update (role) on org_members to authenticated;

revoke update on project_members from authenticated;
grant update (role) on project_members to authenticated;

-- AUDIT_04 §4 — chat_sessions: restrict UPDATE to (title, updated_at).
-- Without this, chat_sessions_update's missing WITH CHECK (which defaults
-- to reusing USING) lets a shared *editor* rewrite created_by to their own
-- auth.uid(), since the reused check only requires the resulting row
-- satisfy created_by = auth.uid() OR (has an editor share) — which is
-- already true for them regardless of what they set created_by to. This
-- silently transfers effective ownership (and, via session_shares_manage,
-- exclusive control of sharing) away from the real creator.
revoke update on chat_sessions from authenticated;
grant update (title, updated_at) on chat_sessions to authenticated;

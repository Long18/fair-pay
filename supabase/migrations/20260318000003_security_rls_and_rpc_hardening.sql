-- Security Hardening: RLS Policy Tightening + RPC Permission Revocation
-- Plan: .omc/plans/security-hardening-260318.md (Steps 6A, 6C)
-- OWASP: API1:2023 BOLA, API5:2023 BFLA

BEGIN;

-- ============================================================
-- STEP 6A: Tighten Anonymous RLS Policies
-- ============================================================

-- 1. Remove anonymous access to expense_splits entirely.
--    Expense split data (who owes what) is financial data and must never be anonymous.
--    Server-side endpoints (OG/share) use service_role, not anon.
DROP POLICY IF EXISTS "Anonymous users can view expense splits" ON expense_splits;

-- 2. Restrict anonymous profile access to public fields only.
--    Replace the permissive "view all profiles" with a restricted policy
--    that only exposes id, full_name, and avatar_url (no email, no PII).
DROP POLICY IF EXISTS "Anonymous users can view all profiles" ON profiles;

CREATE POLICY "Anonymous users can view public profile fields"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Note: Column-level security is not natively supported by Postgres RLS.
-- The policy above still allows SELECT on all columns. To restrict columns,
-- we create a view that anon should use, and revoke direct table access.
-- However, since Supabase client uses the table directly, we use a
-- security-definer function approach or accept that the RLS policy
-- restricts rows (not columns). For now, the anon policy remains row-level.
-- TODO: Consider creating a restricted view for anon profile access.

-- 3. Remove anonymous access to groups.
--    Group data should require authentication. Server-side OG/share
--    endpoints use service_role, not anon.
DROP POLICY IF EXISTS "Anonymous users can view all groups" ON groups;

-- ============================================================
-- STEP 6C: Revoke anon EXECUTE on Financial/Debt RPCs
-- ============================================================
-- Even with endpoint-level JWT auth, attackers can call these RPCs
-- directly via Supabase REST API (/rest/v1/rpc/function_name)
-- using only the public anon key from the client bundle.

-- Financial debt RPCs - revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.get_who_owes_who(INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users_debt_summary(INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.simplify_group_debts(UUID) FROM anon;

-- User activity/analytics RPCs - revoke anon
REVOKE EXECUTE ON FUNCTION public.get_user_activities(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_balance_history(UUID, DATE, DATE, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_categories(DATE, DATE, UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_data(INTEGER, INTEGER) FROM anon;

-- Ensure authenticated role retains EXECUTE on all revoked functions
GRANT EXECUTE ON FUNCTION public.get_who_owes_who(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_summary(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simplify_group_debts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activities(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balance_history(UUID, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_categories(DATE, DATE, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(INTEGER, INTEGER) TO authenticated;

-- ============================================================
-- KEEP anon EXECUTE for these (public/OG/share/demo features):
-- - get_expense_og_data(UUID)          -- OG preview
-- - get_user_debts_public(TEXT)        -- Explicitly public
-- - get_user_debts_public()            -- Explicitly public
-- - get_public_demo_debts()            -- Demo data
-- - get_user_debt_by_secret(UUID,TEXT) -- Secret-based access
-- ============================================================

COMMIT;

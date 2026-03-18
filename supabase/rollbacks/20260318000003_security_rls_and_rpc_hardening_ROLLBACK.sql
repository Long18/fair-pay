-- ROLLBACK: Security Hardening RLS + RPC changes
-- Run this manually if regression is detected

BEGIN;

-- Restore anonymous expense_splits SELECT
CREATE POLICY "Anonymous users can view expense splits"
  ON expense_splits
  FOR SELECT
  TO anon
  USING (true);

-- Restore original anonymous profiles policy
DROP POLICY IF EXISTS "Anonymous users can view public profile fields" ON profiles;
CREATE POLICY "Anonymous users can view all profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Restore anonymous groups SELECT
CREATE POLICY "Anonymous users can view all groups"
  ON groups
  FOR SELECT
  TO anon
  USING (true);

-- Re-grant anon EXECUTE on financial RPCs
GRANT EXECUTE ON FUNCTION public.get_who_owes_who(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_summary(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.simplify_group_debts(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_activities(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_balance_history(UUID, DATE, DATE, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_top_categories(DATE, DATE, UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(INTEGER, INTEGER) TO anon;

COMMIT;

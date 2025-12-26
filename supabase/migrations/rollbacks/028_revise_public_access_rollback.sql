-- Rollback: 028_revise_public_access_rollback.sql
-- Description: Restore public read access policies
-- Date: 2025-12-26
-- WARNING: This will re-expose all user data to anonymous users (security risk!)

BEGIN;

-- ========================================
-- Restore public read access policies
-- ========================================

-- WARNING: These policies expose ALL data to anonymous users
-- Only use this rollback if absolutely necessary

-- Profiles: Public read access
CREATE POLICY "profiles_public_read"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Groups: Public read access
CREATE POLICY "groups_public_read"
  ON groups
  FOR SELECT
  TO anon
  USING (true);

-- Group Members: Public read access
CREATE POLICY "group_members_public_read"
  ON group_members
  FOR SELECT
  TO anon
  USING (true);

-- Expenses: Public read access
CREATE POLICY "expenses_public_read"
  ON expenses
  FOR SELECT
  TO anon
  USING (true);

-- Expense Splits: Public read access
CREATE POLICY "expense_splits_public_read"
  ON expense_splits
  FOR SELECT
  TO anon
  USING (true);

-- Payments: Public read access
CREATE POLICY "payments_public_read"
  ON payments
  FOR SELECT
  TO anon
  USING (true);

-- ========================================
-- Verification
-- ========================================

DO $$
DECLARE
  public_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND roles @> ARRAY['anon']
    AND cmd = 'SELECT';

  RAISE NOTICE 'Restored % public read policies. WARNING: All data is now publicly accessible!', public_policy_count;
END $$;

COMMIT;

-- ========================================
-- SECURITY WARNING
-- ========================================

-- This rollback restores public read access to ALL tables, which means:
-- - Anonymous users can view all user profiles
-- - Anonymous users can view all groups and members
-- - Anonymous users can view all expenses and splits
-- - Anonymous users can view all payments
--
-- This is a MAJOR SECURITY RISK for a financial/debt tracking application!
--
-- Only use this rollback temporarily for debugging purposes.
-- Consider implementing a proper public API with limited data exposure instead.

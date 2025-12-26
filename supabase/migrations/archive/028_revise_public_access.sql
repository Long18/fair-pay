-- Migration: 028_revise_public_access.sql
-- Description: Remove blanket public read access and restrict to authenticated users only
-- Date: 2025-12-26
-- Dependencies: 027_fix_rls_policies.sql
-- Issue: Public read policies from 011_public_read_access.sql expose all data to anonymous users
-- Security: Debt tracking apps should not expose user financial data publicly

BEGIN;

-- ========================================
-- Part 1: Remove all public read policies
-- ========================================

-- These policies from 011_public_read_access.sql expose ALL data to anonymous users
-- This is a security risk for a financial/debt tracking application

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "groups_public_read" ON groups;
DROP POLICY IF EXISTS "group_members_public_read" ON group_members;
DROP POLICY IF EXISTS "expenses_public_read" ON expenses;
DROP POLICY IF EXISTS "expense_splits_public_read" ON expense_splits;
DROP POLICY IF EXISTS "payments_public_read" ON payments;

-- ========================================
-- Part 2: Add restricted public access (if needed)
-- ========================================

-- Option 1: Allow public to view ONLY profile names/avatars (for leaderboard)
-- Uncomment if you need a public leaderboard feature
-- CREATE POLICY "profiles_public_read_limited"
--   ON profiles
--   FOR SELECT
--   TO anon
--   USING (true);

-- Option 2: Create a separate materialized view for public stats
-- This is more secure as it doesn't expose raw data
-- CREATE MATERIALIZED VIEW public_stats AS
-- SELECT
--   COUNT(DISTINCT id) as total_users,
--   COUNT(DISTINCT g.id) as total_groups,
--   COUNT(DISTINCT e.id) as total_expenses
-- FROM profiles p
-- LEFT JOIN groups g ON true
-- LEFT JOIN expenses e ON true;

-- For now, we keep ALL data restricted to authenticated users only
-- If you need public access to specific data, uncomment and modify the policies above

-- ========================================
-- Part 3: Verify all tables are protected
-- ========================================

DO $$
DECLARE
  unprotected_tables TEXT[];
BEGIN
  -- Check for tables with public read access
  SELECT ARRAY_AGG(tablename)
  INTO unprotected_tables
  FROM pg_policies
  WHERE schemaname = 'public'
    AND 'anon' = ANY(roles)
    AND cmd = 'SELECT'
    AND tablename IN (
      'profiles', 'groups', 'group_members', 'expenses',
      'expense_splits', 'payments', 'friendships', 'attachments',
      'notifications', 'user_settings', 'user_roles'
    );

  IF unprotected_tables IS NOT NULL AND array_length(unprotected_tables, 1) > 0 THEN
    RAISE WARNING 'The following tables still have public read access: %', unprotected_tables;
  ELSE
    RAISE NOTICE 'All sensitive tables are now protected from anonymous access.';
  END IF;
END $$;

-- ========================================
-- Part 4: Add security comments
-- ========================================

COMMENT ON TABLE profiles IS
  'User profiles - RESTRICTED to authenticated users only. Contains sensitive user information.';

COMMENT ON TABLE groups IS
  'Expense groups - RESTRICTED to authenticated users only. Contains private group information.';

COMMENT ON TABLE expenses IS
  'Expense records - RESTRICTED to authenticated users only. Contains sensitive financial data.';

COMMENT ON TABLE payments IS
  'Payment records - RESTRICTED to authenticated users only. Contains sensitive financial transactions.';

COMMENT ON TABLE friendships IS
  'Friend connections - RESTRICTED to authenticated users only. Contains private relationship data.';

-- ========================================
-- Part 5: Ensure authenticated users can still access their data
-- ========================================

-- Verify that authenticated users still have proper access
DO $$
DECLARE
  auth_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND 'authenticated' = ANY(roles)
    AND tablename IN (
      'profiles', 'groups', 'group_members', 'expenses',
      'expense_splits', 'payments', 'friendships'
    );

  IF auth_policy_count < 20 THEN
    RAISE WARNING 'Expected at least 20 authenticated policies, found %', auth_policy_count;
  ELSE
    RAISE NOTICE 'Authenticated users have proper access. Found % policies.', auth_policy_count;
  END IF;
END $$;

COMMIT;

-- ========================================
-- Migration Notes
-- ========================================

-- This migration removes all public read access to protect user privacy and financial data.
-- If you need to add a public leaderboard or stats page, you should:
-- 1. Create a separate materialized view with aggregated/anonymized data
-- 2. Create a dedicated API endpoint that returns only non-sensitive data
-- 3. Use RPC functions with SECURITY DEFINER to control exactly what data is exposed

-- Example of a safe public stats function:
-- CREATE OR REPLACE FUNCTION get_public_stats()
-- RETURNS JSON
-- SECURITY DEFINER
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   RETURN json_build_object(
--     'total_users', (SELECT COUNT(*) FROM profiles),
--     'total_groups', (SELECT COUNT(*) FROM groups),
--     'total_expenses', (SELECT COUNT(*) FROM expenses WHERE created_at > NOW() - INTERVAL '30 days')
--   );
-- END;
-- $$;

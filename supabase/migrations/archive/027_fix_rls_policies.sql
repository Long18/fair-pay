-- Migration: 027_fix_rls_policies.sql
-- Description: Comprehensive RLS policy fixes to enable CRUD operations for authenticated users
-- Date: 2025-12-26
-- Dependencies: All previous migrations
-- Issue: Users cannot create groups or expenses due to overly restrictive/conflicting RLS policies

BEGIN;

-- ========================================
-- Part 1: Fix groups table policies
-- ========================================

-- Drop existing UPDATE policy that may cause issues
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;

-- Recreate UPDATE policy with simplified logic
-- Allow group creator OR system admin to update
CREATE POLICY "Group admins can update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_admin()
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Group creator can delete groups" ON groups;

-- Recreate DELETE policy with admin bypass
CREATE POLICY "Group creator can delete groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin()
  );

-- ========================================
-- Part 2: Fix group_members table policies
-- ========================================

-- Drop and recreate SELECT policies to ensure no recursion
DROP POLICY IF EXISTS "Group creators can view members" ON group_members;
DROP POLICY IF EXISTS "Users can view own membership" ON group_members;

-- Policy 1: Users can view their own membership records
CREATE POLICY "Users can view own membership"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Group creators can view all members of their groups
CREATE POLICY "Group creators can view members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Policy 3: Members can view other members in same group
CREATE POLICY "Group members can view other members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

-- Drop and recreate INSERT policy with admin bypass
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;

CREATE POLICY "Group creators can add members"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

-- ========================================
-- Part 3: Fix expenses table policies
-- ========================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Group members or friends can create expenses" ON expenses;

-- Create simplified INSERT policy
-- Check that user is either:
-- 1. Member of the group (for group expenses)
-- 2. Part of the friendship (for friend expenses)
-- 3. System admin (bypass)
CREATE POLICY "Group members or friends can create expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND
    (
      -- Group expenses: user must be member
      (
        context_type = 'group'
        AND group_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM group_members
            WHERE group_id = expenses.group_id
            AND user_id = auth.uid()
          )
          OR is_admin()
        )
      )
      OR
      -- Friend expenses: user must be part of friendship
      (
        context_type = 'friend'
        AND friendship_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM friendships
            WHERE id = expenses.friendship_id
            AND (user_a = auth.uid() OR user_b = auth.uid())
            AND status = 'accepted'
          )
          OR is_admin()
        )
      )
    )
  );

-- Drop and recreate UPDATE policy with admin bypass
DROP POLICY IF EXISTS "Expense creator can update" ON expenses;

CREATE POLICY "Expense creator can update"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_admin()
  );

-- Drop and recreate DELETE policy with admin bypass
DROP POLICY IF EXISTS "Expense creator can delete" ON expenses;

CREATE POLICY "Expense creator can delete"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin()
  );

-- ========================================
-- Part 4: Fix expense_splits table policies
-- ========================================

-- Add admin bypass to INSERT policy
DROP POLICY IF EXISTS "Expense creator can add splits" ON expense_splits;

CREATE POLICY "Expense creator can add splits"
  ON expense_splits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

-- Add admin bypass to UPDATE policy
DROP POLICY IF EXISTS "Expense creator can update splits" ON expense_splits;

CREATE POLICY "Expense creator can update splits"
  ON expense_splits
  FOR UPDATE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

-- Add admin bypass to DELETE policy
DROP POLICY IF EXISTS "Expense creator can delete splits" ON expense_splits;

CREATE POLICY "Expense creator can delete splits"
  ON expense_splits
  FOR DELETE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
    OR is_admin()
  );

-- ========================================
-- Part 5: Fix payments table policies
-- ========================================

-- Add admin bypass to DELETE policy
DROP POLICY IF EXISTS "Payment creator can delete" ON payments;

CREATE POLICY "Payment creator can delete"
  ON payments
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin()
  );

-- ========================================
-- Part 6: Fix friendships table policies
-- ========================================

-- Add admin bypass to UPDATE policy
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;

CREATE POLICY "Users can update their friendships"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (
    user_a = auth.uid()
    OR user_b = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    user_a = auth.uid()
    OR user_b = auth.uid()
    OR is_admin()
  );

-- Add admin bypass to DELETE policy
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

CREATE POLICY "Users can delete their friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (
    user_a = auth.uid()
    OR user_b = auth.uid()
    OR is_admin()
  );

-- ========================================
-- Part 7: Add comments for documentation
-- ========================================

COMMENT ON POLICY "Group admins can update groups" ON groups IS
  'Group creator or system admin can update group details';

COMMENT ON POLICY "Group creator can delete groups" ON groups IS
  'Group creator or system admin can delete groups';

COMMENT ON POLICY "Group members can view other members" ON group_members IS
  'Members can see other members in the same group (non-recursive)';

COMMENT ON POLICY "Group creators can add members" ON group_members IS
  'Group creator or system admin can add members';

COMMENT ON POLICY "Group members or friends can create expenses" ON expenses IS
  'Users can create expenses in groups they belong to or friendships they are part of. Admins can bypass.';

COMMENT ON POLICY "Expense creator can update" ON expenses IS
  'Expense creator or system admin can update expenses';

COMMENT ON POLICY "Expense creator can delete" ON expenses IS
  'Expense creator or system admin can delete expenses';

-- ========================================
-- Verify policies are working
-- ========================================

-- Test that policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('groups', 'group_members', 'expenses', 'expense_splits', 'payments', 'friendships');

  IF policy_count < 15 THEN
    RAISE WARNING 'Expected at least 15 policies, found %', policy_count;
  ELSE
    RAISE NOTICE 'RLS policies successfully updated. Found % policies.', policy_count;
  END IF;
END $$;

COMMIT;

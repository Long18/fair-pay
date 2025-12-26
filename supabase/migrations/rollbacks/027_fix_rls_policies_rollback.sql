-- Rollback: 027_fix_rls_policies_rollback.sql
-- Description: Rollback RLS policy fixes to previous state
-- Date: 2025-12-26
-- WARNING: This will revert to the problematic policies that prevented CRUD operations

BEGIN;

-- ========================================
-- Rollback Part 1: Revert groups table policies
-- ========================================

DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group creator can delete groups" ON groups;

-- Restore original UPDATE policy (without admin bypass)
CREATE POLICY "Group admins can update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Restore original DELETE policy (without admin bypass)
CREATE POLICY "Group creator can delete groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- Rollback Part 2: Revert group_members table policies
-- ========================================

DROP POLICY IF EXISTS "Users can view own membership" ON group_members;
DROP POLICY IF EXISTS "Group creators can view members" ON group_members;
DROP POLICY IF EXISTS "Group members can view other members" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;

-- Restore original SELECT policies
CREATE POLICY "Group creators can view members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id
      FROM groups
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view own membership"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Restore original INSERT policy (without admin bypass)
CREATE POLICY "Group creators can add members"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id
      FROM groups
      WHERE created_by = auth.uid()
    )
  );

-- ========================================
-- Rollback Part 3: Revert expenses table policies
-- ========================================

DROP POLICY IF EXISTS "Group members or friends can create expenses" ON expenses;
DROP POLICY IF EXISTS "Expense creator can update" ON expenses;
DROP POLICY IF EXISTS "Expense creator can delete" ON expenses;

-- Restore original INSERT policy (without admin bypass)
CREATE POLICY "Group members or friends can create expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND
    (
      (context_type = 'group' AND group_id IN (
        SELECT group_id
        FROM group_members
        WHERE user_id = auth.uid()
      ))
      OR
      (context_type = 'friend' AND friendship_id IN (
        SELECT id
        FROM friendships
        WHERE (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
      ))
    )
  );

-- Restore original UPDATE policy (without admin bypass)
CREATE POLICY "Expense creator can update"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Restore original DELETE policy (without admin bypass)
CREATE POLICY "Expense creator can delete"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- Rollback Part 4: Revert expense_splits table policies
-- ========================================

DROP POLICY IF EXISTS "Expense creator can add splits" ON expense_splits;
DROP POLICY IF EXISTS "Expense creator can update splits" ON expense_splits;
DROP POLICY IF EXISTS "Expense creator can delete splits" ON expense_splits;

-- Restore original policies (without admin bypass)
CREATE POLICY "Expense creator can add splits"
  ON expense_splits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can update splits"
  ON expense_splits
  FOR UPDATE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can delete splits"
  ON expense_splits
  FOR DELETE
  TO authenticated
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE created_by = auth.uid()
    )
  );

-- ========================================
-- Rollback Part 5: Revert payments table policies
-- ========================================

DROP POLICY IF EXISTS "Payment creator can delete" ON payments;

-- Restore original policy (without admin bypass)
CREATE POLICY "Payment creator can delete"
  ON payments
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- Rollback Part 6: Revert friendships table policies
-- ========================================

DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

-- Restore original policies (without admin bypass)
CREATE POLICY "Users can update their friendships"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid())
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Users can delete their friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

COMMIT;

-- Note: After rollback, CRUD operations may fail again due to overly restrictive policies
-- This rollback is provided for emergency recovery only

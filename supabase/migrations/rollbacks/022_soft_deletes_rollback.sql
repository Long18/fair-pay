-- Rollback: 022_soft_deletes.sql
-- Removes soft delete functionality and restores hard delete behavior

BEGIN;

-- ========================================
-- Part 1: Drop Soft Delete Functions
-- ========================================

DROP FUNCTION IF EXISTS soft_delete_expense(UUID);
DROP FUNCTION IF EXISTS soft_delete_payment(UUID);
DROP FUNCTION IF EXISTS soft_delete_group(UUID);
DROP FUNCTION IF EXISTS restore_deleted_expense(UUID);
DROP FUNCTION IF EXISTS restore_deleted_payment(UUID);
DROP FUNCTION IF EXISTS restore_deleted_group(UUID);
DROP FUNCTION IF EXISTS hard_delete_old_records(INTEGER);

-- ========================================
-- Part 2: Drop Indexes
-- ========================================

DROP INDEX IF EXISTS idx_expenses_not_deleted;
DROP INDEX IF EXISTS idx_payments_not_deleted;
DROP INDEX IF EXISTS idx_groups_not_deleted;
DROP INDEX IF EXISTS idx_expenses_deleted;
DROP INDEX IF EXISTS idx_payments_deleted;
DROP INDEX IF EXISTS idx_groups_deleted;

-- ========================================
-- Part 3: Restore Original RLS Policies
-- ========================================

-- Restore expenses SELECT policy (without deleted_at check)
DROP POLICY IF EXISTS "Participants can view non-deleted expenses" ON expenses;

CREATE POLICY "Participants can view expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    (context_type = 'group' AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
    OR
    (context_type = 'friend' AND friendship_id IN (
      SELECT id FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

-- Restore payments SELECT policy (without deleted_at check)
DROP POLICY IF EXISTS "Users can view non-deleted payments" ON payments;

CREATE POLICY "Users can view their payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    from_user = auth.uid()
    OR to_user = auth.uid()
    OR (group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
    OR (friendship_id IN (
      SELECT id FROM friendships
      WHERE (user_a = auth.uid() OR user_b = auth.uid())
        AND status = 'accepted'
    ))
  );

-- Restore groups SELECT policy (without deleted_at check)
DROP POLICY IF EXISTS "Members can view non-deleted groups" ON groups;

CREATE POLICY "Members can view their groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- Part 4: Remove Soft Delete Columns
-- ========================================

-- WARNING: This will permanently delete all soft-deleted data!
-- Consider backing up soft-deleted records before running this rollback

ALTER TABLE expenses DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE payments DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE payments DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE groups DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE groups DROP COLUMN IF EXISTS deleted_by;

COMMIT;

-- CRITICAL WARNING:
-- This rollback will PERMANENTLY DELETE all soft-deleted records
-- Make sure to backup the following data before rolling back:
--
-- Backup soft-deleted expenses:
-- SELECT * FROM expenses WHERE deleted_at IS NOT NULL;
--
-- Backup soft-deleted payments:
-- SELECT * FROM payments WHERE deleted_at IS NOT NULL;
--
-- Backup soft-deleted groups:
-- SELECT * FROM groups WHERE deleted_at IS NOT NULL;

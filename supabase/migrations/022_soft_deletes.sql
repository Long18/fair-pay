-- Migration: Soft Delete Implementation
-- Description: Add soft delete functionality to prevent data loss and enable audit trails
-- Date: 2025-12-26
-- Dependencies: 021_performance_indexes.sql

BEGIN;

-- ========================================
-- Part 1: Add Soft Delete Columns
-- ========================================

-- Add soft delete columns to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add soft delete columns to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add soft delete columns to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ========================================
-- Part 2: Create Indexes for Soft Delete Queries
-- ========================================

-- Index for non-deleted expenses (most queries exclude deleted)
CREATE INDEX IF NOT EXISTS idx_expenses_not_deleted
  ON expenses(id) WHERE deleted_at IS NULL;

-- Index for non-deleted payments
CREATE INDEX IF NOT EXISTS idx_payments_not_deleted
  ON payments(id) WHERE deleted_at IS NULL;

-- Index for non-deleted groups
CREATE INDEX IF NOT EXISTS idx_groups_not_deleted
  ON groups(id) WHERE deleted_at IS NULL;

-- Index for finding deleted records (admin/audit)
CREATE INDEX IF NOT EXISTS idx_expenses_deleted
  ON expenses(deleted_at, deleted_by) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_deleted
  ON payments(deleted_at, deleted_by) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_groups_deleted
  ON groups(deleted_at, deleted_by) WHERE deleted_at IS NOT NULL;

-- ========================================
-- Part 3: Update RLS Policies to Exclude Deleted Records
-- ========================================

-- Drop and recreate expenses SELECT policy
DROP POLICY IF EXISTS "Participants can view expenses" ON expenses;
DROP POLICY IF EXISTS "Participants can view non-deleted expenses" ON expenses;

CREATE POLICY "Participants can view non-deleted expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      (context_type = 'group' AND group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      ))
      OR
      (context_type = 'friend' AND friendship_id IN (
        SELECT id FROM friendships
        WHERE (user_a = auth.uid() OR user_b = auth.uid())
          AND status = 'accepted'
      ))
    )
  );

-- Drop and recreate payments SELECT policy
DROP POLICY IF EXISTS "Users can view their payments" ON payments;
DROP POLICY IF EXISTS "Users can view non-deleted payments" ON payments;

CREATE POLICY "Users can view non-deleted payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
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
    )
  );

-- Drop and recreate groups SELECT policy
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
DROP POLICY IF EXISTS "Members can view non-deleted groups" ON groups;

CREATE POLICY "Members can view non-deleted groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- Part 4: Soft Delete Functions
-- ========================================

-- Function to soft delete an expense
CREATE OR REPLACE FUNCTION soft_delete_expense(p_expense_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_expense_exists BOOLEAN;
BEGIN
  -- Check if expense exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM expenses
    WHERE id = p_expense_id
      AND created_by = auth.uid()
      AND deleted_at IS NULL
  ) INTO v_expense_exists;

  IF NOT v_expense_exists THEN
    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';
  END IF;

  -- Soft delete the expense
  UPDATE expenses
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_expense_id
    AND created_by = auth.uid()
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a payment
CREATE OR REPLACE FUNCTION soft_delete_payment(p_payment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_payment_exists BOOLEAN;
BEGIN
  -- Check if payment exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM payments
    WHERE id = p_payment_id
      AND created_by = auth.uid()
      AND deleted_at IS NULL
  ) INTO v_payment_exists;

  IF NOT v_payment_exists THEN
    RAISE EXCEPTION 'Payment not found or you do not have permission to delete it';
  END IF;

  -- Soft delete the payment
  UPDATE payments
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_payment_id
    AND created_by = auth.uid()
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a group (admin only)
CREATE OR REPLACE FUNCTION soft_delete_group(p_group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_group_exists BOOLEAN;
BEGIN
  -- Check if user is group admin
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can delete groups';
  END IF;

  -- Check if group exists and is not already deleted
  SELECT EXISTS(
    SELECT 1 FROM groups
    WHERE id = p_group_id
      AND deleted_at IS NULL
  ) INTO v_group_exists;

  IF NOT v_group_exists THEN
    RAISE EXCEPTION 'Group not found or already deleted';
  END IF;

  -- Soft delete the group
  UPDATE groups
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_group_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted expense (admin only)
CREATE OR REPLACE FUNCTION restore_deleted_expense(p_expense_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted expenses';
  END IF;

  -- Restore the expense
  UPDATE expenses
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_expense_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted payment (admin only)
CREATE OR REPLACE FUNCTION restore_deleted_payment(p_payment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted payments';
  END IF;

  -- Restore the payment
  UPDATE payments
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_payment_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted group (admin only)
CREATE OR REPLACE FUNCTION restore_deleted_group(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted groups';
  END IF;

  -- Restore the group
  UPDATE groups
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_group_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted records (admin only, use with caution)
CREATE OR REPLACE FUNCTION hard_delete_old_records(
  p_days_old INTEGER DEFAULT 90
)
RETURNS TABLE (
  expenses_deleted INTEGER,
  payments_deleted INTEGER,
  groups_deleted INTEGER
) AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_expenses_count INTEGER;
  v_payments_count INTEGER;
  v_groups_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can permanently delete records';
  END IF;

  v_cutoff_date := NOW() - (p_days_old || ' days')::INTERVAL;

  -- Delete old expenses
  DELETE FROM expenses
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_expenses_count = ROW_COUNT;

  -- Delete old payments
  DELETE FROM payments
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_payments_count = ROW_COUNT;

  -- Delete old groups
  DELETE FROM groups
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_groups_count = ROW_COUNT;

  RETURN QUERY SELECT v_expenses_count, v_payments_count, v_groups_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Part 5: Grant Permissions
-- ========================================

GRANT EXECUTE ON FUNCTION soft_delete_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION hard_delete_old_records(INTEGER) TO authenticated;

-- ========================================
-- Part 6: Comments for Documentation
-- ========================================

COMMENT ON COLUMN expenses.deleted_at IS 'Timestamp when expense was soft deleted, NULL if active';
COMMENT ON COLUMN expenses.deleted_by IS 'User who soft deleted the expense';
COMMENT ON COLUMN payments.deleted_at IS 'Timestamp when payment was soft deleted, NULL if active';
COMMENT ON COLUMN payments.deleted_by IS 'User who soft deleted the payment';
COMMENT ON COLUMN groups.deleted_at IS 'Timestamp when group was soft deleted, NULL if active';
COMMENT ON COLUMN groups.deleted_by IS 'User who soft deleted the group';

COMMENT ON FUNCTION soft_delete_expense IS 'Soft delete an expense (creator only)';
COMMENT ON FUNCTION soft_delete_payment IS 'Soft delete a payment (creator only)';
COMMENT ON FUNCTION soft_delete_group IS 'Soft delete a group (admin only)';
COMMENT ON FUNCTION restore_deleted_expense IS 'Restore a soft-deleted expense (admin only)';
COMMENT ON FUNCTION restore_deleted_payment IS 'Restore a soft-deleted payment (admin only)';
COMMENT ON FUNCTION restore_deleted_group IS 'Restore a soft-deleted group (admin only)';
COMMENT ON FUNCTION hard_delete_old_records IS 'Permanently delete records older than specified days (admin only, use with caution)';

COMMIT;

-- ========================================
-- Usage Examples
-- ========================================

-- Soft delete an expense:
-- SELECT soft_delete_expense('expense-uuid-here');

-- Restore an expense (admin only):
-- SELECT restore_deleted_expense('expense-uuid-here');

-- Permanently delete records older than 90 days (admin only):
-- SELECT * FROM hard_delete_old_records(90);

-- Query deleted records (admin audit):
-- SELECT * FROM expenses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;

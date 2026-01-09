-- Migration: Add Admin Permissions to Settle and Delete Operations
-- Created: 2026-01-10
-- Purpose: Allow system admins to perform all CRUD operations including settle transactions
--
-- Changes:
-- 1. settle_split: Allow admin to settle any split
-- 2. settle_expense: Allow admin to settle any expense
-- 3. unsettle_split: Allow admin to unsettle any split
-- 4. settle_all_group_debts: Allow system admin (in addition to group admin)
-- 5. bulk_delete_expenses: Allow system admin to delete any expenses
-- 6. soft_delete_expense: Allow system admin to delete any expense

-- =============================================
-- 1. Update settle_split function
-- =============================================
CREATE OR REPLACE FUNCTION settle_split(
  p_split_id UUID,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
  v_settled_amount DECIMAL;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle splits';
  END IF;

  IF v_split.is_settled THEN
    RAISE EXCEPTION 'Split is already settled';
  END IF;

  v_settled_amount := COALESCE(p_amount, v_split.computed_amount);

  IF v_settled_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0';
  END IF;

  IF v_settled_amount > v_split.computed_amount THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = v_settled_amount, settled_at = NOW()
  WHERE id = p_split_id;

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'settled_amount', v_settled_amount,
    'computed_amount', v_split.computed_amount,
    'is_partial', v_settled_amount < v_split.computed_amount
  );
END;
$$;

COMMENT ON FUNCTION settle_split(UUID, DECIMAL) IS 'Settle an individual split with optional custom amount. Can be called by payer or system admin.';

-- =============================================
-- 2. Update unsettle_split function
-- =============================================
CREATE OR REPLACE FUNCTION unsettle_split(p_split_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can unsettle splits';
  END IF;

  UPDATE expense_splits
  SET is_settled = false, settled_amount = 0, settled_at = NULL
  WHERE id = p_split_id;

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id);
END;
$$;

COMMENT ON FUNCTION unsettle_split(UUID) IS 'Unsettle a split (for corrections). Can be called by payer or system admin.';

-- =============================================
-- 3. Update settle_expense function
-- =============================================
CREATE OR REPLACE FUNCTION settle_expense(p_expense_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense RECORD;
  v_splits_count INTEGER;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle the expense';
  END IF;

  IF v_expense.is_payment THEN
    RAISE EXCEPTION 'Expense is already settled';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = computed_amount, settled_at = NOW()
  WHERE expense_id = p_expense_id AND is_settled = false;

  GET DIAGNOSTICS v_splits_count = ROW_COUNT;

  UPDATE expenses SET is_payment = true WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'splits_settled', v_splits_count
  );
END;
$$;

COMMENT ON FUNCTION settle_expense(UUID) IS 'Settle all splits for an expense. Can be called by payer or system admin.';

-- =============================================
-- 4. Update settle_all_group_debts function
-- =============================================
CREATE OR REPLACE FUNCTION settle_all_group_debts(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_group_admin BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_splits_count INTEGER := 0;
  v_total_amount NUMERIC(10,2) := 0;
  v_expenses_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if user is group admin (only if not system admin)
  IF NOT v_is_system_admin THEN
    SELECT role = 'admin' INTO v_is_group_admin
    FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    IF NOT v_is_group_admin THEN
      RAISE EXCEPTION 'Only group admins or system admins can settle all debts';
    END IF;
  END IF;

  -- Calculate total amount to be settled
  SELECT
    COUNT(*),
    COALESCE(SUM(computed_amount - COALESCE(settled_amount, 0)), 0)
  INTO v_splits_count, v_total_amount
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Mark all unsettled splits as settled
  UPDATE expense_splits es
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  FROM expenses e
  WHERE es.expense_id = e.id
    AND e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Count affected expenses
  SELECT COUNT(DISTINCT e.id) INTO v_expenses_count
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id AND es.is_settled = true
    );

  -- Mark all expenses as paid
  UPDATE expenses
  SET is_payment = true, updated_at = NOW()
  WHERE group_id = p_group_id
    AND is_payment = false;

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  ) VALUES (
    v_user_id,
    'expenses',
    'BULK_SETTLE',
    p_group_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'splits_settled', v_splits_count,
      'expenses_settled', v_expenses_count,
      'total_amount', v_total_amount,
      'settled_by_admin', v_is_system_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'splits_settled', v_splits_count,
    'expenses_settled', v_expenses_count,
    'total_amount', v_total_amount,
    'message', format('Settled %s debts totaling ₫%s', v_splits_count, v_total_amount)
  );
END;
$$;

COMMENT ON FUNCTION settle_all_group_debts(UUID) IS 'Settles all outstanding debts in a group. Can be called by group admins or system admins. Marks all unsettled splits as settled and logs to audit_logs.';

-- =============================================
-- 5. Update bulk_delete_expenses function
-- =============================================
CREATE OR REPLACE FUNCTION bulk_delete_expenses(p_expense_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_expense RECORD;
  v_can_delete BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Validate expense limit (max 50 at a time)
  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  -- Check permissions for each expense (skip if system admin)
  IF NOT v_is_system_admin THEN
    FOR v_expense IN
      SELECT e.*, gm.role as user_role
      FROM expenses e
      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id
      WHERE e.id = ANY(p_expense_ids)
    LOOP
      -- User can delete if they created it OR they are group admin
      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');

      IF NOT v_can_delete THEN
        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;
      END IF;
    END LOOP;
  END IF;

  -- Log each deletion to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  )
  SELECT
    v_user_id,
    'expenses',
    'BULK_DELETE',
    e.id,
    jsonb_build_object(
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'friendship_id', e.friendship_id,
      'deleted_by_admin', v_is_system_admin
    )
  FROM expenses e
  WHERE e.id = ANY(p_expense_ids);

  -- Delete expense splits (cascades will handle this, but explicit for clarity)
  DELETE FROM expense_splits
  WHERE expense_id = ANY(p_expense_ids);

  -- Delete expenses
  DELETE FROM expenses
  WHERE id = ANY(p_expense_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Deleted %s expense(s)', v_deleted_count)
  );
END;
$$;

COMMENT ON FUNCTION bulk_delete_expenses(UUID[]) IS 'Deletes multiple expenses atomically. Max 50 expenses at a time. Can be called by expense creators, group admins, or system admins. Logs all deletions to audit_logs for audit trail.';

-- =============================================
-- 6. Update soft_delete_expense function
-- =============================================
CREATE OR REPLACE FUNCTION soft_delete_expense(p_expense_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_expense_exists BOOLEAN;
  v_is_system_admin BOOLEAN;
BEGIN
  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if expense exists and user has permission
  IF v_is_system_admin THEN
    -- System admin can delete any expense
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  ELSE
    -- Regular users can only delete their own expenses
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND created_by = auth.uid()
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  END IF;

  IF NOT v_expense_exists THEN
    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';
  END IF;

  -- Soft delete the expense
  UPDATE expenses
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_expense_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION soft_delete_expense(UUID) IS 'Soft delete an expense. Can be called by expense creator or system admin.';

-- Migration: Bulk Operations
-- Description: Implements bulk operations for power users (settle all, bulk delete, batch payments)
-- Date: 2025-12-30

BEGIN;

-- ========================================
-- FUNCTION 1: Settle All Group Debts
-- ========================================
-- Settles all outstanding debts in a group by marking all splits as settled
-- Only group admins can perform this operation

CREATE OR REPLACE FUNCTION settle_all_group_debts(p_group_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_splits_count INTEGER := 0;
  v_total_amount NUMERIC(10,2) := 0;
  v_expenses_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is group admin
  SELECT role = 'admin' INTO v_is_admin
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can settle all debts';
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
      'total_amount', v_total_amount
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

-- ========================================
-- FUNCTION 2: Bulk Delete Expenses
-- ========================================
-- Deletes multiple expenses atomically with proper balance reversal
-- Only expense creators or group admins can delete

CREATE OR REPLACE FUNCTION bulk_delete_expenses(p_expense_ids UUID[])
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER := 0;
  v_expense RECORD;
  v_can_delete BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate expense limit (max 50 at a time)
  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  -- Check permissions for each expense
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
      'friendship_id', e.friendship_id
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

-- ========================================
-- FUNCTION 3: Batch Record Payments
-- ========================================
-- Records multiple payments in one transaction
-- Each payment is an expense with is_payment = true

CREATE OR REPLACE FUNCTION batch_record_payments(
  p_payments JSONB -- Array of {from_user_id, to_user_id, amount, description, group_id?, friendship_id?}
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_payment JSONB;
  v_payment_ids UUID[] := '{}';
  v_payment_id UUID;
  v_created_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate payment limit (max 50 at a time)
  IF jsonb_array_length(p_payments) > 50 THEN
    RAISE EXCEPTION 'Cannot record more than 50 payments at once';
  END IF;

  -- Process each payment
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    -- Validate required fields
    IF (v_payment->>'from_user_id') IS NULL OR 
       (v_payment->>'to_user_id') IS NULL OR 
       (v_payment->>'amount') IS NULL THEN
      RAISE EXCEPTION 'Payment must have from_user_id, to_user_id, and amount';
    END IF;

    -- Validate context (group XOR friendship)
    IF ((v_payment->>'group_id') IS NULL AND (v_payment->>'friendship_id') IS NULL) OR
       ((v_payment->>'group_id') IS NOT NULL AND (v_payment->>'friendship_id') IS NOT NULL) THEN
      RAISE EXCEPTION 'Payment must belong to either a group or friendship, not both or neither';
    END IF;

    -- Create payment expense
    INSERT INTO expenses (
      description,
      amount,
      paid_by_user_id,
      group_id,
      friendship_id,
      is_payment,
      created_by,
      expense_date
    ) VALUES (
      COALESCE(v_payment->>'description', 'Payment'),
      (v_payment->>'amount')::NUMERIC(10,2),
      (v_payment->>'to_user_id')::UUID, -- Receiver is the "payer" in our model
      (v_payment->>'group_id')::UUID,
      (v_payment->>'friendship_id')::UUID,
      true,
      v_user_id,
      NOW()
    ) RETURNING id INTO v_payment_id;

    -- Create split for the sender (who owes the money)
    INSERT INTO expense_splits (
      expense_id,
      user_id,
      split_method,
      split_value,
      computed_amount,
      is_settled,
      settled_amount,
      settled_at
    ) VALUES (
      v_payment_id,
      (v_payment->>'from_user_id')::UUID,
      'equal',
      1,
      (v_payment->>'amount')::NUMERIC(10,2),
      true, -- Payments are immediately settled
      (v_payment->>'amount')::NUMERIC(10,2),
      NOW()
    );

    v_payment_ids := array_append(v_payment_ids, v_payment_id);
    v_created_count := v_created_count + 1;
  END LOOP;

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
    'BATCH_PAYMENT',
    NULL,
    jsonb_build_object(
      'payment_count', v_created_count,
      'payment_ids', v_payment_ids
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'payment_ids', v_payment_ids,
    'message', format('Recorded %s payment(s)', v_created_count)
  );
END;
$$;

-- ========================================
-- PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION settle_all_group_debts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_expenses(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_record_payments(JSONB) TO authenticated;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION settle_all_group_debts(UUID) IS
'Settles all outstanding debts in a group. Only group admins can perform this operation.
Marks all unsettled splits as settled and logs to audit_logs.
Returns: {success, group_id, splits_settled, expenses_settled, total_amount, message}';

COMMENT ON FUNCTION bulk_delete_expenses(UUID[]) IS
'Deletes multiple expenses atomically. Max 50 expenses at a time.
Only expense creators or group admins can delete.
Logs all deletions to audit_logs for audit trail.
Returns: {success, deleted_count, message}';

COMMENT ON FUNCTION batch_record_payments(JSONB) IS
'Records multiple payments in one transaction. Max 50 payments at a time.
Each payment must have: from_user_id, to_user_id, amount, and either group_id or friendship_id.
Logs batch operation to audit_logs.
Returns: {success, created_count, payment_ids, message}';

COMMIT;


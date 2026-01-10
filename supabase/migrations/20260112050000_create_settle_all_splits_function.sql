-- Migration: Create settle_all_splits function with payment events
-- Created: 2026-01-12
-- Purpose: Bulk settlement function for payers and admins with event tracking
--
-- Related: Task 1.10 - Create payment/settlement events data pipeline
-- Related: Task 4.8 - Implement "Settle All" backend RPC function
-- Requirements: 7.3, 7.4, 7.5 (Settle All with audit trail)

-- =============================================
-- Create settle_all_splits function
-- =============================================
CREATE OR REPLACE FUNCTION settle_all_splits(
  p_expense_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense RECORD;
  v_split RECORD;
  v_splits_updated INTEGER := 0;
  v_already_paid INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_split_ids UUID[] := ARRAY[]::UUID[];
  v_audit_id UUID;
BEGIN
  -- Fetch expense record
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Expense not found'; 
  END IF;

  -- Permission check: Only payer OR system admin can settle all
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle all splits';
  END IF;

  -- Count already paid splits
  SELECT COUNT(*) INTO v_already_paid
  FROM expense_splits
  WHERE expense_id = p_expense_id
  AND is_settled = true
  AND COALESCE(settled_amount, 0) >= computed_amount - 0.01;

  -- Process each unpaid or partially paid split
  FOR v_split IN 
    SELECT * FROM expense_splits
    WHERE expense_id = p_expense_id
    AND (
      is_settled = false 
      OR COALESCE(settled_amount, 0) < computed_amount - 0.01
    )
  LOOP
    -- Calculate remaining amount to settle
    DECLARE
      v_remaining_amount DECIMAL;
      v_event_id UUID;
    BEGIN
      v_remaining_amount := v_split.computed_amount - COALESCE(v_split.settled_amount, 0);
      
      -- Update split to fully settled
      UPDATE expense_splits
      SET 
        is_settled = true,
        settled_amount = computed_amount,
        settled_at = NOW()
      WHERE id = v_split.id;

      -- Insert payment event for this split
      INSERT INTO payment_events (
        expense_id,
        split_id,
        event_type,
        from_user_id,
        to_user_id,
        amount,
        currency,
        method,
        actor_user_id,
        metadata,
        created_at
      ) VALUES (
        p_expense_id,
        v_split.id,
        'settle_all',
        v_split.user_id,                    -- from: the person who owed
        v_expense.paid_by_user_id,          -- to: the person who paid
        v_remaining_amount,                 -- remaining amount settled
        v_expense.currency,
        'manual',
        auth.uid(),                         -- actor: current user (payer or admin)
        jsonb_build_object(
          'previous_settled_amount', COALESCE(v_split.settled_amount, 0),
          'new_settled_amount', v_split.computed_amount,
          'computed_amount', v_split.computed_amount,
          'bulk_operation', true
        ),
        NOW()
      ) RETURNING id INTO v_event_id;

      -- Track for summary
      v_splits_updated := v_splits_updated + 1;
      v_total_amount := v_total_amount + v_remaining_amount;
      v_split_ids := array_append(v_split_ids, v_split.id);
    END;
  END LOOP;

  -- Write audit trail record
  v_audit_id := write_audit_trail(
    'manual_settle_all',
    p_expense_id,
    'expense',
    jsonb_build_object(
      'splitsUpdated', v_splits_updated,
      'alreadyPaid', v_already_paid,
      'totalAmount', v_total_amount,
      'splitIds', v_split_ids,
      'currency', v_expense.currency
    )
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'splits_updated', v_splits_updated,
    'already_paid', v_already_paid,
    'total_amount', v_total_amount,
    'currency', v_expense.currency,
    'audit_id', v_audit_id,
    'split_ids', v_split_ids
  );
END;
$$;

COMMENT ON FUNCTION settle_all_splits(UUID) IS 
'Bulk settlement function for payers and admins. Settles all unpaid or partially paid splits for an expense.
Already-paid splits remain unchanged. Creates individual payment_event records for each split settled.
Writes audit trail record for the bulk operation. Returns summary with counts and amounts.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION settle_all_splits(UUID) TO authenticated;

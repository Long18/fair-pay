-- Migration: Fix settle_split to handle pending email participants
-- Date: 2026-02-06
-- Issue: When settling a split with pending_email (no user_id), payment_events.from_user_id was NULL
-- Solution: Only insert payment_event if split has a valid user_id (not pending email)

BEGIN;

-- Drop and recreate settle_split function with pending email handling
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
  v_new_settled_amount DECIMAL;
  v_percentage DECIMAL;
  v_is_partial BOOLEAN;
  v_amount_added DECIMAL;
  v_event_id UUID;
BEGIN
  -- Fetch split record
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Split not found'; 
  END IF;

  -- Fetch expense record
  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Expense not found'; 
  END IF;

  -- Permission check: Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle splits';
  END IF;

  -- Calculate new settled amount
  -- If p_amount is NULL, settle the remaining amount (computed_amount - current settled_amount)
  -- If p_amount is provided, accumulate it with existing settled_amount
  IF p_amount IS NULL THEN
    -- Settle remaining amount
    v_new_settled_amount := v_split.computed_amount;
  ELSE
    -- Accumulate partial payment
    v_new_settled_amount := COALESCE(v_split.settled_amount, 0) + p_amount;
  END IF;

  -- Validation: Amount must be positive
  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0';
  END IF;

  -- Validation: New settled amount cannot exceed computed amount
  IF v_new_settled_amount > v_split.computed_amount THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount (remaining: %)', 
      v_split.computed_amount - COALESCE(v_split.settled_amount, 0);
  END IF;

  -- Check if already fully settled
  IF v_split.is_settled AND COALESCE(v_split.settled_amount, 0) >= v_split.computed_amount THEN
    RAISE EXCEPTION 'Split is already fully settled';
  END IF;

  -- Calculate amount added in this settlement
  v_amount_added := v_new_settled_amount - COALESCE(v_split.settled_amount, 0);

  -- Update split record
  UPDATE expense_splits
  SET 
    is_settled = true, 
    settled_amount = v_new_settled_amount, 
    settled_at = NOW()
  WHERE id = p_split_id;

  -- ✅ FIX: Only insert payment event if split has a valid user_id
  -- Skip payment_events for pending email participants (NULL user_id)
  IF v_split.user_id IS NOT NULL THEN
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
      v_expense.id,
      p_split_id,
      'manual_settle',
      v_split.user_id,                    -- from: the person who owed
      v_expense.paid_by_user_id,          -- to: the person who paid
      v_amount_added,                     -- amount settled in this operation
      v_expense.currency,
      'manual',
      auth.uid(),                         -- actor: current user (payer or admin)
      jsonb_build_object(
        'previous_settled_amount', COALESCE(v_split.settled_amount, 0),
        'new_settled_amount', v_new_settled_amount,
        'computed_amount', v_split.computed_amount,
        'is_partial', v_new_settled_amount < v_split.computed_amount - 0.01,
        'pending_email_participant', false
      ),
      NOW()
    ) RETURNING id INTO v_event_id;
  ELSE
    -- For pending email participants, still track in metadata but don't create payment_events row
    v_event_id := NULL;
  END IF;

  -- Calculate percentage
  v_percentage := ROUND((v_new_settled_amount / v_split.computed_amount) * 100, 1);
  
  -- Determine if partial (use small epsilon for floating point comparison)
  v_is_partial := v_new_settled_amount < v_split.computed_amount - 0.01;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'settled_amount', v_new_settled_amount,
    'computed_amount', v_split.computed_amount,
    'is_partial', v_is_partial,
    'percentage', v_percentage,
    'previous_settled_amount', COALESCE(v_split.settled_amount, 0),
    'amount_added', v_amount_added,
    'event_id', v_event_id,
    'pending_email_participant', v_split.user_id IS NULL
  );
END;
$$;

COMMENT ON FUNCTION settle_split(UUID, DECIMAL) IS 
'Settle an individual split with optional custom amount. Supports accumulating partial payments. 
If p_amount is NULL, settles the remaining amount. If p_amount is provided, accumulates it with existing settled_amount.
Automatically creates a payment_event record for Activity List display (skipped for pending email participants).
Can be called by payer or system admin.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION settle_split(UUID, DECIMAL) TO authenticated;

COMMIT;

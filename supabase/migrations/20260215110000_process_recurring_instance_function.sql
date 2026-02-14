-- Migration: Atomic recurring instance creation function
-- Description: Single SQL function that creates an expense instance, copies splits,
--   auto-settles payer's split, consumes prepaid, and updates next_occurrence.
-- Handles: Idempotency, multi-cycle catch-up, edge cases

-- ========================================
-- FUNCTION: process_single_recurring_instance
-- Atomically creates one expense instance for a recurring expense cycle
-- ========================================

CREATE OR REPLACE FUNCTION process_single_recurring_instance(
  p_recurring_expense_id UUID,
  p_cycle_date DATE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_recurring RECORD;
  v_template RECORD;
  v_instance_id UUID;
  v_consume_result JSONB;
  v_next_date DATE;
  v_split RECORD;
BEGIN
  -- ========================================
  -- 1. IDEMPOTENCY CHECK
  -- If an instance already exists for this recurring + cycle_date, skip
  -- ========================================
  IF EXISTS (
    SELECT 1 FROM expenses
    WHERE recurring_expense_id = p_recurring_expense_id
      AND cycle_date = p_cycle_date
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'Instance already exists for this cycle',
      'recurring_id', p_recurring_expense_id,
      'cycle_date', p_cycle_date
    );
  END IF;

  -- ========================================
  -- 2. LOCK AND FETCH RECURRING EXPENSE
  -- ========================================
  SELECT * INTO v_recurring
  FROM recurring_expenses
  WHERE id = p_recurring_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Recurring expense not found: ' || p_recurring_expense_id
    );
  END IF;

  -- Verify still active
  IF NOT v_recurring.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Recurring expense is inactive',
      'recurring_id', p_recurring_expense_id
    );
  END IF;

  -- ========================================
  -- 3. FETCH TEMPLATE EXPENSE
  -- ========================================
  SELECT * INTO v_template
  FROM expenses
  WHERE id = v_recurring.template_expense_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template expense not found: ' || v_recurring.template_expense_id
    );
  END IF;

  -- ========================================
  -- 4. CREATE EXPENSE INSTANCE
  -- ========================================
  INSERT INTO expenses (
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    is_payment,
    context_type,
    group_id,
    friendship_id,
    created_by,
    recurring_expense_id,
    cycle_date,
    generated_at
  ) VALUES (
    v_template.description,
    v_template.amount,
    v_template.currency,
    v_template.category,
    p_cycle_date,
    v_template.paid_by_user_id,
    false,
    v_template.context_type,
    v_template.group_id,
    v_template.friendship_id,
    v_template.created_by,
    p_recurring_expense_id,
    p_cycle_date,
    NOW()
  ) RETURNING id INTO v_instance_id;

  -- ========================================
  -- 5. COPY SPLITS FROM TEMPLATE
  -- Auto-settle payer's own split (matches manual expense creation behavior)
  -- ========================================
  INSERT INTO expense_splits (
    expense_id,
    user_id,
    split_method,
    split_value,
    computed_amount,
    is_settled,
    settled_amount,
    settled_at
  )
  SELECT
    v_instance_id,
    es.user_id,
    es.split_method,
    es.split_value,
    es.computed_amount,
    -- Auto-settle payer's own split
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN true ELSE false END,
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN es.computed_amount ELSE 0 END,
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN NOW() ELSE NULL END
  FROM expense_splits es
  WHERE es.expense_id = v_recurring.template_expense_id;

  -- ========================================
  -- 6. CONSUME PREPAID BALANCES
  -- Uses the existing consume_prepaid_for_instance function
  -- This will mark splits as settled for members with prepaid balance
  -- ========================================
  v_consume_result := consume_prepaid_for_instance(v_instance_id);

  -- ========================================
  -- 7. CALCULATE NEXT OCCURRENCE
  -- ========================================
  v_next_date := calculate_next_occurrence(
    p_cycle_date,
    v_recurring.frequency,
    v_recurring.interval
  );

  -- ========================================
  -- 8. UPDATE RECURRING EXPENSE
  -- Advance next_occurrence, update last_created_at
  -- Deactivate if past end_date
  -- ========================================
  UPDATE recurring_expenses
  SET
    next_occurrence = v_next_date,
    last_created_at = NOW(),
    updated_at = NOW(),
    is_active = CASE
      WHEN v_recurring.end_date IS NOT NULL AND v_next_date > v_recurring.end_date
      THEN false
      ELSE is_active
    END
  WHERE id = p_recurring_expense_id;

  -- ========================================
  -- 9. RETURN RESULT
  -- ========================================
  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'instance_id', v_instance_id,
    'recurring_id', p_recurring_expense_id,
    'cycle_date', p_cycle_date,
    'next_occurrence', v_next_date,
    'deactivated', (v_recurring.end_date IS NOT NULL AND v_next_date > v_recurring.end_date),
    'prepaid_consumed', v_consume_result,
    'generated_at', NOW()
  );

EXCEPTION WHEN unique_violation THEN
  -- Idempotency: concurrent execution tried to create same instance
  RETURN jsonb_build_object(
    'success', true,
    'skipped', true,
    'reason', 'Concurrent duplicate prevented by unique constraint',
    'recurring_id', p_recurring_expense_id,
    'cycle_date', p_cycle_date
  );
END;
$fn$;

COMMENT ON FUNCTION process_single_recurring_instance(UUID, DATE) IS
'Atomically creates one expense instance for a recurring expense cycle.
Handles: idempotency, payer auto-settlement, prepaid consumption, next_occurrence advancement.
Parameters:
  - p_recurring_expense_id: The recurring expense to process
  - p_cycle_date: The cycle date for this instance
Returns: JSONB with instance details or skip reason';

GRANT EXECUTE ON FUNCTION process_single_recurring_instance(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION process_single_recurring_instance(UUID, DATE) TO authenticated;

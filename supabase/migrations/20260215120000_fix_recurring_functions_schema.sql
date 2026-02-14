-- Migration: Fix recurring expense functions to match actual schema
-- Description: 
--   1. Add last_created_at column to recurring_expenses
--   2. Fix get_due_recurring_expenses() to JOIN expenses for context fields
--   3. Fix process_single_recurring_instance() to use template's created_by
--   4. Update frequency CHECK constraint to include all valid values

-- ========================================
-- SECTION 1: Add last_created_at column to recurring_expenses
-- Tracks when the last instance was auto-generated
-- ========================================

ALTER TABLE recurring_expenses
ADD COLUMN IF NOT EXISTS last_created_at TIMESTAMPTZ;

COMMENT ON COLUMN recurring_expenses.last_created_at IS
'Timestamp of the last auto-generated instance. Used for audit tracking.';

-- ========================================
-- SECTION 2: Update frequency CHECK constraint
-- Add bi_weekly, quarterly, custom to allowed values
-- ========================================

ALTER TABLE recurring_expenses
DROP CONSTRAINT IF EXISTS recurring_expenses_frequency_check;

ALTER TABLE recurring_expenses
ADD CONSTRAINT recurring_expenses_frequency_check
CHECK (frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly', 'custom'));

-- ========================================
-- SECTION 3: Fix get_due_recurring_expenses()
-- JOIN with expenses table to get context_type, group_id, friendship_id, created_by
-- These columns live on the template expense, not on recurring_expenses
-- ========================================

-- Drop existing function first (return type may differ)
DROP FUNCTION IF EXISTS get_due_recurring_expenses();

CREATE OR REPLACE FUNCTION get_due_recurring_expenses()
RETURNS TABLE (
  id UUID,
  template_expense_id UUID,
  frequency TEXT,
  interval_value INTEGER,
  next_occurrence DATE,
  context_type TEXT,
  group_id UUID,
  friendship_id UUID,
  created_by UUID,
  prepaid_until DATE,
  end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.template_expense_id,
    re.frequency,
    re.interval,
    re.next_occurrence,
    e.context_type,
    e.group_id,
    e.friendship_id,
    e.created_by,
    re.prepaid_until,
    re.end_date
  FROM recurring_expenses re
  JOIN expenses e ON re.template_expense_id = e.id
  WHERE re.is_active = TRUE
    AND re.next_occurrence <= CURRENT_DATE
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE);
END;
$$;

COMMENT ON FUNCTION get_due_recurring_expenses() IS
'Get all recurring expenses due for processing.
JOINs with expenses table to get context_type, group_id, friendship_id, created_by
from the template expense (these fields do not exist on recurring_expenses).';

GRANT EXECUTE ON FUNCTION get_due_recurring_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_recurring_expenses() TO service_role;

-- ========================================
-- SECTION 4: Fix calculate_next_occurrence()
-- Add support for bi_weekly, quarterly, custom frequencies
-- ========================================

CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_interval_value INT
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN RETURN p_current_date + (p_interval_value * INTERVAL '1 day');
    WHEN 'weekly' THEN RETURN p_current_date + (p_interval_value * INTERVAL '1 week');
    WHEN 'bi_weekly' THEN RETURN p_current_date + (p_interval_value * 2 * INTERVAL '1 week');
    WHEN 'monthly' THEN RETURN p_current_date + (p_interval_value * INTERVAL '1 month');
    WHEN 'quarterly' THEN RETURN p_current_date + (p_interval_value * 3 * INTERVAL '1 month');
    WHEN 'yearly' THEN RETURN p_current_date + (p_interval_value * INTERVAL '1 year');
    WHEN 'custom' THEN RETURN p_current_date + (p_interval_value * INTERVAL '1 day');
    ELSE RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;
END;
$$;

COMMENT ON FUNCTION calculate_next_occurrence(DATE, TEXT, INT) IS
'Calculate next occurrence date based on frequency and interval.
Supports: daily, weekly, bi_weekly, monthly, quarterly, yearly, custom.
Custom uses interval as days.';

GRANT EXECUTE ON FUNCTION calculate_next_occurrence(DATE, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_occurrence(DATE, TEXT, INT) TO service_role;

-- ========================================
-- SECTION 5: Fix process_single_recurring_instance()
-- Use template expense's created_by instead of recurring's (which doesn't exist)
-- This is a CREATE OR REPLACE to ensure the fix is applied
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
  -- 1. IDEMPOTENCY CHECK
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

  -- 2. LOCK AND FETCH RECURRING EXPENSE
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

  IF NOT v_recurring.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Recurring expense is inactive',
      'recurring_id', p_recurring_expense_id
    );
  END IF;

  -- 3. FETCH TEMPLATE EXPENSE
  SELECT * INTO v_template
  FROM expenses
  WHERE id = v_recurring.template_expense_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template expense not found: ' || v_recurring.template_expense_id
    );
  END IF;

  -- 4. CREATE EXPENSE INSTANCE
  -- Uses v_template.created_by (from expenses table, not recurring_expenses)
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

  -- 5. COPY SPLITS FROM TEMPLATE (auto-settle payer's own split)
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
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN true ELSE false END,
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN es.computed_amount ELSE 0 END,
    CASE WHEN es.user_id = v_template.paid_by_user_id THEN NOW() ELSE NULL END
  FROM expense_splits es
  WHERE es.expense_id = v_recurring.template_expense_id;

  -- 6. CONSUME PREPAID BALANCES
  v_consume_result := consume_prepaid_for_instance(v_instance_id);

  -- 7. CALCULATE NEXT OCCURRENCE
  v_next_date := calculate_next_occurrence(
    p_cycle_date,
    v_recurring.frequency,
    v_recurring.interval
  );

  -- 8. UPDATE RECURRING EXPENSE
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

  -- 9. RETURN RESULT
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
Uses template expense created_by (not recurring_expenses which lacks this column).';

GRANT EXECUTE ON FUNCTION process_single_recurring_instance(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION process_single_recurring_instance(UUID, DATE) TO authenticated;

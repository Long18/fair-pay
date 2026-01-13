-- Migration: Recurring Prepaid Payment Functions
-- Description: Add SQL functions for prepaid payment calculations and recording
-- Requirements: 1.3, 1.4, 2.1, 4.2, 6.2, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5

-- ========================================
-- SECTION 1: calculate_prepaid_until FUNCTION
-- Calculate the prepaid_until date based on periods, frequency, and interval
-- Handles month-end edge cases and leap years
-- Requirements: 1.3, 7.1, 7.2, 7.3, 7.4
-- ========================================

CREATE OR REPLACE FUNCTION calculate_prepaid_until(
  p_start_date DATE,
  p_periods_count INTEGER,
  p_frequency TEXT,
  p_interval_value INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result DATE := p_start_date;
  v_i INTEGER;
  v_target_day INTEGER;
  v_last_day_of_month INTEGER;
BEGIN
  -- Validate inputs
  IF p_periods_count < 1 THEN
    RAISE EXCEPTION 'Period count must be at least 1';
  END IF;
  
  IF p_interval_value < 1 THEN
    RAISE EXCEPTION 'Interval must be at least 1';
  END IF;
  
  -- Store the original day of month for month-end handling
  v_target_day := EXTRACT(DAY FROM p_start_date)::INTEGER;
  
  -- Calculate the prepaid_until date by advancing N periods
  FOR v_i IN 1..p_periods_count LOOP
    CASE p_frequency
      WHEN 'daily' THEN
        v_result := v_result + (p_interval_value * INTERVAL '1 day');
      
      WHEN 'weekly' THEN
        v_result := v_result + (p_interval_value * INTERVAL '1 week');
      
      WHEN 'monthly' THEN
        -- Add months and handle month-end edge cases
        v_result := v_result + (p_interval_value * INTERVAL '1 month');
        
        -- Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
        -- If original day was higher than current month's last day, adjust
        v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_result) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;
        
        IF v_target_day > v_last_day_of_month THEN
          -- Adjust to last day of the month
          v_result := DATE_TRUNC('month', v_result) + (v_last_day_of_month - 1) * INTERVAL '1 day';
        ELSIF EXTRACT(DAY FROM v_result)::INTEGER != v_target_day AND v_target_day <= v_last_day_of_month THEN
          -- Try to restore original day if possible
          v_result := DATE_TRUNC('month', v_result) + (v_target_day - 1) * INTERVAL '1 day';
        END IF;
      
      WHEN 'yearly' THEN
        -- Add years and handle leap year edge cases (Feb 29 -> Feb 28)
        v_result := v_result + (p_interval_value * INTERVAL '1 year');
        
        -- Handle Feb 29 -> Feb 28 for non-leap years
        IF EXTRACT(MONTH FROM p_start_date) = 2 AND v_target_day = 29 THEN
          v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_result) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;
          IF v_last_day_of_month < 29 THEN
            v_result := DATE_TRUNC('month', v_result) + (v_last_day_of_month - 1) * INTERVAL '1 day';
          END IF;
        END IF;
      
      ELSE
        RAISE EXCEPTION 'Invalid frequency: %. Valid values are: daily, weekly, monthly, yearly', p_frequency;
    END CASE;
  END LOOP;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION calculate_prepaid_until(DATE, INTEGER, TEXT, INTEGER) IS 
'Calculate the prepaid_until date by advancing N periods from start_date.
Handles month-end edge cases (Jan 31 -> Feb 28) and leap years (Feb 29 -> Feb 28).
Parameters:
  - p_start_date: The starting date for calculation
  - p_periods_count: Number of periods to advance (must be >= 1)
  - p_frequency: One of daily, weekly, monthly, yearly
  - p_interval_value: Interval multiplier (e.g., 2 for bi-weekly)
Returns: The calculated prepaid_until date';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_prepaid_until(DATE, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_prepaid_until(DATE, INTEGER, TEXT, INTEGER) TO service_role;


-- ========================================
-- SECTION 2: record_prepaid_payment FUNCTION
-- Record a prepaid payment for a recurring expense
-- Requirements: 1.3, 1.4, 2.1, 4.2, 7.5
-- ========================================

CREATE OR REPLACE FUNCTION record_prepaid_payment(
  p_recurring_expense_id UUID,
  p_periods_count INTEGER,
  p_amount DECIMAL(12, 2)
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_recurring RECORD;
  v_template_expense RECORD;
  v_coverage_from DATE;
  v_coverage_to DATE;
  v_expense_id UUID;
  v_payment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate periods count
  IF p_periods_count < 1 THEN
    RAISE EXCEPTION 'Period count must be at least 1';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  -- Get recurring expense with lock to prevent concurrent updates
  SELECT re.* INTO v_recurring
  FROM recurring_expenses re
  WHERE re.id = p_recurring_expense_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring expense not found';
  END IF;
  
  -- Get template expense to verify ownership and get expense details
  SELECT e.* INTO v_template_expense
  FROM expenses e
  WHERE e.id = v_recurring.template_expense_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template expense not found';
  END IF;
  
  -- Verify user owns this recurring expense
  IF v_template_expense.created_by != v_user_id THEN
    RAISE EXCEPTION 'You do not have permission to record prepaid payments for this recurring expense';
  END IF;
  
  -- Check if recurring expense is active
  IF NOT v_recurring.is_active THEN
    RAISE EXCEPTION 'Cannot record prepaid payment for inactive recurring expense';
  END IF;
  
  -- Calculate coverage period
  -- If already has prepaid coverage that's still valid, extend from there
  IF v_recurring.prepaid_until IS NOT NULL AND v_recurring.prepaid_until > CURRENT_DATE THEN
    v_coverage_from := v_recurring.prepaid_until;
  ELSE
    -- Start from next_occurrence
    v_coverage_from := v_recurring.next_occurrence;
  END IF;
  
  -- Calculate coverage_to using the calculate_prepaid_until function
  v_coverage_to := calculate_prepaid_until(
    v_coverage_from,
    p_periods_count,
    v_recurring.frequency,
    v_recurring.interval
  );
  
  -- Cap at end_date if exists (Requirement 7.5)
  IF v_recurring.end_date IS NOT NULL AND v_coverage_to > v_recurring.end_date THEN
    v_coverage_to := v_recurring.end_date;
  END IF;
  
  -- Create expense record for the prepaid amount
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
    created_by
  )
  SELECT
    v_template_expense.description || ' (Prepaid ' || p_periods_count || ' periods)',
    p_amount,
    v_template_expense.currency,
    v_template_expense.category,
    CURRENT_DATE,
    v_template_expense.paid_by_user_id,
    false,
    v_template_expense.context_type,
    v_template_expense.group_id,
    v_template_expense.friendship_id,
    v_user_id
  RETURNING id INTO v_expense_id;
  
  -- Copy expense splits from template expense
  INSERT INTO expense_splits (
    expense_id,
    user_id,
    split_method,
    split_value,
    computed_amount,
    is_settled,
    settled_amount
  )
  SELECT
    v_expense_id,
    es.user_id,
    es.split_method,
    -- Scale split_value proportionally for the prepaid amount
    CASE 
      WHEN es.split_method = 'percentage' THEN es.split_value
      WHEN es.split_method = 'exact' THEN (es.split_value / v_template_expense.amount) * p_amount
      ELSE es.split_value
    END,
    -- Scale computed_amount proportionally
    (es.computed_amount / v_template_expense.amount) * p_amount,
    false,
    0
  FROM expense_splits es
  WHERE es.expense_id = v_recurring.template_expense_id;
  
  -- Create prepaid payment record
  INSERT INTO recurring_prepaid_payments (
    recurring_expense_id,
    payment_date,
    periods_covered,
    amount,
    coverage_from,
    coverage_to,
    expense_id,
    created_by
  ) VALUES (
    p_recurring_expense_id,
    CURRENT_DATE,
    p_periods_count,
    p_amount,
    v_coverage_from,
    v_coverage_to,
    v_expense_id,
    v_user_id
  )
  RETURNING id INTO v_payment_id;
  
  -- Update recurring expense prepaid_until
  UPDATE recurring_expenses
  SET 
    prepaid_until = v_coverage_to,
    last_prepaid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_recurring_expense_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'expense_id', v_expense_id,
    'coverage_from', v_coverage_from,
    'coverage_to', v_coverage_to,
    'prepaid_until', v_coverage_to,
    'periods_covered', p_periods_count,
    'amount', p_amount
  );
END;
$$;

COMMENT ON FUNCTION record_prepaid_payment(UUID, INTEGER, DECIMAL) IS 
'Record a prepaid payment for a recurring expense.
Creates an expense record for the prepaid amount and updates the recurring expense prepaid_until date.
Parameters:
  - p_recurring_expense_id: The recurring expense to prepay
  - p_periods_count: Number of periods to prepay (must be >= 1)
  - p_amount: Total prepaid amount
Returns: JSONB with payment details including payment_id, expense_id, coverage dates';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_prepaid_payment(UUID, INTEGER, DECIMAL) TO authenticated;


-- ========================================
-- SECTION 3: get_prepaid_payment_history FUNCTION
-- Get prepaid payment history for a recurring expense
-- Requirements: 6.2, 6.4, 6.5
-- ========================================

CREATE OR REPLACE FUNCTION get_prepaid_payment_history(
  p_recurring_expense_id UUID
)
RETURNS TABLE (
  id UUID,
  payment_date DATE,
  periods_covered INTEGER,
  amount DECIMAL(12, 2),
  coverage_from DATE,
  coverage_to DATE,
  expense_id UUID,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  total_prepaid_amount DECIMAL(12, 2)
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_total_amount DECIMAL(12, 2);
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify user has access to this recurring expense
  IF NOT EXISTS (
    SELECT 1 
    FROM recurring_expenses re
    JOIN expenses e ON re.template_expense_id = e.id
    WHERE re.id = p_recurring_expense_id
      AND e.created_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'Recurring expense not found or access denied';
  END IF;
  
  -- Calculate total prepaid amount
  SELECT COALESCE(SUM(rpp.amount), 0)
  INTO v_total_amount
  FROM recurring_prepaid_payments rpp
  WHERE rpp.recurring_expense_id = p_recurring_expense_id;
  
  -- Return payment history ordered by payment_date descending
  RETURN QUERY
  SELECT
    rpp.id AS id,
    rpp.payment_date AS payment_date,
    rpp.periods_covered AS periods_covered,
    rpp.amount AS amount,
    rpp.coverage_from AS coverage_from,
    rpp.coverage_to AS coverage_to,
    rpp.expense_id AS expense_id,
    rpp.created_by AS created_by,
    p.full_name AS created_by_name,
    rpp.created_at AS created_at,
    v_total_amount AS total_prepaid_amount
  FROM recurring_prepaid_payments rpp
  JOIN profiles p ON rpp.created_by = p.id
  WHERE rpp.recurring_expense_id = p_recurring_expense_id
  ORDER BY rpp.payment_date DESC, rpp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_prepaid_payment_history(UUID) IS 
'Get the prepaid payment history for a recurring expense.
Returns all prepaid payments ordered by payment_date descending.
Each row includes the total_prepaid_amount for convenience.
Parameters:
  - p_recurring_expense_id: The recurring expense to get history for
Returns: Table of prepaid payments with creator details and total amount';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_prepaid_payment_history(UUID) TO authenticated;


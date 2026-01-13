-- Migration: Add paid_by_user_id parameter to record_prepaid_payment
-- Description: Allow specifying who pays for the prepaid payment
-- This enables users to choose a different payer than the template expense payer

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS record_prepaid_payment(UUID, INTEGER, DECIMAL);

-- Recreate function with optional paid_by_user_id parameter
CREATE OR REPLACE FUNCTION record_prepaid_payment(
  p_recurring_expense_id UUID,
  p_periods_count INTEGER,
  p_amount DECIMAL(12, 2),
  p_paid_by_user_id UUID DEFAULT NULL
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
  v_actual_payer_id UUID;
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
  
  -- Determine the actual payer (use provided or default to template payer)
  v_actual_payer_id := COALESCE(p_paid_by_user_id, v_template_expense.paid_by_user_id);
  
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
  
  -- Create expense record for the prepaid amount with the selected payer
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
    v_actual_payer_id,  -- Use the selected payer
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
    -- Auto-settle the payer's split
    CASE WHEN es.user_id = v_actual_payer_id THEN true ELSE false END,
    CASE WHEN es.user_id = v_actual_payer_id THEN (es.computed_amount / v_template_expense.amount) * p_amount ELSE 0 END
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
    'amount', p_amount,
    'paid_by_user_id', v_actual_payer_id
  );
END;
$$;

COMMENT ON FUNCTION record_prepaid_payment(UUID, INTEGER, DECIMAL, UUID) IS 
'Record a prepaid payment for a recurring expense.
Creates an expense record for the prepaid amount and updates the recurring expense prepaid_until date.
Parameters:
  - p_recurring_expense_id: The recurring expense to prepay
  - p_periods_count: Number of periods to prepay (must be >= 1)
  - p_amount: Total prepaid amount
  - p_paid_by_user_id: (Optional) Who pays for this prepaid expense. Defaults to template expense payer.
Returns: JSONB with payment details including payment_id, expense_id, coverage dates, paid_by_user_id';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_prepaid_payment(UUID, INTEGER, DECIMAL, UUID) TO authenticated;

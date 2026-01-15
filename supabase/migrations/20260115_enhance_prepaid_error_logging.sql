-- Enhanced error logging for prepaid functions
-- This helps diagnose why prepaid recording might fail

-- Update record_member_prepaid to provide more detailed error messages
CREATE OR REPLACE FUNCTION record_member_prepaid(
  p_recurring_expense_id UUID,
  p_user_id UUID,
  p_months INTEGER,
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_monthly_share DECIMAL(12, 2);
  v_amount DECIMAL(12, 2);
  v_currency VARCHAR(3);
  v_template RECORD;
  v_expense_id UUID;
  v_payment_id UUID;
  v_new_balance DECIMAL(12, 2);
  v_current_user UUID;
BEGIN
  -- Authentication check
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate months
  IF p_months < 1 THEN
    RAISE EXCEPTION 'Months must be at least 1, got: %', p_months;
  END IF;

  -- Verify recurring expense exists
  IF NOT EXISTS (SELECT 1 FROM recurring_expenses WHERE id = p_recurring_expense_id) THEN
    RAISE EXCEPTION 'Recurring expense not found: %', p_recurring_expense_id;
  END IF;

  -- Get member monthly share from template
  v_monthly_share := get_member_monthly_share(p_recurring_expense_id, p_user_id);

  IF v_monthly_share IS NULL OR v_monthly_share <= 0 THEN
    RAISE EXCEPTION 'Member % not found in recurring expense % splits or share is 0. Monthly share calculated: %',
      p_user_id, p_recurring_expense_id, v_monthly_share;
  END IF;

  -- Calculate prepaid amount
  v_amount := v_monthly_share * p_months;

  -- Get template expense details
  SELECT
    e.currency,
    e.description,
    e.group_id,
    e.friendship_id,
    e.context_type,
    e.category
  INTO
    v_currency,
    v_template.description,
    v_template.group_id,
    v_template.friendship_id,
    v_template.context_type,
    v_template.category
  FROM recurring_expenses re
  JOIN expenses e ON re.template_expense_id = e.id
  WHERE re.id = p_recurring_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template expense not found for recurring expense: %', p_recurring_expense_id;
  END IF;

  -- Create expense record for prepaid payment
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
  ) VALUES (
    v_template.description || ' (Prepaid ' || p_months || ' month' ||
      CASE WHEN p_months > 1 THEN 's' ELSE '' END || ' for member)',
    v_amount,
    v_currency,
    v_template.category,
    CURRENT_DATE,
    COALESCE(p_paid_by_user_id, p_user_id),
    false, -- is_payment
    v_template.context_type,
    v_template.group_id,
    v_template.friendship_id,
    v_current_user
  ) RETURNING id INTO v_expense_id;

  -- Create single expense split for the member who this prepaid is for
  INSERT INTO expense_splits (
    expense_id,
    user_id,
    split_method,
    computed_amount,
    is_settled,
    settled_amount
  ) VALUES (
    v_expense_id,
    p_user_id,
    'exact',
    v_amount,
    true, -- Mark as settled since it's prepaid
    v_amount
  );

  -- Create prepaid payment record
  INSERT INTO recurring_prepaid_payments (
    recurring_expense_id,
    user_id,
    paid_by_user_id,
    payment_date,
    periods_covered,
    amount,
    coverage_from,
    coverage_to,
    expense_id,
    created_by
  ) VALUES (
    p_recurring_expense_id,
    p_user_id,
    COALESCE(p_paid_by_user_id, p_user_id),
    CURRENT_DATE,
    p_months,
    v_amount,
    CURRENT_DATE,
    CURRENT_DATE + (p_months || ' months')::INTERVAL,
    v_expense_id,
    v_current_user
  ) RETURNING id INTO v_payment_id;

  -- Upsert member prepaid balance
  INSERT INTO member_prepaid_balances (
    recurring_expense_id,
    user_id,
    balance_amount,
    monthly_share_amount,
    currency
  ) VALUES (
    p_recurring_expense_id,
    p_user_id,
    v_amount,
    v_monthly_share,
    v_currency
  )
  ON CONFLICT (recurring_expense_id, user_id)
  DO UPDATE SET
    balance_amount = member_prepaid_balances.balance_amount + EXCLUDED.balance_amount,
    updated_at = NOW()
  RETURNING balance_amount INTO v_new_balance;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'expense_id', v_expense_id,
    'user_id', p_user_id,
    'months', p_months,
    'amount', v_amount,
    'monthly_share', v_monthly_share,
    'new_balance', v_new_balance,
    'currency', v_currency
  );
END;
$$;

COMMENT ON FUNCTION record_member_prepaid(UUID, UUID, INTEGER, UUID) IS
'Record prepaid payment for a single member with enhanced error messages. Creates expense, prepaid payment record, and updates/creates member balance.';

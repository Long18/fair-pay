-- Migration: Per-Member Prepaid Functions
-- Description: SQL functions for per-member prepaid operations
-- Requirements: Calculate shares, record prepaid, consume prepaid, query info

-- ========================================
-- FUNCTION 1: get_member_monthly_share
-- Calculate member's monthly share from template expense splits
-- ========================================

CREATE OR REPLACE FUNCTION get_member_monthly_share(
  p_recurring_expense_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_template_expense_id UUID;
  v_monthly_share DECIMAL(12, 2);
BEGIN
  -- Get template expense id
  SELECT template_expense_id INTO v_template_expense_id
  FROM recurring_expenses
  WHERE id = p_recurring_expense_id;

  IF v_template_expense_id IS NULL THEN
    RAISE EXCEPTION 'Recurring expense not found: %', p_recurring_expense_id;
  END IF;

  -- Get member's share from template splits
  SELECT computed_amount INTO v_monthly_share
  FROM expense_splits
  WHERE expense_id = v_template_expense_id
    AND user_id = p_user_id;

  -- Return 0 if member not found in splits (valid case)
  RETURN COALESCE(v_monthly_share, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_monthly_share(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_monthly_share(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_member_monthly_share(UUID, UUID) IS
'Calculate member monthly share from template expense splits. Returns 0 if member not in splits.';

-- ========================================
-- FUNCTION 2: record_member_prepaid
-- Record prepaid payment for a single member
-- ========================================

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

  -- Get member monthly share from template
  v_monthly_share := get_member_monthly_share(p_recurring_expense_id, p_user_id);

  IF v_monthly_share <= 0 THEN
    RAISE EXCEPTION 'Member % not found in recurring expense % splits or share is 0',
      p_user_id, p_recurring_expense_id;
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

GRANT EXECUTE ON FUNCTION record_member_prepaid(UUID, UUID, INTEGER, UUID) TO authenticated;

COMMENT ON FUNCTION record_member_prepaid(UUID, UUID, INTEGER, UUID) IS
'Record prepaid payment for a single member. Creates expense, prepaid payment record, and updates/creates member balance.';

-- ========================================
-- FUNCTION 3: record_multi_member_prepaid
-- Record prepaid for multiple members in one transaction
-- ========================================

CREATE OR REPLACE FUNCTION record_multi_member_prepaid(
  p_recurring_expense_id UUID,
  p_member_months JSONB, -- [{"user_id": "uuid", "months": 5}, ...]
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_result JSONB;
  v_payments JSONB := '[]'::JSONB;
  v_total_amount DECIMAL(12, 2) := 0;
  v_success_count INTEGER := 0;
  v_error_messages TEXT[] := '{}';
BEGIN
  -- Validate input
  IF p_member_months IS NULL OR jsonb_array_length(p_member_months) = 0 THEN
    RAISE EXCEPTION 'member_months array cannot be empty';
  END IF;

  -- Iterate through member_months array
  FOR v_member IN
    SELECT
      (item->>'user_id')::UUID AS user_id,
      (item->>'months')::INTEGER AS months
    FROM jsonb_array_elements(p_member_months) AS item
  LOOP
    BEGIN
      -- Record prepaid for each member
      v_result := record_member_prepaid(
        p_recurring_expense_id,
        v_member.user_id,
        v_member.months,
        p_paid_by_user_id
      );

      -- Accumulate results
      v_payments := v_payments || jsonb_build_object(
        'user_id', v_member.user_id,
        'months', v_member.months,
        'amount', v_result->>'amount',
        'new_balance', v_result->>'new_balance',
        'success', true
      );

      v_total_amount := v_total_amount + (v_result->>'amount')::DECIMAL(12, 2);
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other members
      v_error_messages := array_append(v_error_messages,
        'Member ' || v_member.user_id || ': ' || SQLERRM);

      v_payments := v_payments || jsonb_build_object(
        'user_id', v_member.user_id,
        'months', v_member.months,
        'success', false,
        'error', SQLERRM
      );
    END;
  END LOOP;

  -- Return aggregated results
  RETURN jsonb_build_object(
    'success', v_success_count > 0,
    'payments', v_payments,
    'total_amount', v_total_amount,
    'success_count', v_success_count,
    'error_count', array_length(v_error_messages, 1),
    'errors', CASE
      WHEN array_length(v_error_messages, 1) > 0
      THEN array_to_json(v_error_messages)
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_multi_member_prepaid(UUID, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION record_multi_member_prepaid(UUID, JSONB, UUID) IS
'Record prepaid for multiple members in one transaction. Continues on error for individual members.';

-- ========================================
-- FUNCTION 4: consume_prepaid_for_instance
-- Automatically consume prepaid when recurring instance generated
-- ========================================

CREATE OR REPLACE FUNCTION consume_prepaid_for_instance(
  p_expense_instance_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_recurring_id UUID;
  v_split RECORD;
  v_balance RECORD;
  v_amount_to_consume DECIMAL(12, 2);
  v_consumptions JSONB := '[]'::JSONB;
  v_total_consumed DECIMAL(12, 2) := 0;
  v_member_count INTEGER := 0;
BEGIN
  -- Get recurring expense id from instance
  -- Check if this expense is a recurring instance
  SELECT recurring_expense_id INTO v_recurring_id
  FROM expenses
  WHERE id = p_expense_instance_id;

  -- If not a recurring instance, skip
  IF v_recurring_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'instance_id', p_expense_instance_id,
      'consumptions', '[]'::JSONB,
      'total_consumed', 0,
      'message', 'Not a recurring instance'
    );
  END IF;

  -- Process each split in the instance
  FOR v_split IN
    SELECT user_id, computed_amount, id AS split_id
    FROM expense_splits
    WHERE expense_id = p_expense_instance_id
  LOOP
    -- Get member prepaid balance (lock for update)
    SELECT * INTO v_balance
    FROM member_prepaid_balances
    WHERE recurring_expense_id = v_recurring_id
      AND user_id = v_split.user_id
      AND balance_amount > 0
    FOR UPDATE;

    IF FOUND THEN
      -- Determine amount to consume (min of balance and split amount)
      v_amount_to_consume := LEAST(v_balance.balance_amount, v_split.computed_amount);

      -- Update split (mark as settled if fully covered)
      UPDATE expense_splits
      SET
        is_settled = (v_amount_to_consume >= v_split.computed_amount),
        settled_amount = v_amount_to_consume
      WHERE id = v_split.split_id;

      -- Update balance
      UPDATE member_prepaid_balances
      SET
        balance_amount = balance_amount - v_amount_to_consume,
        updated_at = NOW()
      WHERE recurring_expense_id = v_recurring_id
        AND user_id = v_split.user_id;

      -- Log consumption
      INSERT INTO prepaid_consumption_log (
        recurring_expense_id,
        expense_instance_id,
        user_id,
        amount_consumed,
        balance_before,
        balance_after
      ) VALUES (
        v_recurring_id,
        p_expense_instance_id,
        v_split.user_id,
        v_amount_to_consume,
        v_balance.balance_amount,
        v_balance.balance_amount - v_amount_to_consume
      );

      -- Accumulate result
      v_consumptions := v_consumptions || jsonb_build_object(
        'user_id', v_split.user_id,
        'amount', v_amount_to_consume,
        'fully_covered', (v_amount_to_consume >= v_split.computed_amount),
        'balance_before', v_balance.balance_amount,
        'balance_after', v_balance.balance_amount - v_amount_to_consume
      );

      v_total_consumed := v_total_consumed + v_amount_to_consume;
      v_member_count := v_member_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'instance_id', p_expense_instance_id,
    'recurring_id', v_recurring_id,
    'consumptions', v_consumptions,
    'total_consumed', v_total_consumed,
    'member_count', v_member_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consume_prepaid_for_instance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_prepaid_for_instance(UUID) TO service_role;

COMMENT ON FUNCTION consume_prepaid_for_instance(UUID) IS
'Automatically consume prepaid balances when a recurring instance is generated. Marks splits as settled and logs consumption.';

-- ========================================
-- FUNCTION 5: get_all_members_prepaid_info
-- Get comprehensive prepaid info for all members in a recurring expense
-- ========================================

CREATE OR REPLACE FUNCTION get_all_members_prepaid_info(
  p_recurring_expense_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  balance_amount DECIMAL(12, 2),
  monthly_share DECIMAL(12, 2),
  months_remaining INTEGER,
  currency VARCHAR(3),
  total_prepaid DECIMAL(12, 2),
  payment_count INTEGER
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.user_id,
    p.full_name AS user_name,
    COALESCE(mpb.balance_amount, 0) AS balance_amount,
    es.computed_amount AS monthly_share,
    COALESCE(mpb.months_remaining, 0) AS months_remaining,
    COALESCE(mpb.currency, e.currency) AS currency,
    COALESCE(
      (SELECT SUM(amount) FROM recurring_prepaid_payments
       WHERE recurring_expense_id = p_recurring_expense_id
         AND user_id = es.user_id),
      0
    ) AS total_prepaid,
    COALESCE(
      (SELECT COUNT(*) FROM recurring_prepaid_payments
       WHERE recurring_expense_id = p_recurring_expense_id
         AND user_id = es.user_id),
      0
    )::INTEGER AS payment_count
  FROM recurring_expenses re
  JOIN expenses e ON re.template_expense_id = e.id
  JOIN expense_splits es ON e.id = es.expense_id
  JOIN profiles p ON es.user_id = p.id
  LEFT JOIN member_prepaid_balances mpb
    ON mpb.recurring_expense_id = p_recurring_expense_id
    AND mpb.user_id = es.user_id
  WHERE re.id = p_recurring_expense_id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_members_prepaid_info(UUID) TO authenticated;

COMMENT ON FUNCTION get_all_members_prepaid_info(UUID) IS
'Get comprehensive prepaid information for all members in a recurring expense. Includes balances, shares, and payment history.';

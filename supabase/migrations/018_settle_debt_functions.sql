-- Migration: Settle Debt Functions
-- Purpose: Allow authenticated users to mark debts as paid
-- Date: 2025-12-28

-- Function to settle specific expense (mark single expense as paid)
CREATE OR REPLACE FUNCTION settle_expense(
    p_expense_id uuid
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
    v_expense expenses%ROWTYPE;
    v_amount decimal;
    v_description text;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get expense details
    SELECT * INTO v_expense
    FROM expenses
    WHERE id = p_expense_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;

    -- Check if user is the payer
    IF v_expense.paid_by_user_id != v_user_id THEN
        RAISE EXCEPTION 'Only the payer can settle this expense';
    END IF;

    -- Check if already paid
    IF v_expense.is_payment = true THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Expense is already marked as paid'
        );
    END IF;

    -- Mark as paid
    UPDATE expenses
    SET
        is_payment = true,
        updated_at = NOW()
    WHERE id = p_expense_id;

    v_amount := v_expense.amount;
    v_description := v_expense.description;

    RETURN json_build_object(
        'success', true,
        'expense_id', p_expense_id,
        'amount', v_amount,
        'description', v_description,
        'message', format('Marked "%s" (₫%s) as paid', v_description, v_amount)
    );
END;
$$;

-- Function to settle individual debt (mark as paid)
CREATE OR REPLACE FUNCTION settle_individual_debt(
    p_counterparty_id uuid,
    p_amount decimal
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
    v_settled_count integer := 0;
    v_payment_id uuid;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Mark all matching unpaid expenses as paid
    -- These are expenses where:
    -- 1. paid_by_user_id = current user (I paid)
    -- 2. expense_splits.user_id = counterparty (they owe me)
    -- 3. is_payment = false (unpaid)
    UPDATE expenses e
    SET
        is_payment = true,
        updated_at = NOW()
    FROM expense_splits es
    WHERE e.id = es.expense_id
      AND e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false
      AND es.computed_amount <= p_amount;

    GET DIAGNOSTICS v_settled_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'settled_count', v_settled_count,
        'message', format('Settled %s debt(s) with %s', v_settled_count,
            (SELECT full_name FROM profiles WHERE id = p_counterparty_id))
    );
END;
$$;

-- Function to settle ALL debts with a specific person
CREATE OR REPLACE FUNCTION settle_all_debts_with_person(
    p_counterparty_id uuid
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
    v_settled_count integer := 0;
    v_total_amount decimal := 0;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Calculate total amount to settle
    SELECT COALESCE(SUM(es.computed_amount), 0)
    INTO v_total_amount
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false;

    -- Mark all unpaid expenses as paid
    UPDATE expenses e
    SET
        is_payment = true,
        updated_at = NOW()
    FROM expense_splits es
    WHERE e.id = es.expense_id
      AND e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false;

    GET DIAGNOSTICS v_settled_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'settled_count', v_settled_count,
        'total_amount', v_total_amount,
        'counterparty_name', (SELECT full_name FROM profiles WHERE id = p_counterparty_id),
        'message', format('Settled all debts (₫%s) with %s',
            v_total_amount,
            (SELECT full_name FROM profiles WHERE id = p_counterparty_id))
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION settle_expense(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_individual_debt(uuid, decimal) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_all_debts_with_person(uuid) TO authenticated;

COMMENT ON FUNCTION settle_expense IS
'Marks a specific expense as paid by changing is_payment from false to true. Only the payer can settle their own expenses.';

COMMENT ON FUNCTION settle_individual_debt IS
'Marks individual debt as paid by changing is_payment from false to true. Only authenticated users can settle their own debts.';

COMMENT ON FUNCTION settle_all_debts_with_person IS
'Settles all outstanding debts with a specific person. Converts all unpaid expenses to paid status.';

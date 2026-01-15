-- Fix: Ambiguous user_id column in get_all_members_prepaid_info function
-- Issue: Subqueries reference user_id without table qualification

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
      (SELECT SUM(rpp.amount) FROM recurring_prepaid_payments rpp
       WHERE rpp.recurring_expense_id = p_recurring_expense_id
         AND rpp.user_id = es.user_id),
      0
    ) AS total_prepaid,
    COALESCE(
      (SELECT COUNT(*) FROM recurring_prepaid_payments rpp
       WHERE rpp.recurring_expense_id = p_recurring_expense_id
         AND rpp.user_id = es.user_id),
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

COMMENT ON FUNCTION get_all_members_prepaid_info(UUID) IS
'Get comprehensive prepaid information for all members in a recurring expense. Includes balances, shares, and payment history. Fixed ambiguous column references.';

-- Migration: Add Historical Transactions View
-- Description: Creates a view that shows ALL debts including settled ones,
--              allowing users to see their transaction history even after settlement.
--
-- This complements the existing user_debts_summary view which only shows outstanding debts.

BEGIN;

-- Create a new view for historical debt relationships (includes settled debts)
CREATE OR REPLACE VIEW user_debts_history AS
SELECT
  es.user_id as owes_user,
  e.paid_by_user_id as owed_user,
  SUM(es.computed_amount) as total_amount,
  SUM(COALESCE(es.settled_amount, 0)) as settled_amount,
  SUM(
    CASE
      -- If fully settled, remaining debt is 0
      WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
      -- If partially settled, subtract settled amount
      WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
      -- If not settled, use full amount
      ELSE es.computed_amount
    END
  ) as remaining_amount,
  COUNT(DISTINCT e.id) as transaction_count,
  MAX(e.expense_date) as last_transaction_date
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
GROUP BY es.user_id, e.paid_by_user_id
HAVING SUM(es.computed_amount) > 0;  -- Only show if there was ever a debt

-- Create function to get user's debt history (includes settled debts)
CREATE OR REPLACE FUNCTION get_user_debts_history(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  total_amount NUMERIC,
  settled_amount NUMERIC,
  remaining_amount NUMERIC,
  i_owe_them BOOLEAN,
  transaction_count BIGINT,
  last_transaction_date DATE
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH debt_calculations AS (
    SELECT
      CASE
        WHEN owes_user = p_user_id THEN owed_user
        WHEN owed_user = p_user_id THEN owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN owes_user = p_user_id THEN total_amount
        WHEN owed_user = p_user_id THEN -total_amount
        ELSE 0
      END as signed_total_amount,
      CASE
        WHEN owes_user = p_user_id THEN settled_amount
        WHEN owed_user = p_user_id THEN -settled_amount
        ELSE 0
      END as signed_settled_amount,
      CASE
        WHEN owes_user = p_user_id THEN remaining_amount
        WHEN owed_user = p_user_id THEN -remaining_amount
        ELSE 0
      END as signed_remaining_amount,
      transaction_count,
      last_transaction_date
    FROM user_debts_history
    WHERE owes_user = p_user_id OR owed_user = p_user_id
  )
  SELECT
    dc.other_user_id,
    p.full_name,
    ABS(dc.signed_total_amount),
    ABS(dc.signed_settled_amount),
    ABS(dc.signed_remaining_amount),
    dc.signed_remaining_amount > 0 as i_owe_them,
    dc.transaction_count,
    dc.last_transaction_date
  FROM debt_calculations dc
  JOIN profiles p ON p.id = dc.other_user_id
  WHERE dc.other_user_id IS NOT NULL
  ORDER BY
    -- First show people with outstanding debts
    CASE WHEN dc.signed_remaining_amount != 0 THEN 0 ELSE 1 END,
    -- Then order by remaining amount (descending)
    ABS(dc.signed_remaining_amount) DESC,
    -- Then by last transaction date (most recent first)
    dc.last_transaction_date DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW user_debts_history IS 'Historical view of all debt relationships including settled debts';
COMMENT ON FUNCTION get_user_debts_history IS 'Returns all debt relationships for a user including settled debts, ordered by outstanding balance then recency';

COMMIT;


-- Migration: Filter zero-balance users from get_user_debts_aggregated
-- Date: 2026-02-06
-- Problem: Dashboard shows users with fully settled debts (remaining_amount = 0)
-- Solution: Add HAVING clause to exclude zero-balance counterparties at the SQL level
-- This ensures the backend never returns settled users, reducing payload size
-- and providing defense-in-depth alongside frontend filtering.

DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

CREATE OR REPLACE FUNCTION get_user_debts_aggregated(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_avatar_url TEXT,
  amount NUMERIC,
  currency TEXT,
  i_owe_them BOOLEAN,
  owed_to_name TEXT,
  owed_to_id UUID,
  total_amount NUMERIC,
  settled_amount NUMERIC,
  remaining_amount NUMERIC,
  transaction_count BIGINT,
  last_transaction_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_expenses AS (
    SELECT
      e.id,
      e.paid_by_user_id,
      e.group_id,
      e.description,
      e.amount,
      e.currency,
      e.expense_date,
      e.is_payment,
      e.created_at
    FROM expenses e
    WHERE
      (e.paid_by_user_id = p_user_id OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = p_user_id
      ))
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
      AND COALESCE(e.is_payment, false) = false
  ),
  debt_pairs AS (
    SELECT
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN es.user_id
        ELSE e.paid_by_user_id
      END as counterparty_id,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN COALESCE(pro.full_name, 'Unknown User')
        ELSE COALESCE(paid_by.full_name, 'Unknown User')
      END as counterparty_name,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN pro.avatar_url
        ELSE paid_by.avatar_url
      END as counterparty_avatar_url,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN es.computed_amount
        ELSE es.computed_amount
      END as amount,
      e.currency,
      (e.paid_by_user_id != p_user_id) as i_owe_them,
      COALESCE(paid_by.full_name, 'Unknown User') as owed_to_name,
      e.paid_by_user_id as owed_to_id,
      es.computed_amount as total_amount,
      COALESCE(es.settled_amount, 0) as settled_amount,
      COALESCE(es.computed_amount - COALESCE(es.settled_amount, 0), 0) as remaining_amount,
      1::BIGINT as transaction_count,
      e.expense_date::TIMESTAMPTZ as last_transaction_date
    FROM user_expenses e
    INNER JOIN expense_splits es ON e.id = es.expense_id
    LEFT JOIN profiles pro ON es.user_id = pro.id
    LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id
    WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
      AND es.user_id IS NOT NULL
  )
  SELECT
    dp.counterparty_id,
    MAX(dp.counterparty_name) as counterparty_name,
    MAX(dp.counterparty_avatar_url) as counterparty_avatar_url,
    SUM(dp.amount)::NUMERIC,
    dp.currency,
    MAX(dp.i_owe_them::int)::boolean,
    MAX(dp.owed_to_name),
    dp.owed_to_id,
    SUM(dp.total_amount)::NUMERIC,
    SUM(dp.settled_amount)::NUMERIC,
    SUM(dp.remaining_amount)::NUMERIC,
    COUNT(*)::BIGINT,
    MAX(dp.last_transaction_date)
  FROM debt_pairs dp
  WHERE dp.counterparty_id IS NOT NULL
  GROUP BY dp.counterparty_id, dp.currency, dp.owed_to_id
  HAVING SUM(dp.remaining_amount) != 0
  ORDER BY SUM(dp.amount) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Get aggregated debts for a user with only active (non-zero) balances. Fully settled counterparties are excluded. Optional date range filtering.';

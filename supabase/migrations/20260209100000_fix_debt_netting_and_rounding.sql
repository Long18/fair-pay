-- Migration: Fix debt netting (bilateral offset) and amount rounding
-- Date: 2026-02-09
-- Problem 1: Debts between two users shown separately instead of netted
--   Root cause: GROUP BY included owed_to_id, preventing bilateral offset
-- Problem 2: Amounts returned with decimals, VND should be whole numbers
-- Solution: Rewrite aggregation using signed amounts grouped by counterparty_id + currency only
--   Then take ABS of net amount and derive i_owe_them from sign

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
  WITH user_splits AS (
    -- Get all expense splits involving the user (either as payer or participant)
    SELECT
      e.id as expense_id,
      e.paid_by_user_id,
      e.currency as exp_currency,
      e.expense_date,
      es.user_id as split_user_id,
      es.computed_amount,
      COALESCE(es.settled_amount, 0) as settled_amt,
      CASE
        WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) >= es.computed_amount THEN 0
        WHEN COALESCE(es.settled_amount, 0) > 0 THEN es.computed_amount - COALESCE(es.settled_amount, 0)
        ELSE es.computed_amount
      END as remaining_amt
    FROM expenses e
    INNER JOIN expense_splits es ON e.id = es.expense_id
    WHERE
      (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id)
      AND es.user_id != e.paid_by_user_id  -- Exclude self-splits
      AND es.user_id IS NOT NULL
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
  ),
  signed_debts AS (
    -- Convert to signed amounts relative to the current user:
    --   Positive = I owe them (I'm the split user, someone else paid)
    --   Negative = They owe me (I paid, they have a split)
    SELECT
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN us.split_user_id  -- I paid, counterparty owes me
        ELSE us.paid_by_user_id  -- Someone else paid, I owe them
      END as cp_id,
      us.exp_currency,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.remaining_amt  -- They owe me (negative)
        ELSE us.remaining_amt  -- I owe them (positive)
      END as signed_remaining,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.computed_amount
        ELSE us.computed_amount
      END as signed_total,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.settled_amt
        ELSE us.settled_amt
      END as signed_settled,
      us.expense_date
    FROM user_splits us
  ),
  netted AS (
    -- Net bilateral debts per counterparty + currency
    SELECT
      sd.cp_id,
      sd.exp_currency,
      ROUND(SUM(sd.signed_remaining)) as net_remaining,
      ROUND(ABS(SUM(sd.signed_total))) as abs_total,
      ROUND(ABS(SUM(sd.signed_settled))) as abs_settled,
      COUNT(*) as txn_count,
      MAX(sd.expense_date)::TIMESTAMPTZ as last_txn_date
    FROM signed_debts sd
    WHERE sd.cp_id IS NOT NULL
    GROUP BY sd.cp_id, sd.exp_currency
    HAVING ROUND(SUM(sd.signed_remaining)) != 0  -- Exclude fully netted pairs
  )
  SELECT
    n.cp_id,
    COALESCE(p.full_name, 'Unknown User'),
    p.avatar_url,
    ROUND(ABS(n.net_remaining)),       -- amount (always positive)
    n.exp_currency,
    (n.net_remaining > 0),             -- i_owe_them = true when net is positive
    COALESCE(p.full_name, 'Unknown User'),  -- owed_to_name (counterparty name)
    n.cp_id,                           -- owed_to_id (counterparty id)
    n.abs_total,                       -- total_amount
    n.abs_settled,                     -- settled_amount
    ROUND(ABS(n.net_remaining)),       -- remaining_amount
    n.txn_count,
    n.last_txn_date
  FROM netted n
  LEFT JOIN profiles p ON p.id = n.cp_id
  ORDER BY ABS(n.net_remaining) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Get aggregated debts for a user with bilateral netting. Debts between two users are offset to show only the net balance. Amounts are rounded to whole numbers. Optional date range filtering.';

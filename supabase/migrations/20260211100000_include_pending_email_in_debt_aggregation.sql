-- Migration: Include pending email participants in debt aggregation
-- Date: 2026-02-11
-- Problem: get_user_debts_aggregated has AND es.user_id IS NOT NULL which excludes pending email splits
-- Solution: Remove filter, add counterparty_email to return type, handle NULL user_id in CTEs
-- Impact: Payers can now see email-based participants in their debt summary

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
  last_transaction_date TIMESTAMPTZ,
  counterparty_email TEXT  -- NEW: email for pending participants (NULL for UUID-based)
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_splits AS (
    -- Get all expense splits involving the user (either as payer or participant)
    -- Now includes pending email splits (user_id IS NULL)
    SELECT
      e.id as expense_id,
      e.paid_by_user_id,
      e.currency as exp_currency,
      e.expense_date,
      es.user_id as split_user_id,
      es.pending_email as split_pending_email,
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
      AND (es.user_id != e.paid_by_user_id OR es.user_id IS NULL)  -- Exclude self-splits; include pending email
      -- Removed: AND es.user_id IS NOT NULL
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
  ),
  signed_debts AS (
    -- Convert to signed amounts relative to the current user
    -- Uses a TEXT key for grouping that works for both UUID and email counterparties
    SELECT
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN us.split_user_id  -- Could be NULL for email
        ELSE us.paid_by_user_id
      END as cp_uuid,
      CASE
        WHEN us.paid_by_user_id = p_user_id AND us.split_user_id IS NULL
          THEN us.split_pending_email
        ELSE NULL
      END as cp_email,
      -- Composite key for grouping (works for both UUID and email)
      CASE
        WHEN us.paid_by_user_id = p_user_id
          THEN COALESCE(us.split_user_id::TEXT, us.split_pending_email)
        ELSE us.paid_by_user_id::TEXT
      END as cp_key,
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
    -- Groups by cp_key (TEXT) which handles both UUID and email
    SELECT
      sd.cp_key,
      MAX(sd.cp_uuid) as cp_uuid,    -- UUID for registered users, NULL for email
      MAX(sd.cp_email) as cp_email,   -- Email for pending, NULL for registered
      sd.exp_currency,
      ROUND(SUM(sd.signed_remaining)) as net_remaining,
      ROUND(ABS(SUM(sd.signed_total))) as abs_total,
      ROUND(ABS(SUM(sd.signed_settled))) as abs_settled,
      COUNT(*) as txn_count,
      MAX(sd.expense_date)::TIMESTAMPTZ as last_txn_date
    FROM signed_debts sd
    WHERE sd.cp_key IS NOT NULL
    GROUP BY sd.cp_key, sd.exp_currency
    HAVING ROUND(SUM(sd.signed_remaining)) != 0  -- Exclude fully netted pairs
  )
  SELECT
    n.cp_uuid,
    COALESCE(p.full_name, n.cp_email, 'Unknown User'),
    p.avatar_url,
    ROUND(ABS(n.net_remaining)),       -- amount (always positive)
    n.exp_currency,
    (n.net_remaining > 0),             -- i_owe_them = true when net is positive
    COALESCE(p.full_name, n.cp_email, 'Unknown User'),  -- owed_to_name
    n.cp_uuid,                         -- owed_to_id (NULL for email participants)
    n.abs_total,                       -- total_amount
    n.abs_settled,                     -- settled_amount
    ROUND(ABS(n.net_remaining)),       -- remaining_amount
    n.txn_count,
    n.last_txn_date,
    n.cp_email                         -- NEW: counterparty_email
  FROM netted n
  LEFT JOIN profiles p ON p.id = n.cp_uuid
  ORDER BY ABS(n.net_remaining) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Get aggregated debts for a user with bilateral netting. Includes pending email participants.
   Debts between two users are offset to show only the net balance. Amounts are rounded to whole numbers.
   Returns counterparty_email for pending participants (counterparty_id will be NULL).
   Optional date range filtering.';

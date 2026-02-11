-- Migration: Fix "function max(uuid) does not exist" in get_user_debts_aggregated
-- Date: 2026-02-11
-- Problem: Migration 20260211100000 used MAX(sd.cp_uuid) where cp_uuid is UUID type.
--          PostgreSQL has no built-in MAX() aggregate for UUID. This caused:
--          1. HTTP 404 on RPC call (function runtime error)
--          2. "function max(uuid) does not exist" error code 42883
-- Fix: Cast UUID to TEXT for MAX aggregation, then cast back to UUID

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
  counterparty_email TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_splits AS (
    SELECT
      e.id AS expense_id,
      e.paid_by_user_id,
      e.currency AS exp_currency,
      e.expense_date,
      es.user_id AS split_user_id,
      es.pending_email AS split_pending_email,
      es.computed_amount,
      COALESCE(es.settled_amount, 0) AS settled_amt,
      CASE
        WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) >= es.computed_amount THEN 0
        WHEN COALESCE(es.settled_amount, 0) > 0 THEN es.computed_amount - COALESCE(es.settled_amount, 0)
        ELSE es.computed_amount
      END AS remaining_amt
    FROM expenses e
    INNER JOIN expense_splits es ON e.id = es.expense_id
    WHERE
      (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id)
      AND (es.user_id != e.paid_by_user_id OR es.user_id IS NULL)
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
  ),
  signed_debts AS (
    SELECT
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN us.split_user_id
        ELSE us.paid_by_user_id
      END AS cp_uuid,
      CASE
        WHEN us.paid_by_user_id = p_user_id AND us.split_user_id IS NULL
          THEN us.split_pending_email
        ELSE NULL
      END AS cp_email,
      CASE
        WHEN us.paid_by_user_id = p_user_id
          THEN COALESCE(us.split_user_id::TEXT, us.split_pending_email)
        ELSE us.paid_by_user_id::TEXT
      END AS cp_key,
      us.exp_currency,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.remaining_amt
        ELSE us.remaining_amt
      END AS signed_remaining,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.computed_amount
        ELSE us.computed_amount
      END AS signed_total,
      CASE
        WHEN us.paid_by_user_id = p_user_id THEN -us.settled_amt
        ELSE us.settled_amt
      END AS signed_settled,
      us.expense_date
    FROM user_splits us
  ),
  netted AS (
    SELECT
      sd.cp_key,
      -- FIX: Cast UUID→TEXT for MAX, then back to UUID (PostgreSQL has no MAX for UUID)
      MAX(sd.cp_uuid::text)::uuid AS cp_uuid,
      MAX(sd.cp_email) AS cp_email,
      sd.exp_currency,
      ROUND(SUM(sd.signed_remaining)) AS net_remaining,
      ROUND(ABS(SUM(sd.signed_total))) AS abs_total,
      ROUND(ABS(SUM(sd.signed_settled))) AS abs_settled,
      COUNT(*) AS txn_count,
      MAX(sd.expense_date)::TIMESTAMPTZ AS last_txn_date
    FROM signed_debts sd
    WHERE sd.cp_key IS NOT NULL
    GROUP BY sd.cp_key, sd.exp_currency
    HAVING ROUND(SUM(sd.signed_remaining)) != 0
  )
  SELECT
    n.cp_uuid AS counterparty_id,
    COALESCE(p.full_name, n.cp_email, 'Unknown User') AS counterparty_name,
    p.avatar_url AS counterparty_avatar_url,
    ROUND(ABS(n.net_remaining)) AS amount,
    n.exp_currency AS currency,
    (n.net_remaining > 0) AS i_owe_them,
    COALESCE(p.full_name, n.cp_email, 'Unknown User') AS owed_to_name,
    n.cp_uuid AS owed_to_id,
    n.abs_total AS total_amount,
    n.abs_settled AS settled_amount,
    ROUND(ABS(n.net_remaining)) AS remaining_amount,
    n.txn_count AS transaction_count,
    n.last_txn_date AS last_transaction_date,
    n.cp_email AS counterparty_email
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
   Optional date range filtering.
   Fixed: MAX(uuid) → MAX(uuid::text)::uuid to avoid PostgreSQL type error.';

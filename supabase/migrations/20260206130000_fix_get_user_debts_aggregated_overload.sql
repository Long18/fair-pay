-- Migration: Fix get_user_debts_aggregated function overloading ambiguity
-- Date: 2026-02-06
-- Problem: Function has two overloads (1-param and 3-param) causing "could not choose best candidate" error
-- Solution: Drop the 1-param version since 3-param version with defaults handles both cases

-- Drop both versions to clean slate (use CASCADE if they have dependent objects)
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

-- Recreate single version with optional date parameters (uses defaults)
-- This handles both:
--   1. Calls with just p_user_id (uses current date as end_date)
--   2. Calls with p_user_id + date range
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
  -- If no end date specified, use today
  -- If no start date specified, use NULL (no filtering)
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
      -- Include expenses where user is involved
      (e.paid_by_user_id = p_user_id OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = p_user_id
      ))
      -- Apply date filter if provided
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
      -- Exclude payment records
      AND COALESCE(e.is_payment, false) = false
  ),
  debt_pairs AS (
    SELECT
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN es.user_id
        ELSE e.paid_by_user_id
      END as counterparty_id,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN pro.full_name
        ELSE paid_by.full_name
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
      paid_by.full_name as owed_to_name,
      e.paid_by_user_id as owed_to_id,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN es.computed_amount
        ELSE es.computed_amount
      END as total_amount,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN COALESCE(es.computed_amount, 0)
        ELSE COALESCE(es.computed_amount, 0)
      END as settled_amount,
      CASE
        WHEN e.paid_by_user_id = p_user_id THEN COALESCE(es.computed_amount, 0)
        ELSE COALESCE(es.computed_amount, 0)
      END as remaining_amount,
      1::BIGINT as transaction_count,
      e.expense_date as last_transaction_date
    FROM user_expenses e
    INNER JOIN expense_splits es ON e.id = es.expense_id
    LEFT JOIN profiles pro ON es.user_id = pro.id
    LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id
    WHERE es.user_id = p_user_id OR e.paid_by_user_id = p_user_id
  )
  SELECT
    counterparty_id,
    counterparty_name,
    counterparty_avatar_url,
    SUM(amount)::NUMERIC,
    currency,
    i_owe_them,
    owed_to_name,
    owed_to_id,
    SUM(total_amount)::NUMERIC,
    SUM(settled_amount)::NUMERIC,
    SUM(remaining_amount)::NUMERIC,
    COUNT(*)::BIGINT,
    MAX(last_transaction_date)
  FROM debt_pairs
  GROUP BY counterparty_id, counterparty_name, counterparty_avatar_url, currency, i_owe_them, owed_to_name, owed_to_id
  ORDER BY SUM(amount) DESC;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Get aggregated debts for a user, optionally filtered by date range. Date parameters are optional - if not provided, no date filtering is applied.';

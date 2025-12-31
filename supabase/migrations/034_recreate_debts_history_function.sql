-- Migration: Recreate get_user_debts_history Function After View Recreation
-- Description: Migration 033 dropped the user_debts_history view with CASCADE,
--              which also dropped the get_user_debts_history function.
--              This migration recreates the function with proper column qualification
--              to prevent "column reference is ambiguous" errors.
--
-- Problem: When migration 033 recreated user_debts_history view, it used
--          DROP VIEW IF EXISTS user_debts_history CASCADE which dropped the
--          dependent get_user_debts_history function but never recreated it.
--
-- Solution: Recreate the function with proper table aliases (udh.) for all
--           column references to avoid ambiguity.

BEGIN;

-- Drop the function if it exists (in case of re-running migration)
DROP FUNCTION IF EXISTS get_user_debts_history(UUID);

-- Recreate the function with proper column qualification
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
        WHEN udh.owes_user = p_user_id THEN udh.owed_user
        WHEN udh.owed_user = p_user_id THEN udh.owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN udh.owes_user = p_user_id THEN udh.total_amount
        WHEN udh.owed_user = p_user_id THEN -udh.total_amount
        ELSE 0
      END as signed_total_amount,
      CASE
        WHEN udh.owes_user = p_user_id THEN udh.settled_amount
        WHEN udh.owed_user = p_user_id THEN -udh.settled_amount
        ELSE 0
      END as signed_settled_amount,
      CASE
        WHEN udh.owes_user = p_user_id THEN udh.remaining_amount
        WHEN udh.owed_user = p_user_id THEN -udh.remaining_amount
        ELSE 0
      END as signed_remaining_amount,
      udh.transaction_count,
      udh.last_transaction_date
    FROM user_debts_history udh
    WHERE udh.owes_user = p_user_id OR udh.owed_user = p_user_id
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_debts_history IS 'Returns all debt relationships for a user including settled debts, ordered by outstanding balance then recency. Recreated after migration 033 dropped it via CASCADE.';

COMMIT;

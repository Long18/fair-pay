-- Migration: Fix get_expense_splits_public to include pending email participants
-- Date: 2026-02-06
-- Issue: Function used INNER JOIN which excluded splits with NULL user_id (pending emails)
-- Solution: Change to LEFT JOIN to include all splits regardless of whether user exists

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS get_expense_splits_public(UUID);

-- Recreate with LEFT JOIN to include pending email participants
CREATE OR REPLACE FUNCTION get_expense_splits_public(p_expense_id UUID)
RETURNS TABLE (
  id UUID,
  expense_id UUID,
  user_id UUID,
  pending_email TEXT,
  split_method TEXT,
  split_value DECIMAL,
  split_value_numeric NUMERIC,
  computed_amount DECIMAL,
  is_settled BOOLEAN,
  settled_amount DECIMAL,
  settled_at TIMESTAMPTZ,
  is_claimed BOOLEAN,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    es.expense_id,
    es.user_id,
    es.pending_email,
    es.split_method,
    es.split_value,
    CAST(es.split_value AS NUMERIC),
    es.computed_amount,
    es.is_settled,
    es.settled_amount,
    es.settled_at,
    es.is_claimed,
    es.created_at,
    p.full_name,
    p.avatar_url
  FROM expense_splits es
  LEFT JOIN profiles p ON p.id = es.user_id  -- ✅ Changed from INNER JOIN to LEFT JOIN
  WHERE es.expense_id = p_expense_id
  ORDER BY
    CASE WHEN es.user_id = (SELECT created_by FROM expenses WHERE expenses.id = p_expense_id) THEN 0 ELSE 1 END,  -- Payer first
    COALESCE(p.full_name, es.pending_email, 'Unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION get_expense_splits_public(UUID) IS 'Returns all expense splits for a given expense, including pending email participants. Uses LEFT JOIN to include splits where user_id is NULL.';

COMMIT;

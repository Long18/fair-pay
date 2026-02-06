-- Migration: Fix get_user_activities to support pagination with offset
-- Created: 2026-01-09
-- Purpose: Add p_offset parameter for proper pagination in profile activity display

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER, INTEGER);

-- Create updated function with offset support
CREATE OR REPLACE FUNCTION get_user_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  total_amount NUMERIC,
  user_share NUMERIC,
  currency TEXT,
  date TIMESTAMPTZ,
  group_name TEXT,
  paid_by_name TEXT,
  is_lender BOOLEAN,
  is_borrower BOOLEAN,
  is_payment BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS to ensure we can access all expenses the user should see
  SET LOCAL row_security = off;

  RETURN QUERY
  SELECT
    e.id,
    'expense'::TEXT as type,
    e.description,
    e.amount as total_amount,
    es.computed_amount as user_share,
    e.currency,
    e.expense_date::TIMESTAMPTZ as date,
    g.name as group_name,
    paid_by.full_name as paid_by_name,
    (e.paid_by_user_id = p_user_id) as is_lender,
    (es.user_id = p_user_id AND e.paid_by_user_id != p_user_id) as is_borrower,
    -- is_payment should indicate if the split is settled (user has paid their share)
    -- For lenders (payers): always false (they already paid when creating the expense)
    -- For borrowers: true if settled, false if still owes (unpaid)
    CASE
      WHEN e.paid_by_user_id = p_user_id THEN false  -- Lender already paid
      ELSE COALESCE(es.is_settled, false)  -- Borrower: show settlement status (default to false/unpaid if NULL)
    END as is_payment
  FROM expenses e
  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id
  LEFT JOIN groups g ON e.group_id = g.id
  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id
  WHERE
    -- Only show expense records, not payment records
    COALESCE(e.is_payment, false) = false
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) IS 'Get activities (expenses and splits) for a specific user with settlement status and pagination support.';

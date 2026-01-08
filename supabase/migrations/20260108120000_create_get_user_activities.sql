-- Migration: Create get_user_activities function
-- Created: 2026-01-08
-- Purpose: Create function to get user activities with proper error handling

-- Drop existing function if it exists (with all possible signatures)
DROP FUNCTION IF EXISTS get_user_activities(UUID);
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER);

-- Create function to get user activities
CREATE OR REPLACE FUNCTION get_user_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
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
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER functions automatically bypass RLS
  -- No need to disable RLS explicitly

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
    -- is_payment indicates if the split is settled
    -- For lenders (payers): always false (they already paid when creating the expense)
    -- For borrowers: true if settled, false if still owes (unpaid)
    CASE
      WHEN e.paid_by_user_id = p_user_id THEN false
      ELSE COALESCE(es.is_settled, false)
    END as is_payment
  FROM expenses e
  INNER JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = p_user_id
  LEFT JOIN groups g ON e.group_id = g.id
  LEFT JOIN profiles paid_by ON e.paid_by_user_id = paid_by.id
  WHERE COALESCE(e.is_payment, false) = false
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_user_activities(UUID, INTEGER) IS 'Get activities (expenses and splits) for a specific user with settlement status. Shows all expenses including unpaid ones.';

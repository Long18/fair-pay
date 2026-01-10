-- Script to fix get_user_activities function on production
-- Run this in Supabase SQL Editor if you're getting 400 errors

-- Step 1: Check if function exists
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_user_activities';

-- Step 2: Drop function if exists (with all possible signatures)
DROP FUNCTION IF EXISTS get_user_activities(UUID);
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER);

-- Step 3: Create function with proper error handling
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER) TO anon;

-- Step 5: Test the function (replace with actual user ID)
-- SELECT * FROM get_user_activities('YOUR_USER_ID_HERE'::UUID, 10);

-- Step 6: Verify function was created
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_user_activities';

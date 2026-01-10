-- Test script to verify get_user_activities function shows unpaid expenses
-- Run this in Supabase SQL Editor to debug

-- Replace with actual user ID you want to test
DO $$
DECLARE
  test_user_id UUID := 'YOUR_USER_ID_HERE';  -- Replace with actual user ID
  unpaid_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count unpaid expenses for this user
  SELECT COUNT(*) INTO unpaid_count
  FROM expenses e
  INNER JOIN expense_splits es ON e.id = es.expense_id
  WHERE es.user_id = test_user_id
    AND e.paid_by_user_id != test_user_id  -- User is borrower
    AND COALESCE(es.is_settled, false) = false  -- Unpaid
    AND COALESCE(e.is_payment, false) = false;

  -- Count total expenses for this user
  SELECT COUNT(*) INTO total_count
  FROM expenses e
  INNER JOIN expense_splits es ON e.id = es.expense_id
  WHERE es.user_id = test_user_id
    AND COALESCE(e.is_payment, false) = false;

  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Total expenses with splits: %', total_count;
  RAISE NOTICE 'Unpaid expenses (should show in activities): %', unpaid_count;

  -- Test the function
  RAISE NOTICE '--- Testing get_user_activities function ---';
END $$;

-- Test query: Get activities for a specific user
-- Replace USER_ID_HERE with actual user ID
SELECT
  id,
  description,
  total_amount,
  user_share,
  is_lender,
  is_borrower,
  is_payment,
  CASE
    WHEN is_payment = false AND is_borrower = true THEN 'UNPAID - Should show'
    WHEN is_payment = true AND is_borrower = true THEN 'PAID'
    WHEN is_lender = true THEN 'LENDER (paid)'
    ELSE 'UNKNOWN'
  END as status
FROM get_user_activities('USER_ID_HERE'::UUID, 50)
ORDER BY date DESC;

-- Compare with direct query to see what's missing
SELECT
  e.id,
  e.description,
  e.amount as total_amount,
  es.computed_amount as user_share,
  (e.paid_by_user_id = 'USER_ID_HERE'::UUID) as is_lender,
  (es.user_id = 'USER_ID_HERE'::UUID AND e.paid_by_user_id != 'USER_ID_HERE'::UUID) as is_borrower,
  COALESCE(es.is_settled, false) as is_settled,
  CASE
    WHEN COALESCE(es.is_settled, false) = false AND es.user_id = 'USER_ID_HERE'::UUID AND e.paid_by_user_id != 'USER_ID_HERE'::UUID THEN 'UNPAID - Should show'
    WHEN COALESCE(es.is_settled, false) = true AND es.user_id = 'USER_ID_HERE'::UUID AND e.paid_by_user_id != 'USER_ID_HERE'::UUID THEN 'PAID'
    WHEN e.paid_by_user_id = 'USER_ID_HERE'::UUID THEN 'LENDER (paid)'
    ELSE 'UNKNOWN'
  END as status
FROM expenses e
INNER JOIN expense_splits es ON e.id = es.expense_id
WHERE es.user_id = 'USER_ID_HERE'::UUID
  AND COALESCE(e.is_payment, false) = false
ORDER BY e.expense_date DESC, e.created_at DESC
LIMIT 50;

-- Debug script to check Friends Table data issue
-- Run this in Supabase SQL Editor or via psql

-- 1. Check if expense_splits exist
SELECT
  'Total expense splits' as check_name,
  COUNT(*) as count
FROM expense_splits;

-- 2. Check settlement status
SELECT
  'Settlement status distribution' as check_name,
  is_settled,
  COUNT(*) as count,
  SUM(computed_amount) as total_computed,
  SUM(settled_amount) as total_settled
FROM expense_splits
GROUP BY is_settled;

-- 3. Check user_debts_summary view
SELECT
  'User debts summary (all users)' as check_name,
  COUNT(*) as debt_relationships,
  SUM(amount_owed) as total_debts
FROM user_debts_summary;

-- 4. Sample data from user_debts_summary
SELECT
  owes_user,
  owed_user,
  amount_owed
FROM user_debts_summary
LIMIT 10;

-- 5. Check expenses table
SELECT
  'Expenses overview' as check_name,
  COUNT(*) as total_expenses,
  COUNT(CASE WHEN is_payment = false THEN 1 END) as real_expenses,
  COUNT(CASE WHEN is_payment = true THEN 1 END) as payment_records
FROM expenses;

-- 6. Check specific user debts (replace with actual user ID)
-- SELECT * FROM get_user_debts_aggregated('USER_ID_HERE');

-- 7. Check friendships
SELECT
  'Friendships overview' as check_name,
  COUNT(*) as total_friendships,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM friendships;

-- 8. Check if columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'expense_splits'
  AND column_name IN ('is_settled', 'settled_amount', 'settled_at', 'settled_by')
ORDER BY column_name;

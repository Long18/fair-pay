-- Test script to verify future expenses are excluded from debt calculations

-- Create test users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com', 'Test User 1'),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com', 'Test User 2')
ON CONFLICT (id) DO NOTHING;

-- Create a friendship
INSERT INTO friendships (user_a, user_b, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted')
ON CONFLICT DO NOTHING;

-- Create a PAST expense (should appear in debts)
INSERT INTO expenses (
  id,
  context_type,
  friendship_id,
  description,
  amount,
  expense_date,
  paid_by_user_id,
  created_by
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'friend',
  (SELECT id FROM friendships WHERE user_a = '11111111-1111-1111-1111-111111111111' LIMIT 1),
  'Past Expense',
  100.00,
  CURRENT_DATE - INTERVAL '1 day',  -- Yesterday
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;

-- Create split for past expense
INSERT INTO expense_splits (
  expense_id,
  user_id,
  split_method,
  split_value,
  computed_amount
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'equal',
  50.00,
  50.00
) ON CONFLICT DO NOTHING;

-- Create a FUTURE expense (should NOT appear in debts)
INSERT INTO expenses (
  id,
  context_type,
  friendship_id,
  description,
  amount,
  expense_date,
  paid_by_user_id,
  created_by
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'friend',
  (SELECT id FROM friendships WHERE user_a = '11111111-1111-1111-1111-111111111111' LIMIT 1),
  'Future Expense',
  200.00,
  CURRENT_DATE + INTERVAL '7 days',  -- Next week
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;

-- Create split for future expense
INSERT INTO expense_splits (
  expense_id,
  user_id,
  split_method,
  split_value,
  computed_amount
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'equal',
  100.00,
  100.00
) ON CONFLICT DO NOTHING;

-- Query user_debts_summary (should only show past expense)
SELECT
  'user_debts_summary' as view_name,
  owes_user,
  owed_user,
  amount_owed
FROM user_debts_summary
WHERE owes_user = '22222222-2222-2222-2222-222222222222'
   OR owed_user = '22222222-2222-2222-2222-222222222222';

-- Expected result: Only 50.00 from past expense, NOT 150.00 (50 + 100)

-- Query via function (should only show past expense)
SELECT
  'get_user_debts_aggregated' as function_name,
  counterparty_id,
  counterparty_name,
  amount,
  i_owe_them
FROM get_user_debts_aggregated('22222222-2222-2222-2222-222222222222');

-- Expected result: Only 50.00 owed to Test User 1

-- Cleanup
DELETE FROM expense_splits WHERE expense_id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
DELETE FROM expenses WHERE id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
DELETE FROM friendships WHERE user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222';
DELETE FROM profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

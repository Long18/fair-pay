-- Quick test data for debt dashboard
-- This creates 3 test users and expenses to demonstrate debt tracking

BEGIN;

-- Insert test users directly into profiles (bypassing auth)
INSERT INTO profiles (id, email, full_name, avatar_url)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', 'Alice Johnson', NULL),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', 'Bob Smith', NULL),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.com', 'Charlie Brown', NULL)
ON CONFLICT (id) DO NOTHING;

-- Create friendships with current user
-- NOTE: Replace 'auth.uid()' with your actual user ID if needed
DO $$
DECLARE
  current_user_id UUID;
  alice_id UUID := '11111111-1111-1111-1111-111111111111';
  bob_id UUID := '22222222-2222-2222-2222-222222222222';
  charlie_id UUID := '33333333-3333-3333-3333-333333333333';
  friendship1_id UUID;
  friendship2_id UUID;
  friendship3_id UUID;
  expense1_id UUID;
  expense2_id UUID;
  expense3_id UUID;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'WARNING: No authenticated user. Please login first.';
    RETURN;
  END IF;

  -- Create friendships
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, alice_id),
    GREATEST(current_user_id, alice_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship1_id;

  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, bob_id),
    GREATEST(current_user_id, bob_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship2_id;

  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, charlie_id),
    GREATEST(current_user_id, charlie_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship3_id;

  -- EXPENSE 1: You paid, Alice owes you ₫500,000
  INSERT INTO expenses (
    context_type, friendship_id, description, amount, currency,
    category, expense_date, paid_by_user_id, created_by, is_payment
  ) VALUES (
    'friend', friendship1_id, 'Dinner at fancy restaurant', 1000000, 'VND',
    'food', CURRENT_DATE, current_user_id, current_user_id, false
  ) RETURNING id INTO expense1_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES 
    (expense1_id, current_user_id, 'equal', 500000),
    (expense1_id, alice_id, 'equal', 500000);

  -- EXPENSE 2: Bob paid, you owe Bob ₫300,000
  INSERT INTO expenses (
    context_type, friendship_id, description, amount, currency,
    category, expense_date, paid_by_user_id, created_by, is_payment
  ) VALUES (
    'friend', friendship2_id, 'Movie tickets and popcorn', 600000, 'VND',
    'entertainment', CURRENT_DATE - 1, bob_id, bob_id, false
  ) RETURNING id INTO expense2_id;

  INSERT INTO expense_splits (expense_id, user_split_method, computed_amount)
  VALUES 
    (expense2_id, bob_id, 'equal', 300000),
    (expense2_id, current_user_id, 'equal', 300000);

  -- EXPENSE 3: You paid, Charlie owes you ₫750,000
  INSERT INTO expenses (
    context_type, friendship_id, description, amount, currency,
    category, expense_date, paid_by_user_id, created_by, is_payment
  ) VALUES (
    'friend', friendship3_id, 'Hotel room for 2 nights', 1500000, 'VND',
    'accommodation', CURRENT_DATE, current_user_id, current_user_id, false
  ) RETURNING id INTO expense3_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES 
    (expense3_id, current_user_id, 'equal', 750000),
    (expense3_id, charlie_id, 'equal', 750000);

  RAISE NOTICE '✅ Created test data successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'DASHBOARD SHOULD NOW SHOW:';
  RAISE NOTICE '  🔴 Alice owes you:   ₫500,000';
  RAISE NOTICE '  🔴 Charlie owes you: ₫750,000';
  RAISE NOTICE '  🟢 You owe Bob:      ₫300,000';



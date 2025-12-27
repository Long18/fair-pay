-- ================================================
-- DEBT TEST DATA FOR DASHBOARD
-- ================================================
-- This script creates realistic test data to demonstrate
-- "Who owes who" functionality with various edge cases
-- ================================================

BEGIN;

-- Get current user's ID (the logged-in user)
DO $$
DECLARE
  current_user_id UUID;
  alice_id UUID;
  bob_id UUID;
  charlie_id UUID;
  test_group_id UUID;
  friendship_alice_id UUID;
  friendship_bob_id UUID;
  friendship_charlie_id UUID;
  expense1_id UUID;
  expense2_id UUID;
  expense3_id UUID;
  expense4_id UUID;
  expense5_id UUID;
BEGIN
  -- Get the current authenticated user
  SELECT auth.uid() INTO current_user_id;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please login first.';
  END IF;

  RAISE NOTICE 'Creating test data for user: %', current_user_id;

  -- ================================================
  -- 1. CREATE TEST USERS
  -- ================================================

  -- Create Alice
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'alice.test@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Alice Johnson"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO alice_id;

  -- Create Bob
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'bob.test@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Bob Smith"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO bob_id;

  -- Create Charlie
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'charlie.test@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Charlie Brown"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO charlie_id;

  RAISE NOTICE 'Created test users: Alice=%, Bob=%, Charlie=%', alice_id, bob_id, charlie_id;

  -- ================================================
  -- 2. CREATE FRIENDSHIPS
  -- ================================================

  -- Friendship with Alice
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, alice_id),
    GREATEST(current_user_id, alice_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship_alice_id;

  -- Friendship with Bob
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, bob_id),
    GREATEST(current_user_id, bob_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship_bob_id;

  -- Friendship with Charlie
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, charlie_id),
    GREATEST(current_user_id, charlie_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship_charlie_id;

  RAISE NOTICE 'Created friendships';

  -- ================================================
  -- 3. CREATE TEST GROUP
  -- ================================================

  INSERT INTO groups (name, description, created_by)
  VALUES (
    'Weekend Trip',
    'Test group for weekend activities',
    current_user_id
  ) RETURNING id INTO test_group_id;

  -- Add members to group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES
    (test_group_id, alice_id, 'member'),
    (test_group_id, bob_id, 'member'),
    (test_group_id, charlie_id, 'member')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created test group: %', test_group_id;

  -- ================================================
  -- 4. EDGE CASE 1: YOU PAID, ALICE OWES YOU
  -- ================================================
  -- Scenario: You paid ₫300,000 for karaoke, split equally with Alice
  -- Expected: Alice owes you ₫150,000

  INSERT INTO expenses (
    context_type,
    friendship_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    created_by
  ) VALUES (
    'friend',
    friendship_alice_id,
    'Karaoke night',
    300000,
    'VND',
    'entertainment',
    CURRENT_DATE,
    current_user_id,
    current_user_id
  ) RETURNING id INTO expense1_id;

  -- Split: You and Alice
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense1_id, current_user_id, 'equal', 150000),
    (expense1_id, alice_id, 'equal', 150000);

  RAISE NOTICE 'Created expense 1: Karaoke (Alice owes you ₫150,000)';

  -- ================================================
  -- 5. EDGE CASE 2: BOB PAID, YOU OWE BOB
  -- ================================================
  -- Scenario: Bob paid ₫200,000 for dinner, split equally with you
  -- Expected: You owe Bob ₫100,000

  INSERT INTO expenses (
    context_type,
    friendship_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    created_by
  ) VALUES (
    'friend',
    friendship_bob_id,
    'Dinner at Italian restaurant',
    200000,
    'VND',
    'food',
    CURRENT_DATE - INTERVAL '1 day',
    bob_id,
    bob_id
  ) RETURNING id INTO expense2_id;

  -- Split: Bob and You
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense2_id, bob_id, 'equal', 100000),
    (expense2_id, current_user_id, 'equal', 100000);

  RAISE NOTICE 'Created expense 2: Dinner (You owe Bob ₫100,000)';

  -- ================================================
  -- 6. EDGE CASE 3: GROUP EXPENSE, MULTIPLE PEOPLE OWE YOU
  -- ================================================
  -- Scenario: You paid ₫800,000 for hotel, split 4 ways
  -- Expected: Alice, Bob, Charlie each owe you ₫200,000

  INSERT INTO expenses (
    context_type,
    group_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    created_by
  ) VALUES (
    'group',
    test_group_id,
    'Hotel booking for weekend trip',
    800000,
    'VND',
    'accommodation',
    CURRENT_DATE,
    current_user_id,
    current_user_id
  ) RETURNING id INTO expense3_id;

  -- Split: You, Alice, Bob, Charlie (4 people)
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense3_id, current_user_id, 'equal', 200000),
    (expense3_id, alice_id, 'equal', 200000),
    (expense3_id, bob_id, 'equal', 200000),
    (expense3_id, charlie_id, 'equal', 200000);

  RAISE NOTICE 'Created expense 3: Hotel (Alice, Bob, Charlie each owe you ₫200,000)';

  -- ================================================
  -- 7. EDGE CASE 4: UNEQUAL SPLIT
  -- ================================================
  -- Scenario: Alice paid ₫500,000 for shopping, you owe ₫150,000 (30%)
  -- Expected: You owe Alice ₫150,000

  INSERT INTO expenses (
    context_type,
    friendship_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    created_by
  ) VALUES (
    'friend',
    friendship_alice_id,
    'Shopping - your share of groceries',
    500000,
    'VND',
    'shopping',
    CURRENT_DATE - INTERVAL '2 days',
    alice_id,
    alice_id
  ) RETURNING id INTO expense4_id;

  -- Unequal split: Alice paid, you owe 30%
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense4_id, alice_id, 'exact', 350000),  -- Alice's share: 70%
    (expense4_id, current_user_id, 'exact', 150000);  -- Your share: 30%

  RAISE NOTICE 'Created expense 4: Shopping (You owe Alice ₫150,000 - unequal split)';

  -- ================================================
  -- 8. EDGE CASE 5: SMALL AMOUNT (ROUNDING TEST)
  -- ================================================
  -- Scenario: You paid ₫50,000 for coffee, split 3 ways
  -- Expected: Alice owes you ₫16,666.67, Bob owes you ₫16,666.67

  INSERT INTO expenses (
    context_type,
    group_id,
    description,
    amount,
    currency,
    category,
    expense_date,
    paid_by_user_id,
    created_by
  ) VALUES (
    'group',
    test_group_id,
    'Coffee break',
    50000,
    'VND',
    'food',
    CURRENT_DATE,
    current_user_id,
    current_user_id
  ) RETURNING id INTO expense5_id;

  -- Split: You, Alice, Bob (3 people - tests rounding)
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense5_id, current_user_id, 'equal', 16667),
    (expense5_id, alice_id, 'equal', 16667),
    (expense5_id, bob_id, 'equal', 16666);  -- Last person gets the remainder

  RAISE NOTICE 'Created expense 5: Coffee (Small amount with rounding)';

  -- ================================================
  -- 9. SUMMARY
  -- ================================================

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA CREATED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'EXPECTED DASHBOARD DEBTS:';
  RAISE NOTICE '';
  RAISE NOTICE 'OWED TO YOU:';
  RAISE NOTICE '  - Alice owes you:   ₫150,000 (Karaoke)';
  RAISE NOTICE '  - Alice owes you:   ₫200,000 (Hotel)';
  RAISE NOTICE '  - Alice owes you:   ₫16,667 (Coffee)';
  RAISE NOTICE '  - Bob owes you:     ₫200,000 (Hotel)';
  RAISE NOTICE '  - Bob owes you:     ₫16,666 (Coffee)';
  RAISE NOTICE '  - Charlie owes you: ₫200,000 (Hotel)';
  RAISE NOTICE '';
  RAISE NOTICE 'YOU OWE:';
  RAISE NOTICE '  - You owe Bob:      ₫100,000 (Dinner)';
  RAISE NOTICE '  - You owe Alice:    ₫150,000 (Shopping)';
  RAISE NOTICE '';
  RAISE NOTICE 'NET TOTALS (after aggregation):';
  RAISE NOTICE '  - Alice net:   You get ₫216,667 (366,667 - 150,000)';
  RAISE NOTICE '  - Bob net:     You get ₫116,666 (216,666 - 100,000)';
  RAISE NOTICE '  - Charlie net: You get ₫200,000';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your dashboard to see the debts!';
  RAISE NOTICE '============================================';

END $$;

COMMIT;

-- ================================================
-- TO RUN THIS SCRIPT:
-- ================================================
-- In your terminal:
-- cd /Users/long.lnt/Desktop/Projects/FairPay
-- supabase db reset (resets and runs all migrations)
-- psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/debt-test-data.sql
--
-- OR using Supabase CLI:
-- supabase db seed debt-test-data
-- ================================================

-- ================================================
-- FRIENDS & BALANCES TEST DATA
-- ================================================
-- This script creates comprehensive test data for:
-- 1. Friendships (accepted, pending, rejected)
-- 2. Expenses between friends
-- 3. Payments between friends
-- 4. Balance calculations via functions
-- ================================================

BEGIN;

DO $$
DECLARE
  current_user_id UUID;
  friend1_id UUID;
  friend2_id UUID;
  friend3_id UUID;
  friend4_id UUID;
  friend5_id UUID;

  friendship1_id UUID;
  friendship2_id UUID;
  friendship3_id UUID;
  friendship4_id UUID;
  friendship5_id UUID;

  expense1_id UUID;
  expense2_id UUID;
  expense3_id UUID;
  expense4_id UUID;
  expense5_id UUID;
  expense6_id UUID;

  payment1_id UUID;
  payment2_id UUID;
BEGIN
  -- Get the current authenticated user (if logged in)
  SELECT auth.uid() INTO current_user_id;

  -- If no authenticated user, try to get first user from profiles
  IF current_user_id IS NULL THEN
    SELECT id INTO current_user_id FROM profiles ORDER BY created_at LIMIT 1;

    -- If still no user, create a test user
    IF current_user_id IS NULL THEN
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
        'test.user@fairpay.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"full_name": "Test User"}'::jsonb,
        NOW(),
        NOW()
      ) RETURNING id INTO current_user_id;

      RAISE NOTICE 'Created test user: %', current_user_id;
    ELSE
      RAISE NOTICE 'Using existing user from profiles: %', current_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Using authenticated user: %', current_user_id;
  END IF;

  RAISE NOTICE 'Creating friends & balances test data for user: %', current_user_id;

  -- ================================================
  -- 1. CREATE TEST FRIENDS (PROFILES)
  -- ================================================

  -- Friend 1: Alice - Accepted friend
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
    'alice.friend@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Alice Johnson"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO friend1_id;

  -- Get ID if user already exists
  IF friend1_id IS NULL THEN
    SELECT id INTO friend1_id FROM auth.users WHERE email = 'alice.friend@fairpay.com';
  END IF;

  -- Friend 2: Bob - Accepted friend with balance
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
    'bob.friend@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Bob Smith"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO friend2_id;

  IF friend2_id IS NULL THEN
    SELECT id INTO friend2_id FROM auth.users WHERE email = 'bob.friend@fairpay.com';
  END IF;

  -- Friend 3: Charlie - Pending request (you sent)
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
    'charlie.friend@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Charlie Brown"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO friend3_id;

  IF friend3_id IS NULL THEN
    SELECT id INTO friend3_id FROM auth.users WHERE email = 'charlie.friend@fairpay.com';
  END IF;

  -- Friend 4: Diana - Pending request (they sent)
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
    'diana.friend@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Diana Prince"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO friend4_id;

  IF friend4_id IS NULL THEN
    SELECT id INTO friend4_id FROM auth.users WHERE email = 'diana.friend@fairpay.com';
  END IF;

  -- Friend 5: Eve - Accepted friend with complex balance
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
    'eve.friend@fairpay.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Eve Williams"}'::jsonb,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET email = EXCLUDED.email
  RETURNING id INTO friend5_id;

  IF friend5_id IS NULL THEN
    SELECT id INTO friend5_id FROM auth.users WHERE email = 'eve.friend@fairpay.com';
  END IF;

  RAISE NOTICE 'Created test friends: Alice=%, Bob=%, Charlie=%, Diana=%, Eve=%',
    friend1_id, friend2_id, friend3_id, friend4_id, friend5_id;

  -- ================================================
  -- 2. CREATE FRIENDSHIPS
  -- ================================================

  -- Friendship 1: Alice - ACCEPTED (you owe her)
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, friend1_id),
    GREATEST(current_user_id, friend1_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship1_id;

  -- Friendship 2: Bob - ACCEPTED (he owes you)
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, friend2_id),
    GREATEST(current_user_id, friend2_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship2_id;

  -- Friendship 3: Charlie - PENDING (you sent request)
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, friend3_id),
    GREATEST(current_user_id, friend3_id),
    'pending',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship3_id;

  -- Friendship 4: Diana - PENDING (they sent request)
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, friend4_id),
    GREATEST(current_user_id, friend4_id),
    'pending',
    friend4_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship4_id;

  -- Friendship 5: Eve - ACCEPTED (complex balance with payments)
  INSERT INTO friendships (user_a, user_b, status, created_by)
  VALUES (
    LEAST(current_user_id, friend5_id),
    GREATEST(current_user_id, friend5_id),
    'accepted',
    current_user_id
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO friendship5_id;

  RAISE NOTICE 'Created friendships';

  -- ================================================
  -- 3. CREATE EXPENSES - SCENARIO 1: YOU OWE ALICE
  -- ================================================
  -- Alice paid ₫500,000 for dinner, split equally
  -- You owe Alice ₫250,000

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
    friendship1_id,
    'Dinner at fancy restaurant',
    500000,
    'VND',
    'food',
    CURRENT_DATE - INTERVAL '5 days',
    friend1_id,
    friend1_id
  ) RETURNING id INTO expense1_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense1_id, friend1_id, 'equal', 250000),
    (expense1_id, current_user_id, 'equal', 250000);

  RAISE NOTICE 'Created expense 1: You owe Alice ₫250,000';

  -- ================================================
  -- 4. CREATE EXPENSES - SCENARIO 2: BOB OWES YOU
  -- ================================================
  -- You paid ₫600,000 for movie tickets, split equally
  -- Bob owes you ₫300,000

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
    friendship2_id,
    'Movie tickets and snacks',
    600000,
    'VND',
    'entertainment',
    CURRENT_DATE - INTERVAL '3 days',
    current_user_id,
    current_user_id
  ) RETURNING id INTO expense2_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense2_id, current_user_id, 'equal', 300000),
    (expense2_id, friend2_id, 'equal', 300000);

  RAISE NOTICE 'Created expense 2: Bob owes you ₫300,000';

  -- ================================================
  -- 5. CREATE EXPENSES - SCENARIO 3: ALICE PAID MORE
  -- ================================================
  -- Alice paid ₫400,000 for coffee, split equally
  -- You owe Alice another ₫200,000
  -- Total you owe Alice: ₫450,000

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
    friendship1_id,
    'Coffee and pastries',
    400000,
    'VND',
    'food',
    CURRENT_DATE - INTERVAL '2 days',
    friend1_id,
    friend1_id
  ) RETURNING id INTO expense3_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense3_id, friend1_id, 'equal', 200000),
    (expense3_id, current_user_id, 'equal', 200000);

  RAISE NOTICE 'Created expense 3: You owe Alice another ₫200,000 (total: ₫450,000)';

  -- ================================================
  -- 6. CREATE EXPENSES - SCENARIO 4: BOB PAID MORE
  -- ================================================
  -- Bob paid ₫800,000 for concert tickets, split equally
  -- Bob owes you another ₫400,000
  -- Total Bob owes you: ₫700,000

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
    friendship2_id,
    'Concert tickets',
    800000,
    'VND',
    'entertainment',
    CURRENT_DATE - INTERVAL '1 day',
    friend2_id,
    friend2_id
  ) RETURNING id INTO expense4_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense4_id, friend2_id, 'equal', 400000),
    (expense4_id, current_user_id, 'equal', 400000);

  RAISE NOTICE 'Created expense 4: Bob owes you another ₫400,000 (total: ₫700,000)';

  -- ================================================
  -- 7. CREATE EXPENSES - SCENARIO 5: EVE COMPLEX BALANCE
  -- ================================================
  -- Multiple expenses with different amounts

  -- Expense 5a: You paid ₫300,000
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
    friendship5_id,
    'Lunch',
    300000,
    'VND',
    'food',
    CURRENT_DATE - INTERVAL '7 days',
    current_user_id,
    current_user_id
  ) RETURNING id INTO expense5_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense5_id, current_user_id, 'equal', 150000),
    (expense5_id, friend5_id, 'equal', 150000);

  -- Expense 5b: Eve paid ₫200,000
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
    friendship5_id,
    'Taxi fare',
    200000,
    'VND',
    'transport',
    CURRENT_DATE - INTERVAL '4 days',
    friend5_id,
    friend5_id
  ) RETURNING id INTO expense6_id;

  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES
    (expense6_id, current_user_id, 'equal', 100000),
    (expense6_id, friend5_id, 'equal', 100000);

  -- Net: You paid ₫150,000, Eve paid ₫100,000
  -- You owe Eve: ₫50,000 (but we'll add a payment to settle)

  RAISE NOTICE 'Created expenses 5-6: Complex balance with Eve';

  -- ================================================
  -- 8. CREATE PAYMENTS - SETTLE BALANCES
  -- ================================================

  -- Payment 1: You pay Alice ₫200,000 (partial payment)
  INSERT INTO payments (
    context_type,
    friendship_id,
    description,
    amount,
    currency,
    payment_date,
    from_user,
    to_user,
    created_by
  ) VALUES (
    'friend',
    friendship1_id,
    'Partial payment for dinner',
    200000,
    'VND',
    CURRENT_DATE - INTERVAL '1 day',
    current_user_id,
    friend1_id,
    current_user_id
  ) RETURNING id INTO payment1_id;

  -- After payment: You still owe Alice ₫250,000

  RAISE NOTICE 'Created payment 1: You paid Alice ₫200,000 (still owe ₫250,000)';

  -- Payment 2: You pay Eve ₫50,000 (settle balance)
  INSERT INTO payments (
    context_type,
    friendship_id,
    description,
    amount,
    currency,
    payment_date,
    from_user,
    to_user,
    created_by
  ) VALUES (
    'friend',
    friendship5_id,
    'Settle balance',
    50000,
    'VND',
    CURRENT_DATE,
    current_user_id,
    friend5_id,
    current_user_id
  ) RETURNING id INTO payment2_id;

  -- After payment: Balance settled with Eve

  RAISE NOTICE 'Created payment 2: You paid Eve ₫50,000 (balance settled)';

  -- ================================================
  -- SUMMARY
  -- ================================================

  RAISE NOTICE '=== FRIENDS & BALANCES TEST DATA CREATED ===';
  RAISE NOTICE 'Friendships:';
  RAISE NOTICE '  1. Alice (accepted) - You owe ₫250,000';
  RAISE NOTICE '  2. Bob (accepted) - Bob owes you ₫700,000';
  RAISE NOTICE '  3. Charlie (pending - you sent)';
  RAISE NOTICE '  4. Diana (pending - they sent)';
  RAISE NOTICE '  5. Eve (accepted) - Balance settled';
  RAISE NOTICE '';
  RAISE NOTICE 'Test functions:';
  RAISE NOTICE '  - get_friendship_activity(friendship_id)';
  RAISE NOTICE '  - get_user_debts_aggregated()';
  RAISE NOTICE '  - get_user_balance()';

END $$;

COMMIT;

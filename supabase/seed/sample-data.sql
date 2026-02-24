-- Comprehensive Seed Data for FairPay Database
-- Generates 100 samples for each table with realistic relationships
-- Date: 2025-12-30
--
-- Usage:
--   - Run via script: pnpm seed:local
--   - Or manually: cat supabase/seed/sample-data.sql | docker exec -i supabase_db_FairPay psql -U postgres -d postgres
--
-- Test User (created in PART 0):
--   - Email: test@fairpay.local
--   - Password: password123
--
-- Note: User long.lnt@amanotes.com is NOT created here - will be created on login
--       Friendships for this user will be created automatically if profile exists (see PART 16)

BEGIN;

-- ========================================
-- SCHEMA VALIDATION: Check required columns exist
-- ========================================
-- Note: Schema changes should be done via migrations, not seed files
-- This section only validates that required columns exist
DO $$
BEGIN
  -- Validate avatar_url column exists in groups table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'avatar_url'
  ) THEN
    RAISE EXCEPTION 'Missing avatar_url column in groups table. Please run migration 032_add_avatar_url_to_groups.sql first.';
  END IF;

  -- Validate friendships table has correct structure (user_a, user_b)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friendships' AND column_name = 'user_a'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friendships' AND column_name = 'user_b'
  ) THEN
    RAISE EXCEPTION 'Missing user_a or user_b columns in friendships table. Schema mismatch.';
  END IF;

  RAISE NOTICE 'Schema validation completed successfully';
END $$;

-- ========================================
-- PART 0: CREATE TEST USER FOR LOGIN
-- ========================================
-- Create a test user that you can use to login immediately
-- Email: test@fairpay.local
-- Password: password123
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_super_admin
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@fairpay.local',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Test User'),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    false
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert into profiles
  INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    test_user_id,
    'test@fairpay.local',
    'Test User',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  RAISE NOTICE 'Created test user: test@fairpay.local (password: password123)';
END $$;

-- ========================================
-- HELPER: Generate Vietnamese names
-- ========================================
DO $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Anh', 'Bình', 'Cường', 'Dũng', 'Đức', 'Giang', 'Hải', 'Hùng', 'Khang', 'Long',
    'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Thành', 'Tuấn', 'Vinh', 'Xuân', 'Yên',
    'An', 'Bích', 'Chi', 'Dung', 'Hà', 'Lan', 'Linh', 'Mai', 'Nga', 'Oanh',
    'Phương', 'Quỳnh', 'Thảo', 'Uyên', 'Vy', 'Yến', 'Hương', 'Loan', 'My', 'Nhung'
  ];
  last_names TEXT[] := ARRAY[
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Tô', 'Trương'
  ];
BEGIN
  -- Store arrays for later use
  NULL;
END $$;

-- ========================================
-- PART 1: GENERATE 100 USERS (auth.users + profiles)
-- ========================================
DO $$
DECLARE
  user_ids UUID[] := ARRAY[]::UUID[];
  long_user_id UUID;
  i INT;
  user_id UUID;
  first_names TEXT[] := ARRAY[
    'Anh', 'Bình', 'Cường', 'Dũng', 'Đức', 'Giang', 'Hải', 'Hùng', 'Khang', 'Long',
    'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Thành', 'Tuấn', 'Vinh', 'Xuân', 'Yên',
    'An', 'Bích', 'Chi', 'Dung', 'Hà', 'Lan', 'Linh', 'Mai', 'Nga', 'Oanh',
    'Phương', 'Quỳnh', 'Thảo', 'Uyên', 'Vy', 'Yến', 'Hương', 'Loan', 'My', 'Nhung',
    'Bảo', 'Công', 'Đạt', 'Huy', 'Kiên', 'Lâm', 'Mạnh', 'Nghĩa', 'Phúc', 'Thắng'
  ];
  last_names TEXT[] := ARRAY[
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Tô', 'Trương',
    'Lương', 'Vương', 'Tạ', 'Phùng', 'Bạch', 'Đoàn', 'Trịnh', 'Lưu', 'Mạc', 'Hứa',
    'Thái', 'Chu', 'Tôn', 'Văn', 'Đinh', 'Hà', 'Lâm', 'Phan', 'Quách', 'Tăng',
    'Hồng', 'Lý', 'Mai', 'Nguyễn', 'Phạm', 'Trần', 'Vũ', 'Đỗ', 'Bùi', 'Lê'
  ];
  full_name TEXT;
  email TEXT;
BEGIN
  -- Note: long.lnt@amanotes.com will be created automatically on login via trigger
  -- We create 100 other users here

  FOR i IN 1..100 LOOP
    user_id := gen_random_uuid();
    user_ids := array_append(user_ids, user_id);

    full_name := last_names[1 + (i - 1) % array_length(last_names, 1)] || ' ' || first_names[1 + (i - 1) % array_length(first_names, 1)];
    email := 'user' || i || '@fairpay.local';

    -- Insert into auth.users (for local Supabase)
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      is_super_admin
    ) VALUES (
      user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      email,
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', full_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      false
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert into profiles
    INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      user_id,
      email,
      full_name,
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || user_id,
      NOW() - (random() * INTERVAL '365 days'),
      NOW() - (random() * INTERVAL '365 days')
    ) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END LOOP;

  RAISE NOTICE 'Created 100 users (test@fairpay.local available for login, long.lnt@amanotes.com will be created on login)';
END $$;

-- ========================================
-- PART 2: CREATE 50 USER ROLES
-- ========================================
DO $$
DECLARE
  profile_user_id UUID;
  role_type TEXT;
BEGIN
  FOR profile_user_id IN SELECT id FROM profiles ORDER BY created_at LIMIT 100 LOOP
    role_type := CASE WHEN random() < 0.1 THEN 'admin' ELSE 'user' END;

    INSERT INTO user_roles (user_id, role, created_at, updated_at)
    VALUES (profile_user_id, role_type, NOW() - (random() * INTERVAL '365 days'), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 100 user roles';
END $$;

-- ========================================
-- PART 3: CREATE 100 GROUPS
-- ========================================
DO $$
DECLARE
  group_ids UUID[] := ARRAY[]::UUID[];
  group_names TEXT[] := ARRAY[
    'Team Lunch', 'Weekend Trip', 'Office Expenses', 'Birthday Party', 'House Rent',
    'Grocery Shopping', 'Movie Night', 'Coffee Club', 'Gym Membership', 'Travel Fund',
    'Dinner Group', 'Concert Tickets', 'Gift Pool', 'Taxi Share', 'Internet Bill',
    'Game Night', 'Study Group', 'Fitness Challenge', 'Book Club', 'Tech Meetup',
    'Family Gathering', 'Holiday Fund', 'Wedding Gift', 'Baby Shower', 'Graduation Party',
    'New Year Celebration', 'Company Outing', 'Team Building', 'Charity Event', 'Sports League',
    'Music Festival', 'Food Tour', 'Adventure Trip', 'Wellness Retreat', 'Workshop Series',
    'Photography Club', 'Cooking Class', 'Language Exchange', 'Investment Group', 'Startup Meetup',
    'Art Exhibition', 'Theater Group', 'Dance Class', 'Yoga Session', 'Meditation Circle',
    'Hiking Club', 'Cycling Group', 'Running Team', 'Swimming Pool', 'Tennis Court'
  ];
  i INT;
  group_id UUID;
  creator_id UUID;
BEGIN
  FOR i IN 1..100 LOOP
    group_id := gen_random_uuid();
    group_ids := array_append(group_ids, group_id);

    -- Select random creator from existing profiles
    SELECT id INTO creator_id FROM profiles ORDER BY RANDOM() LIMIT 1;

    INSERT INTO groups (id, name, description, simplify_debts, created_by, avatar_url, created_at, updated_at)
    VALUES (
      group_id,
      group_names[1 + ((i - 1) % array_length(group_names, 1))] || ' ' || i,
      'Group description for ' || group_names[1 + ((i - 1) % array_length(group_names, 1))] || ' ' || i,
      CASE WHEN random() < 0.3 THEN true ELSE false END,
      creator_id,
      'https://api.dicebear.com/7.x/initials/svg?seed=' || group_names[1 + ((i - 1) % array_length(group_names, 1))],
      NOW() - (random() * INTERVAL '180 days'),
      NOW() - (random() * INTERVAL '180 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 groups';
END $$;

-- ========================================
-- PART 4: CREATE GROUP MEMBERS (distributed across groups)
-- ========================================
DO $$
DECLARE
  current_group_id UUID;
  current_user_id UUID;
  member_count INT;
  i INT;
  j INT;
BEGIN
  FOR current_group_id IN SELECT id FROM groups LOOP
    member_count := 3 + floor(random() * 8)::INT; -- 3-10 members per group

    FOR j IN 1..member_count LOOP
      SELECT id INTO current_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;

      INSERT INTO group_members (group_id, user_id, role, joined_at)
      VALUES (
        current_group_id,
        current_user_id,
        CASE WHEN j = 1 THEN 'admin' ELSE 'member' END,
        NOW() - (random() * INTERVAL '180 days')
      ) ON CONFLICT (group_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created group members';
END $$;

-- ========================================
-- PART 5: CREATE 100 FRIENDSHIPS
-- ========================================
DO $$
DECLARE
  friend_user_a UUID;
  friend_user_b UUID;
  status_types TEXT[] := ARRAY['pending', 'accepted', 'rejected'];
  status TEXT;
  created_by UUID;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO friend_user_a FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO friend_user_b FROM profiles ORDER BY RANDOM() LIMIT 1;

    -- Ensure different users
    WHILE friend_user_a = friend_user_b LOOP
      SELECT id INTO friend_user_b FROM profiles ORDER BY RANDOM() LIMIT 1;
    END LOOP;

    -- Ensure ordering: user_a < user_b
    IF friend_user_a > friend_user_b THEN
      SELECT friend_user_b, friend_user_a INTO friend_user_a, friend_user_b;
    END IF;

    status := status_types[1 + floor(random() * 3)::INT];
    created_by := CASE WHEN random() < 0.5 THEN friend_user_a ELSE friend_user_b END;

    -- Check if friendship already exists
    IF NOT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_a = friend_user_a AND user_b = friend_user_b
    ) THEN
      INSERT INTO friendships (user_a, user_b, status, created_by, created_at, updated_at)
      VALUES (
        friend_user_a,
        friend_user_b,
        status,
        created_by,
        NOW() - (random() * INTERVAL '180 days'),
        NOW() - (random() * INTERVAL '180 days')
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Created 100 friendships';
END $$;

-- ========================================
-- PART 6: CREATE 100 EXPENSES
-- ========================================
DO $$
DECLARE
  expense_ids UUID[] := ARRAY[]::UUID[];
  expense_id UUID;
  context_type TEXT;
  group_id UUID;
  friendship_id UUID;
  descriptions TEXT[] := ARRAY[
    'Lunch at restaurant', 'Dinner party', 'Coffee break', 'Taxi ride', 'Movie tickets',
    'Grocery shopping', 'Concert tickets', 'Birthday gift', 'Hotel booking', 'Restaurant bill',
    'Bar tab', 'Uber ride', 'Concert', 'Theater tickets', 'Museum entry',
    'Parking fee', 'Toll road', 'Gas station', 'Fast food', 'Fine dining',
    'Street food', 'Food delivery', 'Takeout', 'Buffet', 'BBQ party',
    'Wedding gift', 'Baby shower gift', 'Graduation gift', 'Birthday cake', 'Anniversary dinner',
    'Weekend trip', 'Beach day', 'Mountain hike', 'City tour', 'Shopping spree',
    'Electronics', 'Clothing', 'Books', 'Games', 'Sports equipment',
    'Gym membership', 'Yoga class', 'Personal trainer', 'Massage', 'Spa day',
    'Haircut', 'Manicure', 'Pedicure', 'Facial', 'Makeup'
  ];
  categories TEXT[] := ARRAY[
    'Food & Drink', 'Transportation', 'Entertainment', 'Shopping', 'Utilities',
    'Travel', 'Gifts', 'Health & Fitness', 'Personal Care', 'Education'
  ];
  paid_by_user_id UUID;
  created_by UUID;
  amount DECIMAL(12, 2);
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    expense_id := gen_random_uuid();
    expense_ids := array_append(expense_ids, expense_id);

    context_type := CASE WHEN random() < 0.7 THEN 'group' ELSE 'friend' END;

    IF context_type = 'group' THEN
      SELECT id INTO group_id FROM groups ORDER BY RANDOM() LIMIT 1;
      friendship_id := NULL;
    ELSE
      SELECT id INTO friendship_id FROM friendships WHERE status = 'accepted' ORDER BY RANDOM() LIMIT 1;
      group_id := NULL;
    END IF;

    SELECT id INTO paid_by_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO created_by FROM profiles ORDER BY RANDOM() LIMIT 1;

    amount := (10 + random() * 990)::DECIMAL(12, 2); -- 10-1000

    INSERT INTO expenses (
      id, context_type, group_id, friendship_id, description, amount, currency,
      category, expense_date, paid_by_user_id, is_payment, created_by, created_at, updated_at
    )
    VALUES (
      expense_id,
      context_type,
      group_id,
      friendship_id,
      descriptions[1 + (i - 1) % array_length(descriptions, 1)],
      amount,
      'VND',
      categories[1 + (i - 1) % array_length(categories, 1)],
      CURRENT_DATE - (random() * 90)::INT,
      paid_by_user_id,
      CASE WHEN random() < 0.2 THEN true ELSE false END,
      created_by,
      NOW() - (random() * INTERVAL '90 days'),
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 expenses';
END $$;

-- ========================================
-- PART 7: CREATE EXPENSE SPLITS
-- ========================================
DO $$
DECLARE
  expense_record RECORD;
  split_user_id UUID;
  split_method TEXT;
  split_value DECIMAL(12, 2);
  computed_amount DECIMAL(12, 2);
  participant_count INT;
  friend_user_a UUID;
  friend_user_b UUID;
  i INT;
BEGIN
  FOR expense_record IN
    SELECT e.id, e.amount, e.paid_by_user_id, e.context_type, e.group_id, e.friendship_id
    FROM expenses e
  LOOP
    IF expense_record.context_type = 'group' THEN
      -- Get group members
      participant_count := 2 + floor(random() * 5)::INT; -- 2-6 participants

      FOR i IN 1..participant_count LOOP
        SELECT user_id INTO split_user_id
        FROM group_members
        WHERE group_id = expense_record.group_id
        ORDER BY RANDOM()
        LIMIT 1;

        IF split_user_id IS NOT NULL THEN
          split_method := 'equal';
          computed_amount := (expense_record.amount / participant_count)::DECIMAL(12, 2);

          INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
          VALUES (expense_record.id, split_user_id, split_method, computed_amount, NOW())
          ON CONFLICT (expense_id, user_id) DO NOTHING;
        END IF;
      END LOOP;
    ELSE
      -- Friend context: split between two friends
      SELECT user_a, user_b INTO friend_user_a, friend_user_b
      FROM friendships
      WHERE id = expense_record.friendship_id;

      IF friend_user_a IS NOT NULL AND friend_user_b IS NOT NULL THEN
        computed_amount := (expense_record.amount / 2)::DECIMAL(12, 2);

        -- Split for user_a
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
        VALUES (expense_record.id, friend_user_a, 'equal', computed_amount, NOW())
        ON CONFLICT (expense_id, user_id) DO NOTHING;

        -- Split for user_b
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount, created_at)
        VALUES (expense_record.id, friend_user_b, 'equal', computed_amount, NOW())
        ON CONFLICT (expense_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Created expense splits';
END $$;

-- ========================================
-- PART 8: CREATE 100 PAYMENTS
-- ========================================
DO $$
DECLARE
  context_type TEXT;
  group_id UUID;
  friendship_id UUID;
  from_user UUID;
  to_user UUID;
  amount DECIMAL(12, 2);
  created_by UUID;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    context_type := CASE WHEN random() < 0.7 THEN 'group' ELSE 'friend' END;

    IF context_type = 'group' THEN
      SELECT id INTO group_id FROM groups ORDER BY RANDOM() LIMIT 1;
      friendship_id := NULL;
    ELSE
      SELECT id INTO friendship_id FROM friendships WHERE status = 'accepted' ORDER BY RANDOM() LIMIT 1;
      group_id := NULL;
    END IF;

    SELECT id INTO from_user FROM profiles ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO to_user FROM profiles ORDER BY RANDOM() LIMIT 1;

    WHILE from_user = to_user LOOP
      SELECT id INTO to_user FROM profiles ORDER BY RANDOM() LIMIT 1;
    END LOOP;

    SELECT id INTO created_by FROM profiles ORDER BY RANDOM() LIMIT 1;
    amount := (10 + random() * 990)::DECIMAL(12, 2);

    INSERT INTO payments (
      context_type, group_id, friendship_id, from_user, to_user, amount, currency,
      payment_date, note, created_by, created_at
    )
    VALUES (
      context_type,
      group_id,
      friendship_id,
      from_user,
      to_user,
      amount,
      'VND',
      CURRENT_DATE - (random() * 90)::INT,
      'Payment note ' || i,
      created_by,
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 payments';
END $$;

-- ========================================
-- PART 9: CREATE 100 NOTIFICATIONS
-- ========================================
DO $$
DECLARE
  notification_user_id UUID;
  notification_types TEXT[] := ARRAY[
    'expense_added', 'payment_received', 'friend_request', 'group_invite',
    'expense_updated', 'payment_sent', 'friend_accepted', 'group_created'
  ];
  notification_type TEXT;
  title TEXT;
  message TEXT;
  link TEXT;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO notification_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;
    notification_type := notification_types[1 + floor(random() * array_length(notification_types, 1))::INT];

    title := CASE notification_type
      WHEN 'expense_added' THEN 'New Expense Added'
      WHEN 'payment_received' THEN 'Payment Received'
      WHEN 'friend_request' THEN 'New Friend Request'
      WHEN 'group_invite' THEN 'Group Invitation'
      WHEN 'expense_updated' THEN 'Expense Updated'
      WHEN 'payment_sent' THEN 'Payment Sent'
      WHEN 'friend_accepted' THEN 'Friend Request Accepted'
      WHEN 'group_created' THEN 'New Group Created'
      ELSE 'Notification'
    END;

    message := 'You have a new ' || notification_type || ' notification';
    link := '/notifications/' || gen_random_uuid();

    INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
    VALUES (
      notification_user_id,
      notification_type,
      title,
      message,
      link,
      CASE WHEN random() < 0.5 THEN true ELSE false END,
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 notifications';
END $$;

-- ========================================
-- PART 10: CREATE 100 RECURRING EXPENSES
-- ========================================
DO $$
DECLARE
  template_expense_id UUID;
  frequencies TEXT[] := ARRAY['daily', 'weekly', 'monthly', 'yearly'];
  frequency TEXT;
  interval_value INT;
  next_occurrence DATE;
  end_date DATE;
  is_active BOOLEAN;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO template_expense_id FROM expenses ORDER BY RANDOM() LIMIT 1;

    frequency := frequencies[1 + floor(random() * array_length(frequencies, 1))::INT];
    interval_value := 1 + floor(random() * 3)::INT;
    next_occurrence := CURRENT_DATE + (random() * 30)::INT;
    end_date := CASE WHEN random() < 0.5 THEN next_occurrence + (random() * 365)::INT ELSE NULL END;
    is_active := CASE WHEN random() < 0.8 THEN true ELSE false END;

    INSERT INTO recurring_expenses (
      template_expense_id, frequency, "interval", next_occurrence, end_date,
      is_active, created_at, updated_at
    )
    VALUES (
      template_expense_id,
      frequency,
      interval_value,
      next_occurrence,
      end_date,
      is_active,
      NOW() - (random() * INTERVAL '90 days'),
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 recurring expenses';
END $$;

-- ========================================
-- PART 11: CREATE 100 USER SETTINGS
-- ========================================
DO $$
DECLARE
  settings_user_id UUID;
  currencies TEXT[] := ARRAY['VND', 'USD', 'EUR', 'JPY'];
  number_formats TEXT[] := ARRAY['vi-VN', 'en-US', 'ja-JP', 'de-DE'];
  profile_visibilities TEXT[] := ARRAY['public', 'friends', 'private'];
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO settings_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;

    INSERT INTO user_settings (
      user_id, default_currency, number_format, email_notifications,
      notify_on_expense_added, notify_on_payment_received, notify_on_friend_request,
      notify_on_group_invite, allow_friend_requests, allow_group_invites,
      profile_visibility, created_at, updated_at
    )
    VALUES (
      settings_user_id,
      currencies[1 + floor(random() * array_length(currencies, 1))::INT],
      number_formats[1 + floor(random() * array_length(number_formats, 1))::INT],
      CASE WHEN random() < 0.8 THEN true ELSE false END,
      CASE WHEN random() < 0.7 THEN true ELSE false END,
      CASE WHEN random() < 0.7 THEN true ELSE false END,
      CASE WHEN random() < 0.6 THEN true ELSE false END,
      CASE WHEN random() < 0.6 THEN true ELSE false END,
      CASE WHEN random() < 0.9 THEN true ELSE false END,
      CASE WHEN random() < 0.9 THEN true ELSE false END,
      profile_visibilities[1 + floor(random() * array_length(profile_visibilities, 1))::INT],
      NOW() - (random() * INTERVAL '365 days'),
      NOW() - (random() * INTERVAL '365 days')
    ) ON CONFLICT (user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 100 user settings';
END $$;

-- ========================================
-- PART 12: CREATE 100 ATTACHMENTS
-- ========================================
DO $$
DECLARE
  expense_id UUID;
  uploaded_by UUID;
  file_names TEXT[] := ARRAY[
    'receipt.jpg', 'invoice.pdf', 'bill.png', 'photo.jpg', 'document.pdf',
    'scan.jpg', 'image.png', 'file.pdf', 'receipt1.jpg', 'receipt2.jpg'
  ];
  mime_types TEXT[] := ARRAY['image/jpeg', 'image/png', 'application/pdf'];
  file_name TEXT;
  mime_type TEXT;
  file_size INT;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO expense_id FROM expenses ORDER BY RANDOM() LIMIT 1;
    SELECT id INTO uploaded_by FROM profiles ORDER BY RANDOM() LIMIT 1;

    file_name := file_names[1 + (i - 1) % array_length(file_names, 1)];
    mime_type := mime_types[1 + floor(random() * array_length(mime_types, 1))::INT];
    file_size := 10000 + floor(random() * 5000000)::INT; -- 10KB - 5MB

    INSERT INTO attachments (
      expense_id, storage_path, file_name, mime_type, file_size,
      uploaded_by, created_at
    )
    VALUES (
      expense_id,
      'receipts/' || gen_random_uuid() || '/' || file_name,
      file_name,
      mime_type,
      file_size,
      uploaded_by,
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 attachments';
END $$;

-- ========================================
-- PART 13: CREATE 100 AUDIT LOGS
-- ========================================
DO $$
DECLARE
  table_names TEXT[] := ARRAY['expenses', 'payments', 'groups', 'friendships', 'profiles'];
  table_name TEXT;
  record_id UUID;
  actions TEXT[] := ARRAY['INSERT', 'UPDATE', 'DELETE'];
  action TEXT;
  audit_user_id UUID;
  old_data JSONB;
  new_data JSONB;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    table_name := table_names[1 + floor(random() * array_length(table_names, 1))::INT];
    action := actions[1 + floor(random() * array_length(actions, 1))::INT];

    CASE table_name
      WHEN 'expenses' THEN SELECT id INTO record_id FROM expenses ORDER BY RANDOM() LIMIT 1;
      WHEN 'payments' THEN SELECT id INTO record_id FROM payments ORDER BY RANDOM() LIMIT 1;
      WHEN 'groups' THEN SELECT id INTO record_id FROM groups ORDER BY RANDOM() LIMIT 1;
      WHEN 'friendships' THEN SELECT id INTO record_id FROM friendships ORDER BY RANDOM() LIMIT 1;
      WHEN 'profiles' THEN SELECT id INTO record_id FROM profiles ORDER BY RANDOM() LIMIT 1;
    END CASE;

    SELECT id INTO audit_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;

    old_data := jsonb_build_object('field', 'old_value');
    new_data := jsonb_build_object('field', 'new_value');

    INSERT INTO audit_logs (
      table_name, record_id, operation, old_data, new_data, user_id, created_at
    )
    VALUES (
      table_name,
      record_id,
      action,
      CASE WHEN action = 'UPDATE' OR action = 'DELETE' THEN old_data ELSE NULL END,
      CASE WHEN action = 'INSERT' OR action = 'UPDATE' THEN new_data ELSE NULL END,
      audit_user_id,
      NOW() - (random() * INTERVAL '90 days')
    );
  END LOOP;

  RAISE NOTICE 'Created 100 audit logs';
END $$;

-- ========================================
-- PART 14: CREATE 100 BALANCE HISTORY ENTRIES
-- ========================================
DO $$
DECLARE
  balance_user_id UUID;
  balance_snapshot_date DATE;
  total_owed NUMERIC(10,2);
  total_lent NUMERIC(10,2);
  net_balance NUMERIC(10,2);
  balance_currency TEXT;
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    SELECT id INTO balance_user_id FROM profiles ORDER BY RANDOM() LIMIT 1;
    balance_snapshot_date := CURRENT_DATE - (random() * 90)::INT;
    balance_currency := CASE WHEN random() < 0.9 THEN 'VND' ELSE 'USD' END;

    total_owed := (random() * 10000)::NUMERIC(10,2);
    total_lent := (random() * 10000)::NUMERIC(10,2);
    net_balance := total_lent - total_owed;

    INSERT INTO balance_history (
      user_id, snapshot_date, total_owed, total_lent, net_balance, currency, created_at
    )
    VALUES (
      balance_user_id,
      balance_snapshot_date,
      total_owed,
      total_lent,
      net_balance,
      balance_currency,
      NOW() - (random() * INTERVAL '90 days')
    ) ON CONFLICT (user_id, snapshot_date, currency) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 100 balance history entries';
END $$;

-- ========================================
-- PART 15: CREATE DONATION SETTINGS
-- ========================================
DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO donation_settings (
      is_enabled, avatar_image_url, qr_code_image_url, cta_text, donate_message, bank_info, created_at, updated_at
    )
    VALUES (
      CASE WHEN random() < 0.3 THEN true ELSE false END,
      'https://example.com/avatar' || i || '.jpg',
      'https://example.com/qr' || i || '.png',
      jsonb_build_object('en', 'Support us', 'vi', 'Ủng hộ chúng tôi'),
      jsonb_build_object('en', 'Thank you!', 'vi', 'Cảm ơn bạn!'),
      jsonb_build_object('bank', 'Vietcombank', 'account', '1234567890'),
      NOW() - (random() * INTERVAL '180 days'),
      NOW() - (random() * INTERVAL '180 days')
    );
  END LOOP;

  RAISE NOTICE 'Created donation settings';
END $$;

-- ========================================
-- FINAL SUMMARY
-- ========================================
DO $$
BEGIN
  RAISE NOTICE 'Seed data generation completed successfully!';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - 1 test user (test@fairpay.local / password123)';
  RAISE NOTICE '  - 100 users (profiles)';
  RAISE NOTICE '  - 100 user roles';
  RAISE NOTICE '  - 100 groups';
  RAISE NOTICE '  - Group members (distributed)';
  RAISE NOTICE '  - 100 friendships';
  RAISE NOTICE '  - 100 expenses';
  RAISE NOTICE '  - Expense splits (distributed)';
  RAISE NOTICE '  - 100 payments';
  RAISE NOTICE '  - 100 notifications';
  RAISE NOTICE '  - 100 recurring expenses';
  RAISE NOTICE '  - 100 user settings';
  RAISE NOTICE '  - 100 attachments';
  RAISE NOTICE '  - 100 audit logs';
  RAISE NOTICE '  - 100 balance history entries';
  RAISE NOTICE '  - Donation settings';
  RAISE NOTICE '';
  RAISE NOTICE 'Login Credentials:';
  RAISE NOTICE '  - Email: test@fairpay.local';
  RAISE NOTICE '  - Password: password123';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: User long.lnt@amanotes.com will be created automatically when you login.';
  RAISE NOTICE '      Friendships for this user will be created automatically if profile exists.';
END $$;

-- ========================================
-- PART 16: CREATE FRIENDSHIPS FOR long.lnt@amanotes.com (if user exists)
-- ========================================
-- This section will create many friendships for long.lnt@amanotes.com
-- It will only run if the user profile already exists (e.g., after login)
DO $$
DECLARE
  long_user_id UUID;
  other_user_id UUID;
  friend_user_a UUID;
  friend_user_b UUID;
  i INT;
BEGIN
  -- Get the user ID for long.lnt@amanotes.com
  SELECT id INTO long_user_id FROM profiles WHERE email = 'long.lnt@amanotes.com' LIMIT 1;

  -- If user doesn't exist yet, skip this section
  IF long_user_id IS NULL THEN
    RAISE NOTICE 'Skipping friendships for long.lnt@amanotes.com - user not found (will be created on login)';
    RETURN;
  END IF;

  -- Create 80 friendships
  FOR i IN 1..80 LOOP
    SELECT id INTO other_user_id FROM profiles WHERE id != long_user_id ORDER BY RANDOM() LIMIT 1;

    -- Ensure ordering: user_a < user_b
    IF long_user_id < other_user_id THEN
      friend_user_a := long_user_id;
      friend_user_b := other_user_id;
    ELSE
      friend_user_a := other_user_id;
      friend_user_b := long_user_id;
    END IF;

    -- Check if friendship already exists
    IF NOT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_a = friend_user_a AND user_b = friend_user_b
    ) THEN
      INSERT INTO friendships (user_a, user_b, status, created_by, created_at, updated_at)
      VALUES (
        friend_user_a,
        friend_user_b,
        'accepted',
        long_user_id,
        NOW() - (random() * INTERVAL '180 days'),
        NOW() - (random() * INTERVAL '180 days')
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Created up to 80 friendships for long.lnt@amanotes.com';
END $$;

-- ========================================
-- PART 17: CREATE SPECIFIC EXPENSES FOR long.lnt@amanotes.com (if user exists)
-- ========================================
-- This section creates the specific transaction history from correct-from-request.sql
-- It will only run if long.lnt@amanotes.com profile exists (e.g., after login)
-- Note: This uses hardcoded UUIDs that must match your production data
DO $$
DECLARE
  long_user_id UUID;
  target_group_id UUID := '66630ca7-a0cd-4287-9c7f-727aed9cbaea';
  eid UUID;
  cnt_unpaid INT := 0;
  cnt_paid INT := 0;
BEGIN
  -- Get the user ID for long.lnt@amanotes.com
  SELECT id INTO long_user_id FROM profiles WHERE email = 'long.lnt@amanotes.com' LIMIT 1;

  -- If user doesn't exist yet, skip this section
  IF long_user_id IS NULL THEN
    RAISE NOTICE 'Skipping specific expenses for long.lnt@amanotes.com - user not found (will be created on login)';
    RAISE NOTICE '      After login, re-run this seed file or run PART 17 separately to create expenses';
    RETURN;
  END IF;

  -- Verify the group exists
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = target_group_id) THEN
    RAISE NOTICE 'Skipping specific expenses - target group not found: %', target_group_id;
    RETURN;
  END IF;

  -- Verify Long's user ID matches the expected UUID
  IF long_user_id != '9ac73f98-d6ff-54dd-8337-e96816e855c1' THEN
    RAISE NOTICE 'Warning: Long user ID (%) does not match expected UUID (9ac73f98-d6ff-54dd-8337-e96816e855c1)', long_user_id;
    RAISE NOTICE '         Expenses will use actual user ID: %', long_user_id;
  END IF;

  -- Delete existing expenses and splits for this group (optional - comment out if you want to keep existing data)
  -- DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = target_group_id);
  -- DELETE FROM expenses WHERE group_id = target_group_id;

  -- Create expenses from correct-from-request.sql
  -- Note: Using Long's actual user ID instead of hardcoded UUID
  -- All expenses from correct-from-request.sql are included below

  -- 1. OWES: Anh Thắng owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, false, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 2. OWES: Anh Thắng owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, false, long_user_id, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a90e67fa-d056-5163-a18e-7b3b63ec21ac', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 3. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-04', long_user_id, false, long_user_id, '2025-12-04 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 4. OWES: Hoàng Anh owes Long 33,000đ - emart
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'emart', 33000, 'VND', 'Shopping', '2025-12-04', long_user_id, false, long_user_id, '2025-12-04 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 33000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 5. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, false, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 6. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-12', long_user_id, false, long_user_id, '2025-12-12 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 7. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, false, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 8. OWES: Hoàng Anh owes Long 45,000đ - ăn trưa emart (Canh bí + Cơm)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa emart (Canh bí + Cơm)', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, false, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 9. OWES: Hoàng Anh owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, false, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 10. OWES: Anh Mike owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, false, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 11. OWES: Minh Hồ owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, false, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a7df138a-2668-5aad-af91-224817db1669', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 12. OWES: Đức owes Long 85,000đ - karaoke Apple Mũi Né
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke Apple Mũi Né', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, false, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c2e85b5-2db5-5da1-83fd-431337f840df', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_unpaid := cnt_unpaid + 1;

  -- 13. PAID: Hoàng Anh owes Long 30,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 30000, 'VND', 'Food & Drink', '2025-04-01', long_user_id, true, long_user_id, '2025-04-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 14. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-02', long_user_id, true, long_user_id, '2025-04-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 15. PAID: Hoàng Anh owes Long 100,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 100000, 'VND', 'Food & Drink', '2025-04-02', long_user_id, true, long_user_id, '2025-04-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 16. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-03', long_user_id, true, long_user_id, '2025-04-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 17. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-04', long_user_id, true, long_user_id, '2025-04-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 18. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-07', long_user_id, true, long_user_id, '2025-04-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 19. PAID: Hoàng Anh owes Long 30,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 30000, 'VND', 'Food & Drink', '2025-04-08', long_user_id, true, long_user_id, '2025-04-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 20. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-09', long_user_id, true, long_user_id, '2025-04-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 21. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-10', long_user_id, true, long_user_id, '2025-04-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 22. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-11', long_user_id, true, long_user_id, '2025-04-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 23. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-15', long_user_id, true, long_user_id, '2025-04-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 24. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-16', long_user_id, true, long_user_id, '2025-04-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 25. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-17', long_user_id, true, long_user_id, '2025-04-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 26. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-18', long_user_id, true, long_user_id, '2025-04-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 27. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-22', long_user_id, true, long_user_id, '2025-04-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 28. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-23', long_user_id, true, long_user_id, '2025-04-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 29. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-24', long_user_id, true, long_user_id, '2025-04-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 30. PAID: Hoàng Anh owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-04-25', long_user_id, true, long_user_id, '2025-04-25 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 31. PAID: Chị Kim (Ngân) owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', long_user_id, true, long_user_id, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 32. PAID: Chị Kim (Ngân) owes Long 62,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', long_user_id, true, long_user_id, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 62000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 33. PAID: Hoàng Anh owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', long_user_id, true, long_user_id, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 34. PAID: Thục Nghi owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-06-18', long_user_id, true, long_user_id, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 35. PAID: Thục Nghi owes Long 62,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 62000, 'VND', 'Entertainment', '2025-06-18', long_user_id, true, long_user_id, '2025-06-18 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 62000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 36. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 37. PAID: Chị Kim (Ngân) owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 70000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 38. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 39. PAID: Hoàng Anh owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 70000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 40. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 41. PAID: Thục Nghi owes Long 70,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 70000, 'VND', 'Entertainment', '2025-07-16', long_user_id, true, long_user_id, '2025-07-16 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 70000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 42. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', long_user_id, true, long_user_id, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 43. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', long_user_id, true, long_user_id, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 44. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-23', long_user_id, true, long_user_id, '2025-07-23 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 45. PAID: Chị Kim (Ngân) owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', long_user_id, true, long_user_id, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 46. PAID: Hoàng Anh owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', long_user_id, true, long_user_id, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 47. PAID: Thục Nghi owes Long 150,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 150000, 'VND', 'Food & Drink', '2025-07-30', long_user_id, true, long_user_id, '2025-07-30 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 150000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 48. PAID: Hoàng Anh owes Long 30,000đ - Grab
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'Grab', 30000, 'VND', 'Transportation', '2025-08-01', long_user_id, true, long_user_id, '2025-08-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 30000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 49. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-01', long_user_id, true, long_user_id, '2025-08-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 50. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-05', long_user_id, true, long_user_id, '2025-08-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 51. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-08', long_user_id, true, long_user_id, '2025-08-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 52. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-11', long_user_id, true, long_user_id, '2025-08-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 53. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-12', long_user_id, true, long_user_id, '2025-08-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 54. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-13', long_user_id, true, long_user_id, '2025-08-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 55. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-15', long_user_id, true, long_user_id, '2025-08-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 56. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-18', long_user_id, true, long_user_id, '2025-08-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 57. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-19', long_user_id, true, long_user_id, '2025-08-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 58. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-08-22', long_user_id, true, long_user_id, '2025-08-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 59. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-01', long_user_id, true, long_user_id, '2025-09-01 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 60. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-02', long_user_id, true, long_user_id, '2025-09-02 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 61. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-05', long_user_id, true, long_user_id, '2025-09-05 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 62. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-08', long_user_id, true, long_user_id, '2025-09-08 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 63. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-09', long_user_id, true, long_user_id, '2025-09-09 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 64. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-12', long_user_id, true, long_user_id, '2025-09-12 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 65. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-15', long_user_id, true, long_user_id, '2025-09-15 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 66. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-16', long_user_id, true, long_user_id, '2025-09-16 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 67. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-19', long_user_id, true, long_user_id, '2025-09-19 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 68. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-22', long_user_id, true, long_user_id, '2025-09-22 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 69. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-23', long_user_id, true, long_user_id, '2025-09-23 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 70. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-09-26', long_user_id, true, long_user_id, '2025-09-26 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 71. PAID: Hoàng Anh owes Long 29,000đ - iCloud
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'iCloud', 29000, 'VND', 'Utilities', '2025-10-01', long_user_id, true, long_user_id, '2025-10-01 09:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 29000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 72. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-03', long_user_id, true, long_user_id, '2025-10-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 73. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-06', long_user_id, true, long_user_id, '2025-10-06 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 74. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-07', long_user_id, true, long_user_id, '2025-10-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 75. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-10', long_user_id, true, long_user_id, '2025-10-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 76. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-13', long_user_id, true, long_user_id, '2025-10-13 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 77. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-14', long_user_id, true, long_user_id, '2025-10-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 78. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-17', long_user_id, true, long_user_id, '2025-10-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 79. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-20', long_user_id, true, long_user_id, '2025-10-20 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 80. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-21', long_user_id, true, long_user_id, '2025-10-21 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 81. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-24', long_user_id, true, long_user_id, '2025-10-24 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 82. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-27', long_user_id, true, long_user_id, '2025-10-27 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 83. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-28', long_user_id, true, long_user_id, '2025-10-28 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 84. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-10-31', long_user_id, true, long_user_id, '2025-10-31 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 85. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-03', long_user_id, true, long_user_id, '2025-11-03 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 86. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-04', long_user_id, true, long_user_id, '2025-11-04 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 87. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-07', long_user_id, true, long_user_id, '2025-11-07 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 88. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-10', long_user_id, true, long_user_id, '2025-11-10 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 89. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-11', long_user_id, true, long_user_id, '2025-11-11 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 90. PAID: Hoàng Anh owes Long 25,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 25000, 'VND', 'Food & Drink', '2025-11-14', long_user_id, true, long_user_id, '2025-11-14 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 25000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 91. PAID: Anh Mike a.k.a Mai owes Long 15,000đ - ăn sáng
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-17', long_user_id, true, long_user_id, '2025-11-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 15000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 92. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 93. PAID: Chị Kayen owes Long 15,000đ - ăn sáng
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn sáng', 15000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 15000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 94. PAID: Chị Kayen owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 97. PAID: Chị Ngân owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 98. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 99. PAID: Tuyến owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-11-18', long_user_id, true, long_user_id, '2025-11-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 100. PAID: Hoàng Anh owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', long_user_id, true, long_user_id, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 101. PAID: Chị Kayen owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', long_user_id, true, long_user_id, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 103. PAID: Thục Nghi owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', long_user_id, true, long_user_id, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 104. PAID: Tuyến owes Long 100,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 100000, 'VND', 'Food & Drink', '2025-11-19', long_user_id, true, long_user_id, '2025-11-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 100000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 105. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 50000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 106. PAID: Anh Tâm owes Long 56,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 56000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 56000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 107. PAID: Thục Nghi owes Long 40,000đ - ăn tối
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn tối', 40000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 40000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 109. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 110. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 111. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-11-20', long_user_id, true, long_user_id, '2025-11-20 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 112. PAID: Chị Kayen owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', long_user_id, true, long_user_id, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 39000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 114. PAID: Thịnh (Arin) owes Long 49,500đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 49500, 'VND', 'Food & Drink', '2025-12-02', long_user_id, true, long_user_id, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 49500) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 115. PAID: Thục Nghi owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', long_user_id, true, long_user_id, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 39000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 116. PAID: Tuyến owes Long 39,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 39000, 'VND', 'Food & Drink', '2025-12-02', long_user_id, true, long_user_id, '2025-12-02 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 39000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 117. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', long_user_id, true, long_user_id, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 118. PAID: Chị Ngân owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', long_user_id, true, long_user_id, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 50000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 119. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-03', long_user_id, true, long_user_id, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 121. PAID: Thục Nghi owes Long 35,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 35000, 'VND', 'Food & Drink', '2025-12-03', long_user_id, true, long_user_id, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 122. PAID: Tuyến owes Long 50,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 50000, 'VND', 'Food & Drink', '2025-12-03', long_user_id, true, long_user_id, '2025-12-03 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 50000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 123. PAID: Chị Ngân owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', long_user_id, true, long_user_id, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 124. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', long_user_id, true, long_user_id, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 126. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', long_user_id, true, long_user_id, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 127. PAID: Thục Nghi owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', long_user_id, true, long_user_id, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 128. PAID: Tuyến owes Long 45,000đ - ăn trưa (Ăn Chiều)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Chiều)', 45000, 'VND', 'Food & Drink', '2025-12-08', long_user_id, true, long_user_id, '2025-12-08 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 129. PAID: Hoàng Anh owes Long 45,000đ - ăn trưa (Ăn Trưa)
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa (Ăn Trưa)', 45000, 'VND', 'Food & Drink', '2025-12-09', long_user_id, true, long_user_id, '2025-12-09 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 130. PAID: Anh Mike a.k.a Mai owes Long 50,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 50000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '18441dda-4fdf-57fe-829e-5dd795f25937', 'equal', 50000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 131. PAID: Chị Ngân owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 132. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 133. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 134. PAID: Thục Nghi owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 135. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-10', long_user_id, true, long_user_id, '2025-12-10 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 136. PAID: Hoàng Anh owes Long 45,000đ - đi siêu thị
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'đi siêu thị', 45000, 'VND', 'Shopping', '2025-12-11', long_user_id, true, long_user_id, '2025-12-11 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '57ee3bab-6970-599f-b0b0-e0bbb443a3ff', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 137. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, true, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 139. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, true, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 140. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, true, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 141. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, true, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 142. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-15', long_user_id, true, long_user_id, '2025-12-15 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 143. PAID: Anh Tâm owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 144. PAID: Chị Kayen owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '8708e18c-144f-58f0-b34a-a7ddc9324b4f', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 146. PAID: Thái owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '05a7407e-c0d5-5707-8e7f-0344a63a0170', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 147. PAID: Thịnh (Arin) owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'be1fc676-78e0-5adf-b4ac-8b297d851f5b', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 148. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 149. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-16', long_user_id, true, long_user_id, '2025-12-16 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 150. PAID: Hải owes Long 35,000đ - cà phê
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'cà phê', 35000, 'VND', 'Food & Drink', '2025-12-17', long_user_id, true, long_user_id, '2025-12-17 10:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '4fab7e3e-949d-5d6b-b997-9b45db0a9407', 'equal', 35000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 154. PAID: Thục Nghi owes Long 5,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 5000, 'VND', 'Food & Drink', '2025-12-18', long_user_id, true, long_user_id, '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '1c66269b-d242-5ef0-afae-159b238ddf02', 'equal', 5000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 155. PAID: Tuyến owes Long 45,000đ - ăn trưa
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'ăn trưa', 45000, 'VND', 'Food & Drink', '2025-12-18', long_user_id, true, long_user_id, '2025-12-18 12:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '5836f6a6-2849-56cd-add9-03e1f8620ab5', 'equal', 45000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 156. PAID: Anh Tâm owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, true, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '259f239d-fc96-568a-a25b-561da5381407', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 157. PAID: Chị Ngân owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, true, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '9a6b9221-1f2f-5787-b557-d29084e9e1a4', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 158. PAID: Anh Đăng owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, true, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'e6a4c23e-e5a0-58ed-a5e5-5a8740428cf8', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 159. PAID: Anh Phúc owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, true, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, '541d8243-68ae-53e2-9a98-06dbae0ae01d', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  -- 160. PAID: Minh owes Long 85,000đ - karaoke
  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
  VALUES ('group', target_group_id, 'karaoke', 85000, 'VND', 'Entertainment', '2025-12-19', long_user_id, true, long_user_id, '2025-12-19 19:00:00') RETURNING id INTO eid;
  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
  VALUES (eid, 'a7df138a-2668-5aad-af91-224817db1669', 'equal', 85000) ON CONFLICT (expense_id, user_id) DO NOTHING;
  cnt_paid := cnt_paid + 1;

  RAISE NOTICE 'UNPAID transactions: %', cnt_unpaid;
  RAISE NOTICE 'PAID transactions: %', cnt_paid;
  RAISE NOTICE 'Total: %', cnt_unpaid + cnt_paid;
END $$;

COMMIT;

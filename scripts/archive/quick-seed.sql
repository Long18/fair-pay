-- Quick seed script that creates sample data using existing profiles
-- This script will work with any existing profiles in your database

-- First, let's check if we have any profiles
DO $$
DECLARE
    profile_count INTEGER;
    user_ids UUID[];
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
    user4_id UUID;
    user5_id UUID;
    friendship1_id UUID;
    friendship2_id UUID;
    friendship3_id UUID;
    expense1_id UUID;
    expense2_id UUID;
BEGIN
    -- Count existing profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;

    IF profile_count < 2 THEN
        RAISE NOTICE 'Not enough profiles found. Please create at least 2 users first.';
        RAISE NOTICE 'You can create users by signing up at http://localhost:5173/register';
        RETURN;
    END IF;

    RAISE NOTICE 'Found % profiles. Creating sample data...', profile_count;

    -- Get first 5 profile IDs (or as many as available)
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM (SELECT id FROM profiles ORDER BY created_at LIMIT 5) AS subquery;

    user1_id := user_ids[1];
    user2_id := user_ids[2];
    user3_id := COALESCE(user_ids[3], user1_id);
    user4_id := COALESCE(user_ids[4], user2_id);
    user5_id := COALESCE(user_ids[5], user1_id);

    RAISE NOTICE 'Using user IDs: %, %, %, %, %', user1_id, user2_id, user3_id, user4_id, user5_id;

    -- 1. USER SETTINGS
    RAISE NOTICE 'Creating user settings...';
    INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme)
    VALUES
        (user1_id, 'VND', 'DD/MM/YYYY', 'vi-VN', 'light'),
        (user2_id, 'VND', 'DD/MM/YYYY', 'vi-VN', 'dark')
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. FRIENDSHIPS
    RAISE NOTICE 'Creating friendships...';
    INSERT INTO friendships (user_a, user_b, status, created_by)
    VALUES
        (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), 'accepted', user1_id)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id INTO friendship1_id;

    IF user3_id != user1_id THEN
        INSERT INTO friendships (user_a, user_b, status, created_by)
        VALUES
            (LEAST(user1_id, user3_id), GREATEST(user1_id, user3_id), 'accepted', user1_id)
        ON CONFLICT (user_a, user_b) DO NOTHING
        RETURNING id INTO friendship2_id;
    END IF;

    IF user2_id != user3_id AND user3_id != user1_id THEN
        INSERT INTO friendships (user_a, user_b, status, created_by)
        VALUES
            (LEAST(user2_id, user3_id), GREATEST(user2_id, user3_id), 'pending', user2_id)
        ON CONFLICT (user_a, user_b) DO NOTHING
        RETURNING id INTO friendship3_id;
    END IF;

    -- 3. EXPENSES (Friend expenses only)
    RAISE NOTICE 'Creating expenses...';
    INSERT INTO expenses (description, amount, currency, paid_by_user_id, context_type, friendship_id, category, created_by)
    VALUES
        ('Coffee at Highlands', 100000, 'VND', user1_id, 'friend', friendship1_id, 'Food & Drink', user1_id)
    RETURNING id INTO expense1_id;

    INSERT INTO expenses (description, amount, currency, paid_by_user_id, context_type, friendship_id, category, created_by)
    VALUES
        ('Movie tickets', 200000, 'VND', user2_id, 'friend', friendship1_id, 'Entertainment', user2_id)
    RETURNING id INTO expense2_id;

    -- 4. EXPENSE SPLITS
    RAISE NOTICE 'Creating expense splits...';
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense1_id, user1_id, 50000, 'equal'),
        (expense1_id, user2_id, 50000, 'equal'),
        (expense2_id, user1_id, 100000, 'equal'),
        (expense2_id, user2_id, 100000, 'equal');

    -- 5. PAYMENTS
    RAISE NOTICE 'Creating payments...';
    INSERT INTO payments (from_user, to_user, amount, currency, context_type, friendship_id, created_by)
    VALUES
        (user2_id, user1_id, 50000, 'VND', 'friend', friendship1_id, user2_id);

    -- 6. NOTIFICATIONS
    RAISE NOTICE 'Creating notifications...';
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES
        (user1_id, 'expense_added', 'New Expense', 'Coffee at Highlands was added', false),
        (user2_id, 'payment_recorded', 'Payment Received', 'Payment of 50,000 VND received', false);

    RAISE NOTICE '✅ Sample data created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- User settings: 2';
    RAISE NOTICE '- Friendships: 2-3';
    RAISE NOTICE '- Expenses: 2';
    RAISE NOTICE '- Expense splits: 4';
    RAISE NOTICE '- Payments: 1';
    RAISE NOTICE '- Notifications: 2';

END $$;

-- Seed Database with Test Data Template
-- This script creates test data for the current logged-in user

-- Get the current user's ID
DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_friend1_id UUID;
    v_friend2_id UUID;
    v_group1_id UUID;
    v_group2_id UUID;
    v_friendship_id UUID;
    v_expense1_id UUID;
    v_expense2_id UUID;
    v_expense3_id UUID;
BEGIN
    -- Get all existing users (need at least 1)
    SELECT id, email, full_name INTO v_user_id, v_user_email, v_user_name
    FROM profiles
    ORDER BY created_at
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found! Please sign up at least one user first.';
    END IF;

    RAISE NOTICE 'Creating test data for user: % (%)', v_user_name, v_user_email;

    -- Get friend users (if they exist)
    SELECT id INTO v_friend1_id
    FROM profiles
    WHERE id != v_user_id
    ORDER BY created_at
    LIMIT 1;

    SELECT id INTO v_friend2_id
    FROM profiles
    WHERE id NOT IN (v_user_id, COALESCE(v_friend1_id, '00000000-0000-0000-0000-000000000000'))
    ORDER BY created_at
    LIMIT 1;

    -- Create friendships if we have friends
    -- Note: user_a must be < user_b due to check constraint
    IF v_friend1_id IS NOT NULL THEN
        INSERT INTO friendships (user_a, user_b, status, created_by)
        VALUES (
            LEAST(v_user_id, v_friend1_id),
            GREATEST(v_user_id, v_friend1_id),
            'accepted',
            v_user_id
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created friendship with friend 1';
    END IF;

    IF v_friend2_id IS NOT NULL THEN
        INSERT INTO friendships (user_a, user_b, status, created_by)
        VALUES (
            LEAST(v_user_id, v_friend2_id),
            GREATEST(v_user_id, v_friend2_id),
            'accepted',
            v_user_id
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created friendship with friend 2';
    END IF;

    -- Create test groups
    INSERT INTO groups (name, description, created_by)
    VALUES ('Weekend Trip', 'Group expenses for weekend getaway', v_user_id)
    RETURNING id INTO v_group1_id;

    INSERT INTO groups (name, description, created_by)
    VALUES ('Apartment Sharing', 'Shared apartment expenses', v_user_id)
    RETURNING id INTO v_group2_id;

    RAISE NOTICE 'Created groups: % and %', v_group1_id, v_group2_id;

    -- Add friends to groups if they exist (creator is added automatically by trigger)
    IF v_friend1_id IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES
            (v_group1_id, v_friend1_id, 'member'),
            (v_group2_id, v_friend1_id, 'member');
    END IF;

    IF v_friend2_id IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES
            (v_group1_id, v_friend2_id, 'member'),
            (v_group2_id, v_friend2_id, 'member');
    END IF;

    RAISE NOTICE 'Added members to groups';

    -- Get friendship ID for friend expenses
    IF v_friend1_id IS NOT NULL THEN
        SELECT id INTO v_friendship_id
        FROM friendships
        WHERE (user_a = v_user_id AND user_b = v_friend1_id)
           OR (user_a = v_friend1_id AND user_b = v_user_id)
        LIMIT 1;
    END IF;

    -- Create test expenses
    -- Expense 1: Hotel room (group expense, user paid)
    INSERT INTO expenses (
        context_type, description, amount, currency, category,
        paid_by_user_id, group_id, created_by,
        expense_date
    )
    VALUES (
        'group',
        'Hotel room for 2 nights',
        1500000,
        'VND',
        'accommodation',
        v_user_id,
        v_group1_id,
        v_user_id,
        NOW() - INTERVAL '2 days'
    )
    RETURNING id INTO v_expense1_id;

    -- Create splits for expense 1
    IF v_friend1_id IS NOT NULL AND v_friend2_id IS NOT NULL THEN
        -- Split 3 ways
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
        VALUES
            (v_expense1_id, v_user_id, 'equal', 500000),
            (v_expense1_id, v_friend1_id, 'equal', 500000),
            (v_expense1_id, v_friend2_id, 'equal', 500000);
    ELSIF v_friend1_id IS NOT NULL THEN
        -- Split 2 ways
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
        VALUES
            (v_expense1_id, v_user_id, 'equal', 750000),
            (v_expense1_id, v_friend1_id, 'equal', 750000);
    ELSE
        -- Just user
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
        VALUES (v_expense1_id, v_user_id, 'equal', 1500000);
    END IF;

    RAISE NOTICE 'Created expense 1: Hotel room';

    -- Expense 2: Dinner (personal expense between user and friend1)
    IF v_friend1_id IS NOT NULL AND v_friendship_id IS NOT NULL THEN
        INSERT INTO expenses (
            context_type, description, amount, currency, category,
            paid_by_user_id, friendship_id, created_by,
            expense_date
        )
        VALUES (
            'friend',
            'Dinner at Italian restaurant',
            800000,
            'VND',
            'food_drink',
            v_user_id,
            v_friendship_id,
            v_user_id,
            NOW() - INTERVAL '1 day'
        )
        RETURNING id INTO v_expense2_id;

        -- Split 2 ways
        INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
        VALUES
            (v_expense2_id, v_user_id, 'equal', 400000),
            (v_expense2_id, v_friend1_id, 'equal', 400000);

        RAISE NOTICE 'Created expense 2: Dinner';
    END IF;

    -- Expense 3: Groceries (friend1 paid, group expense)
    IF v_friend1_id IS NOT NULL THEN
        INSERT INTO expenses (
            context_type, description, amount, currency, category,
            paid_by_user_id, group_id, created_by,
            expense_date
        )
        VALUES (
            'group',
            'Grocery shopping for group',
            900000,
            'VND',
            'food_drink',
            v_friend1_id,
            v_group1_id,
            v_friend1_id,
            NOW()
        )
        RETURNING id INTO v_expense3_id;

        -- Create splits
        IF v_friend2_id IS NOT NULL THEN
            -- Split 3 ways
            INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
            VALUES
                (v_expense3_id, v_user_id, 'equal', 300000),
                (v_expense3_id, v_friend1_id, 'equal', 300000),
                (v_expense3_id, v_friend2_id, 'equal', 300000);
        ELSE
            -- Split 2 ways
            INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
            VALUES
                (v_expense3_id, v_user_id, 'equal', 450000),
                (v_expense3_id, v_friend1_id, 'equal', 450000);
        END IF;

        RAISE NOTICE 'Created expense 3: Groceries';
    END IF;

    -- Create a test payment (settlement)
    IF v_friend1_id IS NOT NULL THEN
        INSERT INTO payments (
            context_type, from_user, to_user, amount, currency,
            group_id, created_by, note
        )
        VALUES (
            'group',
            v_friend1_id,
            v_user_id,
            200000,
            'VND',
            v_group1_id,
            v_friend1_id,
            'Partial settlement for shared expenses'
        );

        RAISE NOTICE 'Created payment: Friend 1 -> User';
    END IF;

    RAISE NOTICE '✅ Test data created successfully!';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - 2 groups created';
    RAISE NOTICE '  - 1-3 expenses created (depending on number of users)';
    RAISE NOTICE '  - 0-1 payment created';
    RAISE NOTICE '  - Friendships created between available users';

END $$;

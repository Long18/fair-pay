#!/bin/bash

# Import comprehensive test data for dashboard testing
# Creates test users and sample data automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📊 Importing Test Data for Dashboard"
echo "====================================="
echo ""

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Find database container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase_db.*FairPay|supabase.*db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Supabase database container not found!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

echo "✅ Found database container: $DB_CONTAINER"
echo ""

# Create temporary SQL file with test data
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << 'SQL'
-- Comprehensive test data for dashboard testing
-- Creates test users, groups, expenses, payments, etc.

BEGIN;

-- Generate UUIDs for test users
DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
    group1_id UUID := gen_random_uuid();
    group2_id UUID := gen_random_uuid();
    expense1_id UUID;
    expense2_id UUID;
    expense3_id UUID;
    expense4_id UUID;
    expense5_id UUID;
    friendship1_id UUID;
    friendship2_id UUID;
    instance_uuid UUID;
BEGIN
    -- 1. CREATE AUTH USERS FIRST (required for profiles foreign key)
    RAISE NOTICE 'Creating auth users...';

    -- Get instance_id from auth schema
    SELECT id INTO instance_uuid FROM auth.instances LIMIT 1;
    IF instance_uuid IS NULL THEN
        instance_uuid := '00000000-0000-0000-0000-000000000000';
    END IF;

    -- Create auth users in auth.users table
    -- Note: Using a simple password hash for testing (not secure for production)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        aud, role, is_super_admin
    )
    SELECT
        user1_id, instance_uuid, 'alice@test.com',
        crypt('Test123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Alice Johnson"}'::jsonb, NOW(), NOW(),
        'authenticated', 'authenticated', false
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user1_id)
    UNION ALL
    SELECT
        user2_id, instance_uuid, 'bob@test.com',
        crypt('Test123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Bob Smith"}'::jsonb, NOW(), NOW(),
        'authenticated', 'authenticated', false
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user2_id)
    UNION ALL
    SELECT
        user3_id, instance_uuid, 'charlie@test.com',
        crypt('Test123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Charlie Brown"}'::jsonb, NOW(), NOW(),
        'authenticated', 'authenticated', false
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user3_id)
    UNION ALL
    SELECT
        user4_id, instance_uuid, 'diana@test.com',
        crypt('Test123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Diana Prince"}'::jsonb, NOW(), NOW(),
        'authenticated', 'authenticated', false
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user4_id)
    UNION ALL
    SELECT
        user5_id, instance_uuid, 'eve@test.com',
        crypt('Test123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Eve Wilson"}'::jsonb, NOW(), NOW(),
        'authenticated', 'authenticated', false
    WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user5_id);

    -- 2. CREATE TEST PROFILES (trigger should auto-create, but ensure they exist)
    RAISE NOTICE 'Creating test profiles...';

    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES
        (user1_id, 'alice@test.com', 'Alice Johnson', NULL),
        (user2_id, 'bob@test.com', 'Bob Smith', NULL),
        (user3_id, 'charlie@test.com', 'Charlie Brown', NULL),
        (user4_id, 'diana@test.com', 'Diana Prince', NULL),
        (user5_id, 'eve@test.com', 'Eve Wilson', NULL)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- 3. CREATE USER SETTINGS
    RAISE NOTICE 'Creating user settings...';

    INSERT INTO user_settings (user_id, default_currency, number_format, email_notifications)
    VALUES
        (user1_id, 'VND', 'vi-VN', true),
        (user2_id, 'VND', 'vi-VN', true),
        (user3_id, 'VND', 'vi-VN', true),
        (user4_id, 'VND', 'vi-VN', true),
        (user5_id, 'VND', 'vi-VN', true)
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. CREATE GROUPS
    RAISE NOTICE 'Creating groups...';

    INSERT INTO groups (id, name, description, created_by, simplify_debts)
    VALUES
        (group1_id, 'Weekend Trip', 'Weekend getaway expenses', user1_id, false),
        (group2_id, 'Office Lunch', 'Daily lunch expenses', user2_id, true)
    ON CONFLICT (id) DO NOTHING;

    -- 5. CREATE GROUP MEMBERS
    RAISE NOTICE 'Creating group members...';

    INSERT INTO group_members (group_id, user_id, role)
    VALUES
        (group1_id, user1_id, 'admin'),
        (group1_id, user2_id, 'member'),
        (group1_id, user3_id, 'member'),
        (group2_id, user2_id, 'admin'),
        (group2_id, user3_id, 'member'),
        (group2_id, user4_id, 'member'),
        (group2_id, user5_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- 6. CREATE FRIENDSHIPS
    RAISE NOTICE 'Creating friendships...';

    INSERT INTO friendships (user_a, user_b, status, created_by)
    SELECT
        LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), 'accepted', user1_id
    WHERE NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE user_a = LEAST(user1_id, user2_id) AND user_b = GREATEST(user1_id, user2_id)
    )
    RETURNING id INTO friendship1_id;

    INSERT INTO friendships (user_a, user_b, status, created_by)
    SELECT
        LEAST(user1_id, user3_id), GREATEST(user1_id, user3_id), 'accepted', user1_id
    WHERE NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE user_a = LEAST(user1_id, user3_id) AND user_b = GREATEST(user1_id, user3_id)
    )
    RETURNING id INTO friendship2_id;

    INSERT INTO friendships (user_a, user_b, status, created_by)
    SELECT
        LEAST(user2_id, user4_id), GREATEST(user2_id, user4_id), 'pending', user2_id
    WHERE NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE user_a = LEAST(user2_id, user4_id) AND user_b = GREATEST(user2_id, user4_id)
    );

    -- Get friendship IDs if they weren't set by RETURNING
    IF friendship1_id IS NULL THEN
        SELECT id INTO friendship1_id FROM friendships
        WHERE (user_a = LEAST(user1_id, user2_id) AND user_b = GREATEST(user1_id, user2_id))
        LIMIT 1;
    END IF;

    IF friendship2_id IS NULL THEN
        SELECT id INTO friendship2_id FROM friendships
        WHERE (user_a = LEAST(user1_id, user3_id) AND user_b = GREATEST(user1_id, user3_id))
        LIMIT 1;
    END IF;

    -- 7. CREATE GROUP EXPENSES
    RAISE NOTICE 'Creating group expenses...';

    INSERT INTO expenses (context_type, group_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('group', group1_id, 'Hotel booking', 2000000, 'VND', 'Accommodation', user1_id, user1_id, CURRENT_DATE - INTERVAL '5 days')
    RETURNING id INTO expense1_id;

    INSERT INTO expenses (context_type, group_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('group', group1_id, 'Restaurant dinner', 500000, 'VND', 'Food & Drink', user2_id, user2_id, CURRENT_DATE - INTERVAL '4 days')
    RETURNING id INTO expense2_id;

    INSERT INTO expenses (context_type, group_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('group', group1_id, 'Gas for car', 300000, 'VND', 'Transport', user3_id, user3_id, CURRENT_DATE - INTERVAL '3 days')
    RETURNING id INTO expense3_id;

    INSERT INTO expenses (context_type, group_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('group', group2_id, 'Lunch at restaurant', 250000, 'VND', 'Food & Drink', user2_id, user2_id, CURRENT_DATE - INTERVAL '2 days')
    RETURNING id INTO expense4_id;

    INSERT INTO expenses (context_type, group_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('group', group2_id, 'Coffee break', 150000, 'VND', 'Food & Drink', user4_id, user4_id, CURRENT_DATE - INTERVAL '1 days')
    RETURNING id INTO expense5_id;

    -- 8. CREATE EXPENSE SPLITS
    RAISE NOTICE 'Creating expense splits...';

    -- Hotel: split equally among 3 members
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense1_id, user1_id, 666666.67, 'equal'),
        (expense1_id, user2_id, 666666.67, 'equal'),
        (expense1_id, user3_id, 666666.66, 'equal')
    ON CONFLICT (expense_id, user_id) DO NOTHING;

    -- Restaurant: split equally among 3 members
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense2_id, user1_id, 166666.67, 'equal'),
        (expense2_id, user2_id, 166666.67, 'equal'),
        (expense2_id, user3_id, 166666.66, 'equal')
    ON CONFLICT (expense_id, user_id) DO NOTHING;

    -- Gas: split equally among 3 members
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense3_id, user1_id, 100000, 'equal'),
        (expense3_id, user2_id, 100000, 'equal'),
        (expense3_id, user3_id, 100000, 'equal')
    ON CONFLICT (expense_id, user_id) DO NOTHING;

    -- Lunch: split equally among 4 members
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense4_id, user2_id, 62500, 'equal'),
        (expense4_id, user3_id, 62500, 'equal'),
        (expense4_id, user4_id, 62500, 'equal'),
        (expense4_id, user5_id, 62500, 'equal')
    ON CONFLICT (expense_id, user_id) DO NOTHING;

    -- Coffee: split equally among 4 members
    INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
    VALUES
        (expense5_id, user2_id, 37500, 'equal'),
        (expense5_id, user3_id, 37500, 'equal'),
        (expense5_id, user4_id, 37500, 'equal'),
        (expense5_id, user5_id, 37500, 'equal')
    ON CONFLICT (expense_id, user_id) DO NOTHING;

    -- 9. CREATE FRIEND EXPENSES
    RAISE NOTICE 'Creating friend expenses...';

    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, paid_by_user_id, created_by, expense_date)
    VALUES
        ('friend', friendship1_id, 'Movie tickets', 200000, 'VND', 'Entertainment', user1_id, user1_id, CURRENT_DATE - INTERVAL '6 days'),
        ('friend', friendship1_id, 'Snacks', 50000, 'VND', 'Food & Drink', user2_id, user2_id, CURRENT_DATE - INTERVAL '5 days'),
        ('friend', friendship2_id, 'Concert tickets', 800000, 'VND', 'Entertainment', user1_id, user1_id, CURRENT_DATE - INTERVAL '4 days')
    ON CONFLICT DO NOTHING;

    -- 10. CREATE PAYMENTS
    RAISE NOTICE 'Creating payments...';

    INSERT INTO payments (context_type, group_id, from_user, to_user, amount, currency, created_by, payment_date)
    VALUES
        ('group', group1_id, user2_id, user1_id, 500000, 'VND', user2_id, CURRENT_DATE - INTERVAL '2 days'),
        ('group', group1_id, user3_id, user1_id, 200000, 'VND', user3_id, CURRENT_DATE - INTERVAL '1 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO payments (context_type, friendship_id, from_user, to_user, amount, currency, created_by, payment_date)
    VALUES
        ('friend', friendship1_id, user2_id, user1_id, 75000, 'VND', user2_id, CURRENT_DATE - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    -- 11. CREATE NOTIFICATIONS
    RAISE NOTICE 'Creating notifications...';

    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES
        (user1_id, 'expense_added', 'New Expense', 'Hotel booking was added to Weekend Trip', false),
        (user2_id, 'payment_received', 'Payment Received', 'Received 500,000 VND from Bob Smith', false),
        (user3_id, 'expense_added', 'New Expense', 'Gas for car was added to Weekend Trip', false),
        (user1_id, 'expense_added', 'New Expense', 'Movie tickets was added', false),
        (user2_id, 'expense_added', 'New Expense', 'Snacks was added', false)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Test data created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Profiles: 5';
    RAISE NOTICE '  - Groups: 2';
    RAISE NOTICE '  - Group Members: 7';
    RAISE NOTICE '  - Friendships: 3';
    RAISE NOTICE '  - Expenses: 8 (5 group + 3 friend)';
    RAISE NOTICE '  - Expense Splits: 15';
    RAISE NOTICE '  - Payments: 3';
    RAISE NOTICE '  - Notifications: 5';
    RAISE NOTICE '';
    RAISE NOTICE 'Test User Emails:';
    RAISE NOTICE '  - alice@test.com (User 1)';
    RAISE NOTICE '  - bob@test.com (User 2)';
    RAISE NOTICE '  - charlie@test.com (User 3)';
    RAISE NOTICE '  - diana@test.com (User 4)';
    RAISE NOTICE '  - eve@test.com (User 5)';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: These are test profiles only. To login, you need to create';
    RAISE NOTICE 'auth users in Supabase Studio: Authentication > Users';

END $$;

COMMIT;
SQL

echo "📝 Executing test data import..."
echo ""

# Execute SQL file
cat "$TEMP_SQL" | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test data imported successfully!"
    echo ""
    echo "📊 Data Summary:"
    echo "  - 5 test profiles created"
    echo "  - 2 groups with expenses"
    echo "  - 3 friendships"
    echo "  - 8 expenses (5 group + 3 friend)"
    echo "  - 15 expense splits"
    echo "  - 3 payments"
    echo "  - 5 notifications"
    echo ""
    echo "🔐 To login with test users:"
    echo "  1. Open Supabase Studio: pnpm supabase:studio"
    echo "  2. Go to Authentication > Users"
    echo "  3. Create auth users with these emails:"
    echo "     - alice@test.com"
    echo "     - bob@test.com"
    echo "     - charlie@test.com"
    echo "     - diana@test.com"
    echo "     - eve@test.com"
    echo ""
    echo "📈 View dashboard at: http://localhost:3000"
    echo ""
else
    echo ""
    echo "❌ Error importing test data. Please check the error messages above."
    rm -f "$TEMP_SQL"
    exit 1
fi

# Cleanup
rm -f "$TEMP_SQL"

echo "✅ Done!"

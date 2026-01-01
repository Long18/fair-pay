#!/bin/bash

# Generate comprehensive seed data with 10-50 entries per table
# Adapts to available profiles

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📊 Comprehensive Seed Data Generator"
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

# Get all profile IDs
PROFILE_IDS=()
while IFS= read -r line; do
    if [ -n "$line" ]; then
        PROFILE_IDS+=("$line")
    fi
done < <(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT id FROM profiles ORDER BY created_at;" 2>&1 | grep -v "^$" | tr -d ' ')

PROFILE_COUNT=${#PROFILE_IDS[@]}

if [ $PROFILE_COUNT -lt 2 ]; then
    echo "❌ Error: Need at least 2 profiles!"
    echo ""
    echo "Please create at least 2 users first:"
    echo "1. Start your app: pnpm dev"
    echo "2. Register users at: http://localhost:5173/register"
    echo "3. Then run this script again"
    exit 1
fi

echo "✅ Found $PROFILE_COUNT profile(s)"
echo ""

# Generate seed file
SEED_FILE="supabase/seed/comprehensive-seed.sql"
echo "📝 Generating comprehensive seed file: $SEED_FILE"
echo ""

# Categories for expenses
CATEGORIES=("Food & Drink" "Transportation" "Entertainment" "Shopping" "Utilities" "Healthcare" "Education" "Other")

# Generate random date within last 90 days
generate_date() {
    local days_ago=$((RANDOM % 90))
    echo "CURRENT_DATE - INTERVAL '$days_ago days'"
}

# Generate random amount in VND (50,000 to 5,000,000)
generate_amount() {
    local amount=$((50000 + RANDOM % 4950000))
    echo "$amount"
}

# Get random profile
get_random_profile() {
    local index=$((RANDOM % PROFILE_COUNT))
    echo "${PROFILE_IDS[$index]}"
}

# Get two different profiles
get_two_profiles() {
    local idx1=$((RANDOM % PROFILE_COUNT))
    local idx2=$((RANDOM % PROFILE_COUNT))
    while [ $idx1 -eq $idx2 ]; do
        idx2=$((RANDOM % PROFILE_COUNT))
    done
    local p1="${PROFILE_IDS[$idx1]}"
    local p2="${PROFILE_IDS[$idx2]}"
    # Ensure p1 < p2 (lexicographically)
    if [ "$p1" \> "$p2" ]; then
        local temp="$p1"
        p1="$p2"
        p2="$temp"
    fi
    echo "$p1|$p2"
}

cat > "$SEED_FILE" << EOF
-- Comprehensive Seed Data for FairPay Database
-- Auto-generated with 10-50 entries per table
-- Date: $(date +%Y-%m-%d)
-- Profiles used: $PROFILE_COUNT

-- ============================================
-- 1. USER_SETTINGS (${PROFILE_COUNT} entries)
-- ============================================

INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme, notifications_enabled, email_notifications, notify_on_expense_added, notify_on_payment_received, notify_on_friend_request, notify_on_group_invite, allow_friend_requests, allow_group_invites, profile_visibility)
VALUES
EOF

# Add user settings for each profile
for i in "${!PROFILE_IDS[@]}"; do
    THEME="light"
    case $((i % 3)) in
        1) THEME="dark" ;;
        2) THEME="system" ;;
    esac

    DATE_FORMAT="DD/MM/YYYY"
    if [ $((i % 2)) -eq 1 ]; then
        DATE_FORMAT="MM/DD/YYYY"
    fi

    VISIBILITY="friends"
    case $((i % 3)) in
        1) VISIBILITY="public" ;;
        2) VISIBILITY="private" ;;
    esac

    COMMA=","
    if [ $i -eq $(($PROFILE_COUNT - 1)) ]; then
        COMMA=""
    fi

    NOTIF_ENABLED="true"
    EMAIL_NOTIF="true"
    if [ $((i % 4)) -eq 0 ]; then
        NOTIF_ENABLED="false"
        EMAIL_NOTIF="false"
    fi

    echo "  ('${PROFILE_IDS[$i]}', 'VND', '$DATE_FORMAT', 'vi-VN', '$THEME', $NOTIF_ENABLED, $EMAIL_NOTIF, true, true, true, true, true, true, '$VISIBILITY')$COMMA" >> "$SEED_FILE"
done

cat >> "$SEED_FILE" << 'EOF'
ON CONFLICT (user_id) DO UPDATE SET
  default_currency = EXCLUDED.default_currency,
  theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================
-- 2. FRIENDSHIPS (20 entries)
-- ============================================
-- Create multiple friendships between available users

EOF

# Generate 20 friendships
echo "INSERT INTO friendships (user_a, user_b, status, created_by)" >> "$SEED_FILE"
echo "VALUES" >> "$SEED_FILE"

FIRST=true
FRIENDSHIP_COUNT=0
MAX_FRIENDSHIPS=20
TEMP_FILE=$(mktemp)

# Generate unique friendships (Bash 3.2 compatible)
while [ $FRIENDSHIP_COUNT -lt $MAX_FRIENDSHIPS ]; do
    # Get two different profiles
    PAIR=$(get_two_profiles)
    USER_A=$(echo "$PAIR" | cut -d'|' -f1)
    USER_B=$(echo "$PAIR" | cut -d'|' -f2)

    # Create unique key
    KEY="$USER_A|$USER_B"

    # Check if we already have this friendship (using temp file)
    if ! grep -q "^$KEY$" "$TEMP_FILE" 2>/dev/null; then
        echo "$KEY" >> "$TEMP_FILE"

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$SEED_FILE"
        fi

        STATUS="accepted"
        if [ $((FRIENDSHIP_COUNT % 5)) -eq 0 ]; then
            STATUS="pending"
        fi

        CREATED_BY="$USER_A"
        if [ $((FRIENDSHIP_COUNT % 2)) -eq 1 ]; then
            CREATED_BY="$USER_B"
        fi

        echo "  ('$USER_A', '$USER_B', '$STATUS', '$CREATED_BY')" >> "$SEED_FILE"

        FRIENDSHIP_COUNT=$((FRIENDSHIP_COUNT + 1))
    fi

    # Safety check to avoid infinite loop
    if [ $FRIENDSHIP_COUNT -ge $MAX_FRIENDSHIPS ]; then
        break
    fi
done

rm -f "$TEMP_FILE"

echo "ON CONFLICT DO NOTHING;" >> "$SEED_FILE"
echo "" >> "$SEED_FILE"

cat >> "$SEED_FILE" << 'EOF'

-- ============================================
-- 3. EXPENSES (40 entries)
-- ============================================
-- Generate expenses for existing friendships

DO $$
DECLARE
    friendship_rec RECORD;
    expense_id UUID;
    expense_count INTEGER := 0;
    max_expenses INTEGER := 40;
    category_list TEXT[] := ARRAY['Food & Drink', 'Transportation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other'];
    descriptions TEXT[] := ARRAY[
        'Coffee at Highlands', 'Grab ride to district 1', 'Dinner at Korean BBQ', 'Movie tickets at CGV',
        'Popcorn and drinks', 'Shared internet bill', 'Lunch at Pho restaurant', 'Shopping at Vincom',
        'Taxi to airport', 'Breakfast at local cafe', 'Bus fare', 'Concert tickets', 'Grocery shopping',
        'Electricity bill', 'Doctor visit', 'Online course', 'Parking fee', 'Restaurant dinner',
        'Uber ride', 'Netflix subscription', 'Gym membership', 'Phone bill', 'Book purchase',
        'Concert tickets', 'Beer at bar', 'Train ticket', 'Fast food lunch', 'Gas station',
        'Haircut', 'Laundry service', 'Taxi ride', 'Street food', 'Convenience store',
        'ATM withdrawal fee', 'Bank transfer fee', 'Insurance payment', 'Rent contribution',
        'Birthday gift', 'Wedding gift', 'Charity donation'
    ];
    amount_list INTEGER[] := ARRAY[120000, 85000, 450000, 320000, 150000, 300000, 180000, 1250000, 250000, 80000, 35000, 500000, 200000, 400000, 600000, 800000, 50000, 350000, 120000, 200000, 300000, 250000, 150000, 400000, 100000, 75000, 90000, 110000, 150000, 80000, 95000, 70000, 50000, 30000, 200000, 500000, 300000, 200000, 150000, 100000];
BEGIN
    FOR friendship_rec IN
        SELECT id, user_a, user_b
        FROM friendships
        WHERE status = 'accepted'
        ORDER BY created_at
        LIMIT 20
    LOOP
        -- Generate 2-3 expenses per friendship
        FOR i IN 1..(2 + (expense_count % 3)) LOOP
            IF expense_count >= max_expenses THEN
                EXIT;
            END IF;

            expense_id := gen_random_uuid();

            INSERT INTO expenses (
                id, context_type, friendship_id, description, amount, currency,
                category, expense_date, paid_by_user_id, is_payment, created_by
            )
            VALUES (
                expense_id,
                'friend',
                friendship_rec.id,
                descriptions[1 + (expense_count % array_length(descriptions, 1))],
                amount_list[1 + (expense_count % array_length(amount_list, 1))],
                'VND',
                category_list[1 + (expense_count % array_length(category_list, 1))],
                CURRENT_DATE - INTERVAL '1 day' * (expense_count % 90),
                CASE WHEN (expense_count % 2) = 0 THEN friendship_rec.user_a ELSE friendship_rec.user_b END,
                false,
                CASE WHEN (expense_count % 2) = 0 THEN friendship_rec.user_a ELSE friendship_rec.user_b END
            )
            ON CONFLICT DO NOTHING;

            expense_count := expense_count + 1;
        END LOOP;

        IF expense_count >= max_expenses THEN
            EXIT;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 4. EXPENSE_SPLITS (80 entries - 2 per expense)
-- ============================================

INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
SELECT
    e.id,
    u.id,
    'equal',
    e.amount / 2
FROM expenses e
CROSS JOIN LATERAL (
    SELECT user_a as id FROM friendships WHERE id = e.friendship_id
    UNION
    SELECT user_b as id FROM friendships WHERE id = e.friendship_id
) u
WHERE e.context_type = 'friend'
  AND NOT EXISTS (
    SELECT 1 FROM expense_splits es
    WHERE es.expense_id = e.id AND es.user_id = u.id
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. PAYMENTS (30 entries)
-- ============================================

DO $$
DECLARE
    friendship_rec RECORD;
    payment_count INTEGER := 0;
    max_payments INTEGER := 30;
    amount_list INTEGER[] := ARRAY[102500, 85000, 60000, 500000, 150000, 200000, 300000, 400000, 250000, 180000, 120000, 95000, 75000, 50000, 350000];
BEGIN
    FOR friendship_rec IN
        SELECT id, user_a, user_b
        FROM friendships
        WHERE status = 'accepted'
        ORDER BY created_at
        LIMIT 20
    LOOP
        IF payment_count >= max_payments THEN
            EXIT;
        END IF;

        -- Generate 1-2 payments per friendship
        FOR i IN 1..(1 + (payment_count % 2)) LOOP
            IF payment_count >= max_payments THEN
                EXIT;
            END IF;

            INSERT INTO payments (
                context_type, friendship_id, from_user, to_user, amount, currency,
                payment_date, note, created_by
            )
            VALUES (
                'friend',
                friendship_rec.id,
                CASE WHEN (payment_count % 2) = 0 THEN friendship_rec.user_a ELSE friendship_rec.user_b END,
                CASE WHEN (payment_count % 2) = 0 THEN friendship_rec.user_b ELSE friendship_rec.user_a END,
                amount_list[1 + (payment_count % array_length(amount_list, 1))],
                'VND',
                CURRENT_DATE - INTERVAL '1 day' * (payment_count % 60),
                'Settlement payment #' || (payment_count + 1),
                CASE WHEN (payment_count % 2) = 0 THEN friendship_rec.user_a ELSE friendship_rec.user_b END
            )
            ON CONFLICT DO NOTHING;

            payment_count := payment_count + 1;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 6. ATTACHMENTS (25 entries)
-- ============================================

DO $$
DECLARE
    expense_rec RECORD;
    attachment_count INTEGER := 0;
    max_attachments INTEGER := 25;
    mime_types TEXT[] := ARRAY['image/jpeg', 'image/png', 'application/pdf'];
    file_names TEXT[] := ARRAY['receipt.jpg', 'invoice.pdf', 'bill.png', 'photo.jpg', 'document.pdf'];
BEGIN
    FOR expense_rec IN
        SELECT id, created_by
        FROM expenses
        WHERE context_type = 'friend'
        ORDER BY expense_date DESC
        LIMIT 40
    LOOP
        IF attachment_count >= max_attachments THEN
            EXIT;
        END IF;

        -- Attach receipt to 60% of expenses
        IF (attachment_count % 10) < 6 THEN
            INSERT INTO attachments (
                expense_id, storage_path, file_name, mime_type, file_size, created_by
            )
            VALUES (
                expense_rec.id,
                expense_rec.created_by || '/' || expense_rec.id || '/' || file_names[1 + (attachment_count % array_length(file_names, 1))],
                file_names[1 + (attachment_count % array_length(file_names, 1))],
                mime_types[1 + (attachment_count % array_length(mime_types, 1))],
                50000 + (attachment_count % 2000000),
                expense_rec.created_by
            )
            ON CONFLICT DO NOTHING;

            attachment_count := attachment_count + 1;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 7. NOTIFICATIONS (50 entries)
-- ============================================

DO $$
DECLARE
    expense_rec RECORD;
    payment_rec RECORD;
    friendship_rec RECORD;
    notification_count INTEGER := 0;
    max_notifications INTEGER := 50;
    user_id UUID;
BEGIN
    -- Expense added notifications (20)
    FOR expense_rec IN
        SELECT e.id, e.description, e.friendship_id, f.user_a, f.user_b, e.created_by
        FROM expenses e
        JOIN friendships f ON e.friendship_id = f.id
        WHERE e.context_type = 'friend'
        ORDER BY e.expense_date DESC
        LIMIT 20
    LOOP
        -- Notify the other user
        user_id := CASE
            WHEN expense_rec.created_by = expense_rec.user_a THEN expense_rec.user_b
            ELSE expense_rec.user_a
        END;

        INSERT INTO notifications (
            user_id, type, title, message, link, related_id, is_read, created_at
        )
        VALUES (
            user_id,
            'expense_added',
            'New Expense',
            'New expense: ' || expense_rec.description,
            '/expenses/show/' || expense_rec.id,
            expense_rec.id,
            (notification_count % 3) = 0,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (notification_count % 30)
        )
        ON CONFLICT DO NOTHING;

        notification_count := notification_count + 1;
    END LOOP;

    -- Payment recorded notifications (15)
    FOR payment_rec IN
        SELECT p.id, p.amount, p.currency, p.friendship_id, p.from_user, p.to_user
        FROM payments p
        WHERE p.context_type = 'friend'
        ORDER BY p.payment_date DESC
        LIMIT 15
    LOOP
        INSERT INTO notifications (
            user_id, type, title, message, link, related_id, is_read, created_at
        )
        VALUES (
            payment_rec.to_user,
            'payment_recorded',
            'Payment Recorded',
            'Payment of ' || payment_rec.amount || ' ' || payment_rec.currency || ' received',
            '/friends/show/' || payment_rec.friendship_id,
            payment_rec.id,
            (notification_count % 4) = 0,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (notification_count % 30)
        )
        ON CONFLICT DO NOTHING;

        notification_count := notification_count + 1;
    END LOOP;

    -- Friend request notifications (10)
    FOR friendship_rec IN
        SELECT id, user_a, user_b, created_by
        FROM friendships
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        user_id := CASE
            WHEN friendship_rec.created_by = friendship_rec.user_a THEN friendship_rec.user_b
            ELSE friendship_rec.user_a
        END;

        INSERT INTO notifications (
            user_id, type, title, message, link, related_id, is_read, created_at
        )
        VALUES (
            user_id,
            'friend_request',
            'Friend Request',
            'You have a new friend request',
            '/friends',
            friendship_rec.id,
            false,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (notification_count % 30)
        )
        ON CONFLICT DO NOTHING;

        notification_count := notification_count + 1;
    END LOOP;

    -- Friend accepted notifications (5)
    FOR friendship_rec IN
        SELECT id, user_a, user_b, created_by
        FROM friendships
        WHERE status = 'accepted'
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        user_id := CASE
            WHEN friendship_rec.created_by = friendship_rec.user_a THEN friendship_rec.user_b
            ELSE friendship_rec.user_a
        END;

        INSERT INTO notifications (
            user_id, type, title, message, link, related_id, is_read, created_at
        )
        VALUES (
            user_id,
            'friend_accepted',
            'Friend Request Accepted',
            'Your friend request was accepted',
            '/friends/show/' || friendship_rec.id,
            friendship_rec.id,
            true,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (notification_count % 30)
        )
        ON CONFLICT DO NOTHING;

        notification_count := notification_count + 1;
    END LOOP;
END $$;

-- ============================================
-- 8. RECURRING_EXPENSES (15 entries)
-- ============================================

DO $$
DECLARE
    expense_rec RECORD;
    recurring_count INTEGER := 0;
    max_recurring INTEGER := 15;
    frequency_list TEXT[] := ARRAY['weekly', 'monthly'];
BEGIN
    FOR expense_rec IN
        SELECT e.id, e.friendship_id, e.created_by
        FROM expenses e
        WHERE e.context_type = 'friend'
        ORDER BY e.expense_date DESC
        LIMIT 20
    LOOP
        IF recurring_count >= max_recurring THEN
            EXIT;
        END IF;

        -- Make 75% of expenses recurring
        IF (recurring_count % 4) < 3 THEN
            INSERT INTO recurring_expenses (
                template_expense_id, frequency, "interval", start_date, end_date,
                next_occurrence, last_created_at, is_active, notify_before_days,
                context_type, friendship_id, created_by
            )
            VALUES (
                expense_rec.id,
                frequency_list[1 + (recurring_count % array_length(frequency_list, 1))],
                1,
                CURRENT_DATE - INTERVAL '1 day' * (30 + recurring_count * 7),
                CASE WHEN (recurring_count % 3) = 0 THEN NULL ELSE CURRENT_DATE + INTERVAL '1 day' * (180 + recurring_count * 7) END,
                CURRENT_DATE + INTERVAL '1 day' * (7 + recurring_count),
                CURRENT_DATE - INTERVAL '1 day' * (7 + recurring_count),
                (recurring_count % 5) != 0,
                1 + (recurring_count % 3),
                'friend',
                expense_rec.friendship_id,
                expense_rec.created_by
            )
            ON CONFLICT DO NOTHING;

            recurring_count := recurring_count + 1;
        END IF;
    END LOOP;
END $$;

EOF

echo "✅ Comprehensive seed file generated: $SEED_FILE"
echo ""
echo "📊 This seed file contains:"
echo "   - User Settings: $PROFILE_COUNT entries"
echo "   - Friendships: 20 entries"
echo "   - Expenses: 40 entries"
echo "   - Expense Splits: ~80 entries (2 per expense)"
echo "   - Payments: 30 entries"
echo "   - Attachments: 25 entries"
echo "   - Notifications: 50 entries"
echo "   - Recurring Expenses: 15 entries"
echo ""
echo "🚀 Run it with:"
echo "   cat $SEED_FILE | docker exec -i $DB_CONTAINER psql -U postgres -d postgres"

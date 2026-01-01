#!/bin/bash

# Generate smart seed data that only uses existing profiles
# This creates a seed file that works with any number of profiles

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧠 Smart Seed Data Generator"
echo "============================"
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

# Get profile IDs (bash 3.2 compatible)
PROFILE_IDS=()
while IFS= read -r line; do
    if [ -n "$line" ]; then
        PROFILE_IDS+=("$line")
    fi
done < <(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT id FROM profiles ORDER BY created_at LIMIT 5;" 2>&1 | grep -v "^$" | tr -d ' ' | head -5)

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
for i in "${!PROFILE_IDS[@]}"; do
    echo "   User $((i+1)): ${PROFILE_IDS[$i]}"
done
echo ""

# Generate seed file
SEED_FILE="supabase/seed/smart-seed.sql"
echo "📝 Generating smart seed file: $SEED_FILE"
echo ""

cat > "$SEED_FILE" << EOF
-- Smart Seed Data for FairPay Database
-- Auto-generated based on existing profiles
-- Date: $(date +%Y-%m-%d)
-- Profiles used: $PROFILE_COUNT

-- ============================================
-- 1. USER_SETTINGS
-- ============================================

INSERT INTO user_settings (user_id, default_currency, date_format, number_format, theme, notifications_enabled, email_notifications, notify_on_expense_added, notify_on_payment_received, notify_on_friend_request, notify_on_group_invite, allow_friend_requests, allow_group_invites, profile_visibility)
VALUES
EOF

# Add user settings for each profile
for i in "${!PROFILE_IDS[@]}"; do
    THEME="light"
    if [ $((i % 3)) -eq 1 ]; then
        THEME="dark"
    elif [ $((i % 3)) -eq 2 ]; then
        THEME="system"
    fi

    COMMA=","
    if [ $i -eq $(($PROFILE_COUNT - 1)) ]; then
        COMMA=""
    fi

    echo "  ('${PROFILE_IDS[$i]}', 'VND', 'DD/MM/YYYY', 'vi-VN', '$THEME', true, true, true, true, true, true, true, true, 'friends')$COMMA" >> "$SEED_FILE"
done

cat >> "$SEED_FILE" << 'EOF'
ON CONFLICT (user_id) DO UPDATE SET
  default_currency = EXCLUDED.default_currency,
  theme = EXCLUDED.theme,
  notifications_enabled = EXCLUDED.notifications_enabled;

-- ============================================
-- 2. FRIENDSHIPS
-- ============================================
-- Create friendships between available users
-- Ensure user_a < user_b (constraint requirement)

EOF

# Create friendships (only if we have at least 2 profiles)
if [ $PROFILE_COUNT -ge 2 ]; then
    echo "INSERT INTO friendships (user_a, user_b, status, created_by)" >> "$SEED_FILE"
    echo "VALUES" >> "$SEED_FILE"

    FIRST=true
    for i in "${!PROFILE_IDS[@]}"; do
        for j in "${!PROFILE_IDS[@]}"; do
            if [ $i -lt $j ]; then
                USER_A="${PROFILE_IDS[$i]}"
                USER_B="${PROFILE_IDS[$j]}"

                # Ensure user_a < user_b (lexicographically for UUIDs)
                if [ "$USER_A" \> "$USER_B" ]; then
                    TEMP="$USER_A"
                    USER_A="$USER_B"
                    USER_B="$TEMP"
                    CREATED_BY="$USER_B"
                else
                    CREATED_BY="$USER_A"
                fi

                if [ "$FIRST" = true ]; then
                    FIRST=false
                else
                    echo "," >> "$SEED_FILE"
                fi

                echo "  ('$USER_A', '$USER_B', 'accepted', '$CREATED_BY')" >> "$SEED_FILE"
            fi
        done
    done

    echo "ON CONFLICT DO NOTHING;" >> "$SEED_FILE"
    echo "" >> "$SEED_FILE"
fi

# Generate expenses after friendships are created
# We'll use a subquery to get the friendship ID
if [ "$PROFILE_COUNT" -ge 2 ]; then
    USER1="${PROFILE_IDS[0]}"
    USER2="${PROFILE_IDS[1]}"

    # Ensure user_a < user_b
    if [ "$USER1" \> "$USER2" ]; then
        TEMP="$USER1"
        USER1="$USER2"
        USER2="$TEMP"
    fi
    cat >> "$SEED_FILE" << EOF

-- ============================================
-- 3. EXPENSES (Friend expenses only)
-- ============================================
-- Note: These will be created after the friendship exists
-- The friendship_id will be resolved at runtime

DO \$\$
DECLARE
    friendship_uuid UUID;
    expense1_uuid UUID;
    expense2_uuid UUID;
    expense3_uuid UUID;
BEGIN
    -- Get the friendship ID
    SELECT id INTO friendship_uuid
    FROM friendships
    WHERE user_a = '$USER1' AND user_b = '$USER2'
    LIMIT 1;

    IF friendship_uuid IS NULL THEN
        RAISE NOTICE 'No friendship found, skipping expenses';
        RETURN;
    END IF;

    -- Create expenses
    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Coffee at Highlands', 120000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '5 days', '$USER1', false, '$USER1')
    RETURNING id INTO expense1_uuid;

    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Grab ride to district 1', 85000, 'VND', 'Transportation', CURRENT_DATE - INTERVAL '3 days', '$USER2', false, '$USER2')
    RETURNING id INTO expense2_uuid;

    INSERT INTO expenses (context_type, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by)
    VALUES
      ('friend', friendship_uuid, 'Dinner at Korean BBQ', 450000, 'VND', 'Food & Drink', CURRENT_DATE - INTERVAL '1 day', '$USER1', false, '$USER1')
    RETURNING id INTO expense3_uuid;

    -- Create expense splits
    INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)
    VALUES
      (expense1_uuid, '$USER1', 'equal', 60000),
      (expense1_uuid, '$USER2', 'equal', 60000),
      (expense2_uuid, '$USER1', 'equal', 42500),
      (expense2_uuid, '$USER2', 'equal', 42500),
      (expense3_uuid, '$USER1', 'equal', 225000),
      (expense3_uuid, '$USER2', 'equal', 225000)
    ON CONFLICT DO NOTHING;

    -- Create payment
    INSERT INTO payments (context_type, friendship_id, from_user, to_user, amount, currency, payment_date, note, created_by)
    VALUES
      ('friend', friendship_uuid, '$USER2', '$USER1', 102500, 'VND', CURRENT_DATE - INTERVAL '2 days', 'Settling coffee and grab expenses', '$USER2')
    ON CONFLICT DO NOTHING;
END \$\$;

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================

INSERT INTO notifications (user_id, type, title, message, link, related_id, is_read, created_at)
VALUES
  ('$USER2', 'expense_added', 'New Expense', 'New expense "Coffee at Highlands" was added', '/expenses', NULL, false, CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('$USER1', 'payment_recorded', 'Payment Recorded', 'Payment of 102,500 VND received', '/friends', NULL, false, CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

EOF
else
    cat >> "$SEED_FILE" << EOF
-- ============================================
-- 3-6. Additional Data
-- ============================================
-- Note: Create at least one friendship first to generate expenses, payments, etc.
-- Run this seed after creating friendships manually or use pnpm db:seed-quick

EOF
fi

echo "✅ Smart seed file generated: $SEED_FILE"
echo ""
echo "📊 This seed file:"
echo "   - Uses only existing profiles ($PROFILE_COUNT profiles)"
echo "   - Creates friendships between available users"
echo "   - Generates expenses, splits, and payments"
echo "   - Works with any number of profiles (minimum 2)"
echo ""
echo "🚀 Run it with:"
echo "   cat $SEED_FILE | docker exec -i $DB_CONTAINER psql -U postgres -d postgres"

#!/bin/bash

# Script to seed local Supabase database with friends & balances test data
# Prerequisites: Supabase must be running locally (pnpm supabase:start)
# Note: You must be logged in to Supabase for this to work (auth.uid() is required)

set -e

echo "👥 FairPay Friends & Balances Test Data Seeder"
echo "================================================"

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Check if Docker container exists
if ! docker ps | grep -q supabase_db_FairPay; then
    echo "❌ Error: Supabase database container is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

echo "✅ Supabase database is running"
echo ""

# Check if seed file exists
if [ ! -f "supabase/seed/friends-balances-seed.sql" ]; then
    echo "❌ Error: Seed file not found: supabase/seed/friends-balances-seed.sql"
    exit 1
fi

echo "📝 Reading seed data from: supabase/seed/friends-balances-seed.sql"
echo ""
echo "ℹ️  Note: Script will use authenticated user if available,"
echo "   otherwise it will use the first user from profiles,"
echo "   or create a test user if no users exist."
echo ""

# Execute SQL file
echo "🚀 Seeding friends & balances test data..."
cat supabase/seed/friends-balances-seed.sql | docker exec -i supabase_db_FairPay psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Friends & balances test data seeded successfully!"
    echo ""
    echo "📊 Test Data Created:"
    echo "   - 5 friendships (3 accepted, 2 pending)"
    echo "   - 6 expenses between friends"
    echo "   - 2 payments to settle balances"
    echo ""
    echo "🧪 Test Scenarios:"
    echo "   - Alice: You owe ₫250,000 (after partial payment)"
    echo "   - Bob: Bob owes you ₫700,000"
    echo "   - Charlie: Pending request (you sent)"
    echo "   - Diana: Pending request (they sent)"
    echo "   - Eve: Balance settled (₫0)"
    echo ""
    echo "🔍 Test Functions:"
    echo "   - get_friendship_activity(friendship_id)"
    echo "   - get_user_debts_aggregated()"
    echo "   - get_user_balance()"
    echo ""
    echo "📱 Next steps:"
    echo "   - Check Friends tab in the app"
    echo "   - View balances in Dashboard"
    echo "   - Test balance calculations"
else
    echo ""
    echo "❌ Error seeding data. Please check the error messages above."
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Make sure you're logged in to the app"
    echo "   2. Check that all migrations are applied"
    echo "   3. Verify Supabase is running: pnpm supabase:status"
    exit 1
fi

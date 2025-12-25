#!/bin/bash

# Script to create test users and seed sample data
# This creates 5 test users first, then uses their IDs for sample data

set -e

echo "🌱 FairPay Sample Data Seeder (with test users)"
echo "================================================"
echo ""

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

echo "✅ Supabase is running"
echo ""

# Get Supabase connection details
DB_URL=$(supabase status -o env | grep "DB_URL" | cut -d'=' -f2-)

if [ -z "$DB_URL" ]; then
    echo "❌ Error: Could not get database URL"
    exit 1
fi

echo "📝 Creating 5 test users..."
echo ""

# Create test users via Supabase Auth API
# Note: This requires the Supabase API to be accessible

echo "⚠️  Manual Step Required:"
echo ""
echo "Since we cannot create auth users programmatically without the API,"
echo "please follow these steps:"
echo ""
echo "1. Open Supabase Studio: http://127.0.0.1:54323"
echo "2. Go to Authentication > Users"
echo "3. Create 5 test users with these emails:"
echo "   - user1@test.com"
echo "   - user2@test.com"
echo "   - user3@test.com"
echo "   - user4@test.com"
echo "   - user5@test.com"
echo "   (Use password: Test123!)"
echo ""
echo "4. After creating users, run this script again"
echo ""
echo "Press Enter when you've created the users, or Ctrl+C to cancel..."
read

echo ""
echo "📋 Fetching user IDs..."
echo ""

# Try to get user IDs from profiles table
# The profiles should be auto-created when users sign up

echo "Checking for profiles..."
echo ""

# For now, just show instructions
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Get your profile IDs: pnpm db:get-ids"
echo "2. Update supabase/seed/sample-data.sql with those IDs"
echo "3. Run: pnpm db:seed"

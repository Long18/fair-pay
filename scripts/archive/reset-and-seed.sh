#!/bin/bash

# Reset and Seed Database Script
# This script clears all test data and creates fresh template data

echo "🧹 Clearing all test data..."
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/reset-database.sql

echo ""
echo "🌱 Seeding fresh test data..."
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/seed-test-data.sql

echo ""
echo "✅ Database reset and seed complete!"
echo ""
echo "📊 Test data created:"
echo "   - 2 groups (Weekend Trip, Apartment Sharing)"
echo "   - 3 expenses (Hotel, Dinner, Groceries)"
echo "   - 1 payment (settlement)"
echo "   - Friendships between all existing users"
echo ""
echo "🔄 Refresh your browser to see the new data!"

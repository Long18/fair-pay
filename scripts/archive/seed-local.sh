#!/bin/bash

# Script to seed local Supabase database with sample data
# Prerequisites: Supabase must be running locally (pnpm supabase:start)

set -e

echo "🌱 FairPay Sample Data Seeder"
echo "================================"

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

# Check if sample data file exists
if [ ! -f "supabase/seed/sample-data.sql" ]; then
    echo "❌ Error: Sample data file not found: supabase/seed/sample-data.sql"
    exit 1
fi

echo "📝 Reading sample data from: supabase/seed/sample-data.sql"
echo ""

# Execute SQL file
echo "🚀 Seeding sample data..."
cat supabase/seed/sample-data.sql | docker exec -i supabase_db_FairPay psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Sample data seeded successfully!"
    echo ""
    echo "📊 You can now:"
    echo "   - View data in Supabase Studio: pnpm supabase:studio"
    echo "   - Check your app at: http://localhost:5173"
else
    echo ""
    echo "❌ Error seeding data. Please check the error messages above."
    exit 1
fi

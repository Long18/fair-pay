#!/bin/bash

# Apply public read access migration to local Supabase

set -e

echo "🔓 Applying Public Read Access Migration"
echo "========================================"
echo ""

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

echo "✅ Supabase database is running"
echo ""

# Apply migration using Docker
echo "📝 Applying migration: 011_public_read_access.sql"

# Find database container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase_db.*FairPay|supabase.*db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Supabase database container not found!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Apply migration via Docker
echo ""
OUTPUT=$(cat supabase/migrations/011_public_read_access.sql | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres 2>&1)
EXIT_CODE=$?

# Filter out "already exists" errors (expected if policies were already applied)
FILTERED_OUTPUT=$(echo "$OUTPUT" | grep -v "already exists" || true)

# Show any other errors
if [ $EXIT_CODE -ne 0 ] && [ -n "$FILTERED_OUTPUT" ]; then
    echo "$FILTERED_OUTPUT" | grep -i "error" && true
fi

# Check if policies exist (created or already existed)
POLICY_COUNT=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE '%public_read%';" 2>&1 | grep -v "ERROR" | tr -d ' ' | head -1)

if [ -n "$POLICY_COUNT" ] && [ "$POLICY_COUNT" -ge 6 ]; then
    echo ""
    echo "✅ Public read access enabled successfully!"
    echo ""
    echo "📊 Anonymous users can now:"
    echo "   - View profiles"
    echo "   - View groups and members"
    echo "   - View expenses and splits"
    echo "   - View payments"
    echo "   - See leaderboard and stats"
    echo ""
    echo "🔒 Authentication still required for:"
    echo "   - Creating/editing/deleting any data"
    echo ""
else
    echo ""
    echo "❌ Failed to apply migration"
    exit 1
fi

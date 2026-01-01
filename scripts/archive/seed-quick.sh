#!/bin/bash

# Quick seed script that auto-detects users and creates sample data
# Prerequisites: Supabase must be running locally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🌱 Quick Seed Data Generator"
echo "============================"
echo ""

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Find Supabase database container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase_db.*FairPay|supabase.*db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Supabase database container not found!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

echo "✅ Found database container: $DB_CONTAINER"
echo ""

# Check if seed file exists
SEED_FILE="scripts/quick-seed.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo "❌ Error: Seed file not found: $SEED_FILE"
    exit 1
fi

echo "📝 Executing quick seed script..."
echo ""

# Execute seed script
cat "$SEED_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Quick seed completed successfully!"
else
    echo ""
    echo "❌ Error: Seed execution failed"
    exit 1
fi

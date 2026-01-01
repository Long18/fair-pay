#!/bin/bash

# Script to automatically update sample-data.sql with real profile IDs

set -e

echo "🔄 Updating Seed File with Real Profile IDs"
echo "============================================="
echo ""

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Get profile IDs
echo "📋 Fetching profile IDs from database..."

# Find database container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "supabase_db.*FairPay|supabase.*db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: Supabase database container not found!"
    echo "   Please start Supabase first: pnpm supabase:start"
    exit 1
fi

# Get profile IDs and convert to array (bash 3.2 compatible)
ID_ARRAY=()
while IFS= read -r line; do
    if [ -n "$line" ]; then
        ID_ARRAY+=("$line")
    fi
done < <(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -t -c "SELECT id FROM profiles ORDER BY created_at LIMIT 5;" 2>&1 | grep -v "^$" | tr -d ' ' | head -5)

ID_COUNT=${#ID_ARRAY[@]}

if [ $ID_COUNT -eq 0 ]; then
    echo "❌ Error: No profiles found in database!"
    echo ""
    echo "Please create at least 2 users first:"
    echo "1. Start your app: pnpm dev"
    echo "2. Register users at: http://localhost:5173/register"
    echo "3. Then run this script again"
    exit 1
fi

echo "✅ Found $ID_COUNT profile(s):"
for i in "${!ID_ARRAY[@]}"; do
    echo "   User $((i+1)): ${ID_ARRAY[$i]}"
done
echo ""

if [ $ID_COUNT -lt 2 ]; then
    echo "⚠️  Warning: Need at least 2 profiles for seeding"
    echo "   Please create more users and try again"
    exit 1
fi

# Update the seed file
SEED_FILE="supabase/seed/sample-data.sql"
BACKUP_FILE="supabase/seed/sample-data.sql.backup"

echo "📝 Creating backup: $BACKUP_FILE"
cp "$SEED_FILE" "$BACKUP_FILE"

echo "✏️  Updating UUIDs in seed file..."

# Replace UUIDs (using sed for each position)
for i in "${!ID_ARRAY[@]}"; do
    OLD_UUID=$(printf "00000000-0000-0000-0000-%012d" $((i+1)))
    NEW_UUID="${ID_ARRAY[$i]}"

    # Replace all occurrences
    sed -i.bak "s/$OLD_UUID/$NEW_UUID/g" "$SEED_FILE"
done

# Clean up backup files
rm -f supabase/seed/sample-data.sql.bak

echo "✅ Seed file updated successfully!"
echo ""
echo "📊 Updated UUIDs:"
for i in "${!ID_ARRAY[@]}"; do
    echo "   User $((i+1)): ${ID_ARRAY[$i]}"
done
echo ""
echo "🚀 You can now run: pnpm db:seed"

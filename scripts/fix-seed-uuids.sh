#!/bin/bash

# Script to fix all placeholder UUIDs in seed files with actual profile IDs
# This ensures seed files only reference existing profiles

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 Fixing Seed File UUIDs"
echo "========================="
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

if [ $PROFILE_COUNT -eq 0 ]; then
    echo "❌ Error: No profiles found in database!"
    echo ""
    echo "Please create at least 2 users first:"
    echo "1. Start your app: pnpm dev"
    echo "2. Register users at: http://localhost:5173/register"
    echo "3. Then run this script again"
    exit 1
fi

echo "✅ Found $PROFILE_COUNT profile(s):"
for i in "${!PROFILE_IDS[@]}"; do
    echo "   User $((i+1)): ${PROFILE_IDS[$i]}"
done
echo ""

# Process each seed file
SEED_FILES=("supabase/seed/sample-data.sql" "supabase/seed/test_data.sql")

for SEED_FILE in "${SEED_FILES[@]}"; do
    if [ ! -f "$SEED_FILE" ]; then
        continue
    fi

    echo "📝 Processing: $SEED_FILE"

    # Create backup
    BACKUP_FILE="${SEED_FILE}.backup"
    cp "$SEED_FILE" "$BACKUP_FILE"

    # Replace placeholder UUIDs with actual profile IDs
    # First, replace UUIDs 1-5 with available profiles
    for i in "${!PROFILE_IDS[@]}"; do
        OLD_UUID=$(printf "00000000-0000-0000-0000-%012d" $((i+1)))
        NEW_UUID="${PROFILE_IDS[$i]}"

        # Replace all occurrences
        sed -i.bak "s/$OLD_UUID/$NEW_UUID/g" "$SEED_FILE"
    done

    # For any remaining placeholder UUIDs (3-5 if we only have 2 profiles),
    # cycle through available profiles
    if [ $PROFILE_COUNT -lt 5 ]; then
        for i in $(seq 3 5); do
            OLD_UUID=$(printf "00000000-0000-0000-0000-%012d" $i)
            # Check if this UUID still exists in the file
            if grep -q "$OLD_UUID" "$SEED_FILE"; then
                # Cycle through available profiles (use modulo to wrap around)
                PROFILE_INDEX=$(( (i - 1) % PROFILE_COUNT ))
                NEW_UUID="${PROFILE_IDS[$PROFILE_INDEX]}"

                # Replace all occurrences
                sed -i.bak "s/$OLD_UUID/$NEW_UUID/g" "$SEED_FILE"
            fi
        done
    fi

    # Clean up backup files
    rm -f "${SEED_FILE}.bak"

    echo "   ✅ Updated UUIDs"
done

echo ""
echo "✅ All seed files updated successfully!"
echo ""
echo "📊 Updated UUIDs:"
for i in "${!PROFILE_IDS[@]}"; do
    echo "   User $((i+1)): ${PROFILE_IDS[$i]}"
done
echo ""
echo "💡 Note: If you have fewer than 5 profiles, some placeholder UUIDs may remain."
echo "   Create more users or manually update remaining UUIDs in the seed files."

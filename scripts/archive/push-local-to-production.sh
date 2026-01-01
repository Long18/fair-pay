#!/bin/bash

# Push local data to production (HARD PUSH - DESTRUCTIVE!)
# This will REPLACE all production data with local data
# Usage: ./scripts/push-local-to-production.sh

set -e

echo "⚠️  WARNING: DESTRUCTIVE OPERATION"
echo "=============================="
echo "This will:"
echo "  1. Dump your LOCAL database"
echo "  2. RESET production database"
echo "  3. Push all migrations to production"
echo "  4. Import your local data to production"
echo ""
echo "⚠️  This will OVERWRITE all production data!"
echo ""
read -p "Are you sure? Type 'YES' to continue: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Aborted."
    exit 1
fi

echo ""
echo "🚀 Starting Hard Push to Production..."
echo "=============================="
echo ""

# Create backups directory
mkdir -p supabase/backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup production before destroying it
PROD_BACKUP_FILE="supabase/backups/prod-backup-before-push-$TIMESTAMP.sql"
echo "📥 Step 1/5: Backing up current production data..."
supabase db dump --data-only --schema public --linked > "$PROD_BACKUP_FILE"
echo "✅ Production backup saved to: $PROD_BACKUP_FILE"
echo ""

# Step 2: Dump local data
LOCAL_DATA_FILE="supabase/backups/local-data-$TIMESTAMP.sql"
echo "📥 Step 2/5: Dumping local data..."
docker exec supabase_db_FairPay pg_dump -U postgres -d postgres \
  --data-only \
  --schema=public \
  --no-owner \
  --no-acl \
  > "$LOCAL_DATA_FILE"
echo "✅ Local data saved to: $LOCAL_DATA_FILE"
echo ""

# Step 3: Push all migrations to production
echo "🔄 Step 3/5: Pushing migrations to production..."
supabase db push --linked
echo "✅ Migrations pushed"
echo ""

# Step 4: Clear production data (keeping schema)
echo "🗑️  Step 4/5: Clearing production data..."
echo "   Truncating all tables in production..."

# Get list of tables and truncate them
supabase db execute --linked "
DO \$\$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;
"
echo "✅ Production data cleared"
echo ""

# Step 5: Import local data to production
echo "📤 Step 5/5: Importing local data to production..."
echo "   This may take a few minutes..."

# Push local data to production
supabase db execute --linked < "$LOCAL_DATA_FILE"

echo "✅ Local data imported to production"
echo ""

# Step 6: Verify production data
echo "✅ Verifying production data..."
echo ""
echo "Production tables row counts:"
supabase db execute --linked "
SELECT
  schemaname,
  tablename,
  n_tup_ins as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;
"

echo ""
echo "=============================="
echo "✅ Hard Push Complete!"
echo "=============================="
echo ""
echo "📊 Summary:"
echo "   ✅ Production backup: $PROD_BACKUP_FILE"
echo "   ✅ Local data pushed: $LOCAL_DATA_FILE"
echo "   ✅ Migrations applied"
echo "   ✅ All data synced"
echo ""
echo "🌐 Check production:"
echo "   https://supabase.com/dashboard/project/nowtovakbozjjkdsjmtd"
echo ""
echo "⚠️  If something went wrong, restore from backup:"
echo "   supabase db execute --linked < $PROD_BACKUP_FILE"
echo ""

#!/bin/bash

# Full production data pull script
# This pulls ALL data from production to local
# Usage: ./scripts/pull-production-full.sh

set -e

echo "🔄 Full Production Data Pull"
echo "=============================="
echo ""

# Create backups directory
mkdir -p supabase/backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Dump production data (data only, no schema)
PROD_DATA_FILE="supabase/backups/prod-data-$TIMESTAMP.sql"
echo "📥 Step 1/4: Dumping production data..."
supabase db dump --data-only --schema public --linked > "$PROD_DATA_FILE"
echo "✅ Data saved to: $PROD_DATA_FILE"
echo ""

# Step 2: Reset local database with migrations
echo "🔄 Step 2/4: Resetting local database..."
echo "   This will apply all migrations from supabase/migrations/"
npx supabase db reset --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo "✅ Local database reset complete"
echo ""

# Step 3: Import production data using Docker
echo "📤 Step 3/4: Importing production data..."
echo "   Using Docker psql to import data..."

# Import using docker exec
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < "$PROD_DATA_FILE"

echo "✅ Data imported successfully"
echo ""

# Step 4: Verify data
echo "✅ Step 4/4: Verifying data..."
echo ""
echo "Checking tables row counts:"
docker exec supabase_db_FairPay psql -U postgres -d postgres -c "
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
echo "✅ Full Production Pull Complete!"
echo "=============================="
echo ""
echo "📊 Next Steps:"
echo "   1. Check Supabase Studio: http://localhost:54323"
echo "   2. Verify data in Database → Tables"
echo "   3. Make your changes locally"
echo "   4. Run './scripts/push-local-to-production.sh' to push back"
echo ""
echo "📁 Backup saved at: $PROD_DATA_FILE"
echo ""

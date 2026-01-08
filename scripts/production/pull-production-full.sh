#!/bin/bash
# ============================================================================
# Pull Production Database Full (Schema + Data)
# ============================================================================
# Purpose: Pull complete production database (schema + data) to local
# Usage: ./scripts/production/pull-production-full.sh
# ============================================================================

set -e

echo "============================================"
echo " Pull Production Database (Full)"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if project is linked
if ! supabase projects list &> /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Project is not linked to production.${NC}"
    echo "   Run: supabase link --project-ref <your-project-ref>"
    exit 1
fi

# Check if Docker is running (for local Supabase)
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Docker may not be running.${NC}"
    echo "   Local Supabase requires Docker to be running."
    echo ""
fi

# Create backups directory
mkdir -p supabase/backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup current local database
echo -e "${BLUE}📦 Step 1/5: Backing up current local database...${NC}"
LOCAL_BACKUP_FILE="supabase/backups/local-backup-$TIMESTAMP.sql"
if supabase db dump --local -s public > "$LOCAL_BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(wc -c < "$LOCAL_BACKUP_FILE" | tr -d ' ')
    echo -e "${GREEN}✅ Local backup saved: $LOCAL_BACKUP_FILE ($(numfmt --to=iec-i --suffix=B $BACKUP_SIZE 2>/dev/null || echo "${BACKUP_SIZE} bytes"))${NC}"
else
    echo -e "${YELLOW}⚠️  No local data to backup (fresh start)${NC}"
fi
echo ""

# Step 2: Dump complete production database (schema + data)
echo -e "${BLUE}📥 Step 2/5: Dumping complete production database (schema + data)...${NC}"
PROD_COMPLETE_FILE="supabase/backups/prod-complete-$TIMESTAMP.sql"
echo "   This may take a few minutes depending on database size..."
if supabase db dump --linked -s public > "$PROD_COMPLETE_FILE" 2>&1; then
    DUMP_SIZE=$(wc -c < "$PROD_COMPLETE_FILE" | tr -d ' ')
    DUMP_LINES=$(wc -l < "$PROD_COMPLETE_FILE" | tr -d ' ')
    echo -e "${GREEN}✅ Complete database dump saved: $PROD_COMPLETE_FILE${NC}"
    echo "   Size: $(numfmt --to=iec-i --suffix=B $DUMP_SIZE 2>/dev/null || echo "${DUMP_SIZE} bytes")"
    echo "   Lines: $DUMP_LINES"
else
    echo -e "${RED}❌ Failed to dump production database${NC}"
    exit 1
fi
echo ""

# Step 3: Dump data-only separately (for reference)
echo -e "${BLUE}📥 Step 3/5: Dumping production data-only (for reference)...${NC}"
PROD_DATA_FILE="supabase/backups/prod-data-$TIMESTAMP.sql"
if supabase db dump --data-only --linked -s public > "$PROD_DATA_FILE" 2>&1; then
    DATA_SIZE=$(wc -c < "$PROD_DATA_FILE" | tr -d ' ')
    echo -e "${GREEN}✅ Data-only dump saved: $PROD_DATA_FILE${NC}"
    echo "   Size: $(numfmt --to=iec-i --suffix=B $DATA_SIZE 2>/dev/null || echo "${DATA_SIZE} bytes")"
else
    echo -e "${YELLOW}⚠️  Data-only dump failed (continuing anyway)${NC}"
fi
echo ""

# Step 4: Reset local database
echo -e "${BLUE}🔄 Step 4/5: Resetting local database...${NC}"
echo "   This will apply all migrations from supabase/migrations/"
if supabase db reset --local; then
    echo -e "${GREEN}✅ Local database reset complete${NC}"
else
    echo -e "${RED}❌ Failed to reset local database${NC}"
    exit 1
fi
echo ""

# Step 5: Import production database to local
echo -e "${BLUE}📤 Step 5/5: Importing production database to local...${NC}"
echo "   This may take a few minutes..."

# Determine import method
if command -v psql &> /dev/null; then
    IMPORT_CMD="psql postgresql://postgres:postgres@localhost:54322/postgres"
    echo "   Using psql client..."
elif docker ps &> /dev/null && docker ps | grep -q supabase_db_FairPay; then
    IMPORT_CMD="docker exec -i supabase_db_FairPay psql -U postgres -d postgres"
    echo "   Using Docker exec..."
else
    echo -e "${RED}❌ Neither psql nor Docker available for import${NC}"
    exit 1
fi

# Import with error filtering
if $IMPORT_CMD < "$PROD_COMPLETE_FILE" 2>&1 | grep -v "NOTICE:" | grep -v "WARNING:" | grep -v "^$" | tail -30; then
    echo -e "${GREEN}✅ Import completed${NC}"
else
    echo -e "${YELLOW}⚠️  Import completed with warnings (check output above)${NC}"
fi
echo ""

# Verify imported data
echo -e "${BLUE}🔍 Verifying imported data...${NC}"
VERIFY_SQL="
SELECT
    'profiles' as table_name, COUNT(*)::text as count FROM profiles
UNION ALL
SELECT 'friendships', COUNT(*)::text FROM friendships
UNION ALL
SELECT 'groups', COUNT(*)::text FROM groups
UNION ALL
SELECT 'expenses', COUNT(*)::text FROM expenses
UNION ALL
SELECT 'payments', COUNT(*)::text FROM payments
UNION ALL
SELECT 'expense_splits', COUNT(*)::text FROM expense_splits
UNION ALL
SELECT 'attachments', COUNT(*)::text FROM attachments
UNION ALL
SELECT 'notifications', COUNT(*)::text FROM notifications
UNION ALL
SELECT 'balance_history', COUNT(*)::text FROM balance_history
ORDER BY table_name;
"

if command -v psql &> /dev/null; then
    echo "Table row counts:"
    psql postgresql://postgres:postgres@localhost:54322/postgres -c "$VERIFY_SQL" 2>&1 | grep -v "^$" | grep -v "rows)" || true
elif docker ps &> /dev/null && docker ps | grep -q supabase_db_FairPay; then
    echo "Table row counts:"
    docker exec supabase_db_FairPay psql -U postgres -d postgres -c "$VERIFY_SQL" 2>&1 | grep -v "^$" | grep -v "rows)" || true
fi
echo ""

# Summary
echo "============================================"
echo -e "${GREEN}✅ Production Database Pull Complete!${NC}"
echo "============================================"
echo ""
echo "📁 Files created:"
echo "   - Complete (schema + data): $PROD_COMPLETE_FILE"
if [ -f "$PROD_DATA_FILE" ]; then
    echo "   - Data-only: $PROD_DATA_FILE"
fi
if [ -f "$LOCAL_BACKUP_FILE" ]; then
    echo "   - Local backup: $LOCAL_BACKUP_FILE"
fi
echo ""
echo "📊 Next Steps:"
echo "   1. Check Supabase Studio: http://127.0.0.1:54323"
echo "   2. Verify data in Database → Tables"
echo "   3. Test your application locally"
echo ""
echo "💡 Tip: All dump files are saved in supabase/backups/"
echo "   You can restore from backup if needed."
echo ""

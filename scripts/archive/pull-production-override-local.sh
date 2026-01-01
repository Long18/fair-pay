#!/bin/bash

# Pull complete production database and override local
# This script automatically pulls ALL database (schema + data) from production
# and replaces the local database without asking for confirmation
# Usage: ./scripts/pull-production-override-local.sh

set -e

echo "🔄 Pulling Production Database (Override Local)"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if project is linked
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Error: Project is not linked to production.${NC}"
    echo "   Run: supabase link --project-ref <your-project-ref>"
    exit 1
fi

# Create backups directory
mkdir -p supabase/backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup current local data
echo ""
echo -e "${YELLOW}📦 Step 1/5: Backing up current local data...${NC}"
LOCAL_BACKUP_FILE="supabase/backups/local-backup-$TIMESTAMP.sql"
if supabase db dump --local -s public > "$LOCAL_BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Local backup saved to: $LOCAL_BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No local data to backup (fresh start)${NC}"
fi
echo ""

# Step 2: Dump complete production database (schema + data)
echo -e "${YELLOW}📥 Step 2/5: Dumping complete production database (schema + data)...${NC}"
PROD_COMPLETE_FILE="supabase/backups/prod-complete-$TIMESTAMP.sql"
supabase db dump --linked -s public > "$PROD_COMPLETE_FILE"
echo -e "${GREEN}✅ Complete database dump saved to: $PROD_COMPLETE_FILE${NC}"
echo ""

# Step 3: Dump data-only separately (for reference)
echo -e "${YELLOW}📥 Step 3/5: Dumping production data-only (for reference)...${NC}"
PROD_DATA_FILE="supabase/backups/prod-data-$TIMESTAMP.sql"
supabase db dump --data-only --linked -s public > "$PROD_DATA_FILE"
echo -e "${GREEN}✅ Data-only dump saved to: $PROD_DATA_FILE${NC}"
echo ""

# Step 4: Reset local database
echo -e "${YELLOW}🔄 Step 4/5: Resetting local database...${NC}"
supabase db reset --local
echo -e "${GREEN}✅ Local database reset${NC}"
echo ""

# Step 5: Import production database to local
echo -e "${YELLOW}📤 Step 5/5: Importing production database to local...${NC}"
echo "   Importing schema and data..."
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_COMPLETE_FILE" 2>&1 | tail -20 || true
    echo "   Importing data-only to ensure all data is loaded..."
    psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_DATA_FILE" 2>&1 | tail -10 || true
else
    docker exec -i supabase_db_FairPay psql -U postgres -d postgres < "$PROD_COMPLETE_FILE" 2>&1 | tail -20 || true
    echo "   Importing data-only to ensure all data is loaded..."
    docker exec -i supabase_db_FairPay psql -U postgres -d postgres < "$PROD_DATA_FILE" 2>&1 | tail -10 || true
fi
echo -e "${GREEN}✅ Import complete${NC}"
echo ""

# Verify data
echo -e "${YELLOW}🔍 Verifying imported data...${NC}"
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@localhost:54322/postgres -c "
    SELECT
      'profiles' as table_name, COUNT(*) as count FROM profiles
    UNION ALL
    SELECT 'friendships', COUNT(*) FROM friendships
    UNION ALL
    SELECT 'groups', COUNT(*) FROM groups
    UNION ALL
    SELECT 'expenses', COUNT(*) FROM expenses
    UNION ALL
    SELECT 'payments', COUNT(*) FROM payments
    UNION ALL
    SELECT 'expense_splits', COUNT(*) FROM expense_splits
    ORDER BY table_name;
    " 2>&1 | grep -v "^$" || true
else
    docker exec supabase_db_FairPay psql -U postgres -d postgres -c "
    SELECT
      'profiles' as table_name, COUNT(*) as count FROM profiles
    UNION ALL
    SELECT 'friendships', COUNT(*) FROM friendships
    UNION ALL
    SELECT 'groups', COUNT(*) FROM groups
    UNION ALL
    SELECT 'expenses', COUNT(*) FROM expenses
    UNION ALL
    SELECT 'payments', COUNT(*) FROM payments
    UNION ALL
    SELECT 'expense_splits', COUNT(*) FROM expense_splits
    ORDER BY table_name;
    " 2>&1 | grep -v "^$" || true
fi
echo ""

echo "================================================"
echo -e "${GREEN}✅ Production Database Override Complete!${NC}"
echo "================================================"
echo ""
echo "📁 Files created:"
echo "   - Complete (schema + data): $PROD_COMPLETE_FILE"
echo "   - Data-only: $PROD_DATA_FILE"
if [ -f "$LOCAL_BACKUP_FILE" ]; then
    echo "   - Local backup: $LOCAL_BACKUP_FILE"
fi
echo ""
echo "📊 Next Steps:"
echo "   1. Check Supabase Studio: http://localhost:54323"
echo "   2. Verify data in Database → Tables"
echo "   3. Your local database now matches production"
echo ""
echo "💡 To restore previous local data:"
echo "   psql postgresql://postgres:postgres@localhost:54322/postgres < $LOCAL_BACKUP_FILE"
echo "   OR"
echo "   docker exec -i supabase_db_FairPay psql -U postgres -d postgres < $LOCAL_BACKUP_FILE"
echo ""

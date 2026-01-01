#!/bin/bash

# Complete production database pull script
# This pulls ALL database (schema + data) from production
# Usage: ./scripts/pull-production-complete.sh

set -e

echo "🔄 Complete Production Database Pull"
echo "======================================"
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
    echo -e "${YELLOW}⚠️  Warning: Project may not be linked.${NC}"
    echo "   Run: supabase link --project-ref <your-project-ref>"
    echo ""
fi

# Create backups directory
mkdir -p supabase/backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup current local data (optional)
echo ""
echo -e "${YELLOW}📦 Step 1/4: Backing up current local data...${NC}"
LOCAL_BACKUP_FILE="supabase/backups/local-backup-$TIMESTAMP.sql"
if supabase db dump --local -s public > "$LOCAL_BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Local backup saved to: $LOCAL_BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No local data to backup (fresh start)${NC}"
fi
echo ""

# Step 2: Dump complete production database (schema + data)
echo -e "${YELLOW}📥 Step 2/4: Dumping complete production database (schema + data)...${NC}"
PROD_COMPLETE_FILE="supabase/backups/prod-complete-$TIMESTAMP.sql"
supabase db dump --linked -s public > "$PROD_COMPLETE_FILE"
echo -e "${GREEN}✅ Complete database dump saved to: $PROD_COMPLETE_FILE${NC}"
echo ""

# Step 3: Optionally dump data-only separately
echo -e "${YELLOW}📥 Step 3/4: Dumping production data-only (optional)...${NC}"
PROD_DATA_FILE="supabase/backups/prod-data-$TIMESTAMP.sql"
supabase db dump --data-only --linked -s public > "$PROD_DATA_FILE"
echo -e "${GREEN}✅ Data-only dump saved to: $PROD_DATA_FILE${NC}"
echo ""

# Step 4: Ask if user wants to import to local
echo -e "${YELLOW}📤 Step 4/4: Import to local database?${NC}"
read -p "Do you want to import production database to local? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}🔄 Resetting local database...${NC}"
    supabase db reset --local
    echo -e "${GREEN}✅ Local database reset${NC}"
    echo ""

    echo -e "${YELLOW}📤 Importing production database to local...${NC}"
    if command -v psql &> /dev/null; then
        psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_COMPLETE_FILE" 2>&1 | tail -20 || true
    else
        docker exec -i supabase_db_FairPay psql -U postgres -d postgres < "$PROD_COMPLETE_FILE" 2>&1 | tail -20 || true
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
else
    echo -e "${YELLOW}⏭️  Skipping local import${NC}"
    echo ""
fi

echo "======================================"
echo -e "${GREEN}✅ Complete Production Database Pull Finished!${NC}"
echo "======================================"
echo ""
echo "📁 Files created:"
echo "   - Complete (schema + data): $PROD_COMPLETE_FILE"
echo "   - Data-only: $PROD_DATA_FILE"
if [ -f "$LOCAL_BACKUP_FILE" ]; then
    echo "   - Local backup: $LOCAL_BACKUP_FILE"
fi
echo ""
echo "📊 Next Steps:"
echo "   1. Review the dump files in supabase/backups/"
echo "   2. To import later: psql postgresql://postgres:postgres@localhost:54322/postgres < $PROD_COMPLETE_FILE"
echo "   3. Check Supabase Studio: http://localhost:54323"
echo ""
echo "💡 Tip: The complete dump file contains both schema and data."
echo "   Use it to restore the full production database state."
echo ""

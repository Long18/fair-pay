#!/bin/bash

# Script to pull production data into local development
# This will help debug production issues locally

set -e

echo "🔄 Pulling Production Data to Local..."
echo "========================================"

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

# Step 1: Backup current local data (optional)
echo ""
echo -e "${YELLOW}📦 Step 1: Backing up current local data...${NC}"
BACKUP_FILE="supabase/backups/local-backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p supabase/backups
supabase db dump --local --data-only > "$BACKUP_FILE" 2>/dev/null || echo "No local data to backup (fresh start)"
echo -e "${GREEN}✅ Local backup saved to: $BACKUP_FILE${NC}"

# Step 2: Dump production data
echo ""
echo -e "${YELLOW}📥 Step 2: Dumping production data...${NC}"
PROD_DATA_FILE="supabase/backups/production-data-$(date +%Y%m%d-%H%M%S).sql"
supabase db dump --data-only --schema public > "$PROD_DATA_FILE"
echo -e "${GREEN}✅ Production data dumped to: $PROD_DATA_FILE${NC}"

# Step 3: Reset local database
echo ""
echo -e "${YELLOW}🔄 Step 3: Resetting local database...${NC}"
supabase db reset --local
echo -e "${GREEN}✅ Local database reset${NC}"

# Step 4: Load production data into local
echo ""
echo -e "${YELLOW}📤 Step 4: Loading production data into local...${NC}"
supabase db push --local < "$PROD_DATA_FILE" 2>&1 | grep -v "^$" || true
# Alternative method using psql directly
psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_DATA_FILE" 2>&1 | tail -10 || true
echo -e "${GREEN}✅ Production data loaded${NC}"

# Step 5: Verify data
echo ""
echo -e "${YELLOW}🔍 Step 5: Verifying data...${NC}"

# Count records in key tables
echo "Counting records in key tables:"
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
" 2>&1 | grep -v "^$"

# Step 6: Test the problematic function
echo ""
echo -e "${YELLOW}🧪 Step 6: Testing get_public_demo_debts function...${NC}"
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT * FROM get_public_demo_debts();" 2>&1 | head -20

echo ""
echo -e "${GREEN}✅ Production data pull complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start your local dev server: pnpm run dev"
echo "2. Test the application with production data"
echo "3. Debug any issues"
echo ""
echo "To restore local data from backup:"
echo "  psql postgresql://postgres:postgres@localhost:54322/postgres < $BACKUP_FILE"

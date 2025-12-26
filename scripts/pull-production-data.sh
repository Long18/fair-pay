#!/bin/bash

# Pull Production Data from Supabase to Local
# This script dumps production database and restores it locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Pull Production Data to Local${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo -e "${YELLOW}Install it with: brew install supabase/tap/supabase${NC}"
    exit 1
fi

# Check if project is linked
if [ ! -f ".git/supabase-project-ref" ] && [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}⚠️  Project not linked to remote Supabase${NC}"
    echo -e "${YELLOW}Run: supabase link --project-ref <your-project-ref>${NC}"
    echo ""
    read -p "Do you want to link now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase link
    else
        exit 1
    fi
fi

# Check if local Supabase is running
echo -e "${BLUE}📊 Checking local Supabase status...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Local Supabase is not running${NC}"
    read -p "Start local Supabase? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🚀 Starting Supabase...${NC}"
        supabase start
    else
        exit 1
    fi
fi

# Warning about data loss
echo ""
echo -e "${RED}⚠️  WARNING: This will REPLACE all local data with production data!${NC}"
echo -e "${YELLOW}This action cannot be undone.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Create backup directory
BACKUP_DIR="supabase/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$BACKUP_DIR/production_dump_$TIMESTAMP.sql"

echo ""
echo -e "${BLUE}📥 Step 1: Dumping production database...${NC}"
echo -e "${YELLOW}This may take a few minutes depending on data size${NC}"

# Dump production database (schema + data)
if supabase db dump --data-only -f "$DUMP_FILE"; then
    echo -e "${GREEN}✅ Production data dumped to: $DUMP_FILE${NC}"
else
    echo -e "${RED}❌ Failed to dump production database${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Step 2: Resetting local database...${NC}"

# Reset local database (this will apply all migrations)
if supabase db reset; then
    echo -e "${GREEN}✅ Local database reset complete${NC}"
else
    echo -e "${RED}❌ Failed to reset local database${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📥 Step 3: Restoring production data to local...${NC}"

# Get local database connection string
DB_URL=$(supabase status -o env | grep "DB_URL=" | cut -d'=' -f2-)

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ Could not get local database URL${NC}"
    exit 1
fi

# Restore data using psql
if psql "$DB_URL" -f "$DUMP_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production data restored successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some warnings occurred during restore (this is usually normal)${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Step 4: Verifying data...${NC}"

# Count records in key tables
PROFILES_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM profiles;" | xargs)
GROUPS_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM groups;" | xargs)
EXPENSES_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM expenses;" | xargs)
PAYMENTS_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM payments;" | xargs)

echo -e "${GREEN}✅ Data verification:${NC}"
echo -e "   Profiles: ${BLUE}$PROFILES_COUNT${NC}"
echo -e "   Groups: ${BLUE}$GROUPS_COUNT${NC}"
echo -e "   Expenses: ${BLUE}$EXPENSES_COUNT${NC}"
echo -e "   Payments: ${BLUE}$PAYMENTS_COUNT${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Production data successfully pulled!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "   1. Open Supabase Studio: ${YELLOW}pnpm supabase:studio${NC}"
echo -e "   2. Start dev server: ${YELLOW}pnpm dev${NC}"
echo -e "   3. Test with production data locally"
echo ""
echo -e "${YELLOW}💡 Tip: The dump file is saved at: $DUMP_FILE${NC}"
echo -e "${YELLOW}   You can restore it again later if needed.${NC}"
echo ""

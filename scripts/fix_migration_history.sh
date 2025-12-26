#!/bin/bash
# Fix migration history mismatch between local and remote
# This script marks old migrations (002-011) as reverted in remote database

set -e

echo "🔧 FIXING MIGRATION HISTORY"
echo "============================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: This will mark migrations 002-011 as REVERTED in remote database${NC}"
echo -e "${YELLOW}   (This tells Supabase these migrations were rolled back)${NC}"
echo ""
echo -e "${BLUE}Current situation:${NC}"
echo -e "  - Local: Only has 001_initial_schema.sql (consolidated)"
echo -e "  - Remote: Has 002-011 (old migrations)"
echo ""
echo -e "${BLUE}Solution:${NC}"
echo -e "  - Mark 002-011 as 'reverted' in remote"
echo -e "  - Then push 001_initial_schema.sql to remote"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Marking old migrations as reverted...${NC}"

# Mark migrations 002-011 as reverted
for i in {2..11}; do
    migration_num=$(printf "%03d" $i)
    echo -e "${YELLOW}  Marking migration ${migration_num} as reverted...${NC}"
    supabase migration repair --status reverted ${migration_num} 2>&1 | grep -v "^$" || true
done

echo -e "${GREEN}✅ Old migrations marked as reverted${NC}"
echo ""

echo -e "${BLUE}Step 2: Verifying migration status...${NC}"
supabase migration list --linked

echo ""
echo -e "${BLUE}Step 3: Pushing local migration to remote...${NC}"
echo -e "${YELLOW}  This will apply 001_initial_schema.sql to remote${NC}"
echo ""

read -p "Push to remote? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. You can manually push later with: supabase db push"
    exit 0
fi

# Dry run first
echo -e "${YELLOW}  Dry run first...${NC}"
supabase db push --dry-run

echo ""
echo -e "${YELLOW}  Looks good? Pushing for real...${NC}"
supabase db push

echo ""
echo -e "${GREEN}🎉 Migration history fixed and pushed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Verify remote database: supabase db remote status"
echo -e "  2. Test your app with remote database"
echo -e "  3. Run import script if needed"

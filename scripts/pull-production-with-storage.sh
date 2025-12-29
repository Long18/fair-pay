#!/bin/bash

# Pull Production Data with Storage - Complete Script
# This pulls ALL database (schema + data) AND storage files from production
# Usage: ./scripts/pull-production-with-storage.sh

set -e

echo "🔄 Pull Production Data + Storage"
echo "=================================="
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
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Project may not be linked.${NC}"
    echo "   Run: supabase link --project-ref <your-project-ref>"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if local Supabase is running
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Local Supabase is not running.${NC}"
    echo "   Starting local Supabase..."
    supabase start
    echo ""
fi

# Create backups directory
mkdir -p supabase/backups
mkdir -p supabase/backups/storage

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Storage bucket name
STORAGE_BUCKET="receipts"

echo -e "${YELLOW}⚠️  WARNING: This will REPLACE all local data and storage!${NC}"
echo -e "${YELLOW}   All existing local data will be deleted.${NC}"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏭️  Cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📦 Step 1/5: Backing up current local data...${NC}"
LOCAL_BACKUP_FILE="supabase/backups/local-backup-$TIMESTAMP.sql"
if supabase db dump --local -s public > "$LOCAL_BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Local backup saved to: $LOCAL_BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No local data to backup (fresh start)${NC}"
fi
echo ""

echo -e "${BLUE}📥 Step 2/5: Dumping production database (schema + data)...${NC}"
PROD_DUMP_FILE="supabase/backups/prod-complete-$TIMESTAMP.sql"
if supabase db dump --linked -s public > "$PROD_DUMP_FILE" 2>&1; then
    echo -e "${GREEN}✅ Production database dump saved to: $PROD_DUMP_FILE${NC}"
else
    echo -e "${RED}❌ Failed to dump production database${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}📥 Step 3/5: Downloading production storage files...${NC}"
STORAGE_DIR="supabase/backups/storage/$TIMESTAMP"
mkdir -p "$STORAGE_DIR"

# Check if Node.js script exists
if [ -f "scripts/pull-storage.js" ]; then
    echo -e "${BLUE}   Using Node.js script to download storage...${NC}"
    if node scripts/pull-storage.js; then
        echo -e "${GREEN}✅ Storage files downloaded${NC}"
        STORAGE_SKIP=false
    else
        echo -e "${YELLOW}⚠️  Storage download failed. Continuing with database only...${NC}"
        STORAGE_SKIP=true
    fi
else
    echo -e "${YELLOW}⚠️  Storage script not found. Skipping storage download.${NC}"
    echo "   You can manually download storage files from Supabase dashboard"
    STORAGE_SKIP=true
fi
echo ""

echo -e "${BLUE}🔄 Step 4/5: Resetting local database...${NC}"
supabase db reset --local
echo -e "${GREEN}✅ Local database reset${NC}"
echo ""

echo -e "${BLUE}📤 Step 5/5: Restoring production database to local...${NC}"
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_DUMP_FILE" 2>&1 | grep -v "NOTICE:" | grep -v "WARNING:" | tail -20 || true
else
    docker exec -i supabase_db_FairPay psql -U postgres -d postgres < "$PROD_DUMP_FILE" 2>&1 | grep -v "NOTICE:" | grep -v "WARNING:" | tail -20 || true
fi
echo -e "${GREEN}✅ Database restored${NC}"
echo ""

# Storage upload is handled by the Node.js script if user confirmed

# Verify data
echo -e "${BLUE}🔍 Verifying imported data...${NC}"
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
    UNION ALL
    SELECT 'attachments', COUNT(*) FROM attachments
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
    UNION ALL
    SELECT 'attachments', COUNT(*) FROM attachments
    ORDER BY table_name;
    " 2>&1 | grep -v "^$" || true
fi
echo ""

echo "=================================="
echo -e "${GREEN}✅ Production Data + Storage Pull Complete!${NC}"
echo "=================================="
echo ""
echo "📁 Files created:"
echo "   - Database dump: $PROD_DUMP_FILE"
if [ "$STORAGE_SKIP" != "true" ] && [ -d "$STORAGE_DIR" ]; then
    echo "   - Storage files: $STORAGE_DIR"
fi
if [ -f "$LOCAL_BACKUP_FILE" ]; then
    echo "   - Local backup: $LOCAL_BACKUP_FILE"
fi
echo ""
echo "📊 Next Steps:"
echo "   1. Review the dump files in supabase/backups/"
if [ "$STORAGE_SKIP" != "true" ]; then
    echo "   2. Storage files have been downloaded and uploaded to local"
    echo "      Check Supabase Studio to verify: http://localhost:54323/storage"
else
    echo "   2. Storage download was skipped or failed"
    echo "      You can run: node scripts/pull-storage.js"
fi
echo "   3. Check Supabase Studio: http://localhost:54323"
echo ""
echo "💡 Tip: The database dump contains both schema and data."
if [ "$STORAGE_SKIP" != "true" ]; then
    echo "   Storage files are in: supabase/backups/storage/"
fi
echo ""


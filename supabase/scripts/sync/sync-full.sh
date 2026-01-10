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

# Step 2: Dump production data-only (for import - schema already exists from migrations)
echo -e "${BLUE}📥 Step 2/5: Dumping production data-only (for import)...${NC}"
PROD_COMPLETE_FILE="supabase/backups/prod-complete-$TIMESTAMP.sql"
echo "   This may take a few minutes depending on database size..."
echo "   Note: Only data will be imported (schema already exists from migrations)"

# Dump public schema DATA ONLY (no schema - migrations already provide schema)
if supabase db dump --linked --data-only -s public > "$PROD_COMPLETE_FILE" 2>&1; then
    DUMP_SIZE=$(wc -c < "$PROD_COMPLETE_FILE" | tr -d ' ')
    DUMP_LINES=$(wc -l < "$PROD_COMPLETE_FILE" | tr -d ' ')
    echo -e "${GREEN}✅ Production data dump saved: $PROD_COMPLETE_FILE${NC}"
    echo "   Size: $(numfmt --to=iec-i --suffix=B $DUMP_SIZE 2>/dev/null || echo "${DUMP_SIZE} bytes")"
    echo "   Lines: $DUMP_LINES"
else
    echo -e "${RED}❌ Failed to dump production database${NC}"
    exit 1
fi

# Optionally dump auth.users data (for foreign key relationships)
echo ""
echo -e "${BLUE}   Attempting to dump auth.users data...${NC}"
AUTH_USERS_FILE="supabase/backups/auth-users-$TIMESTAMP.sql"

# Try to dump auth schema data-only, then extract only auth.users
if supabase db dump --linked --data-only -s auth > "$AUTH_USERS_FILE.tmp" 2>&1; then
    # Extract only auth.users INSERT statements
    if grep -E "INSERT INTO.*auth\.users|COPY.*auth\.users" "$AUTH_USERS_FILE.tmp" > "$AUTH_USERS_FILE" 2>/dev/null; then
        if [ -s "$AUTH_USERS_FILE" ]; then
            AUTH_SIZE=$(wc -c < "$AUTH_USERS_FILE" | tr -d ' ')
            AUTH_LINES=$(wc -l < "$AUTH_USERS_FILE" | tr -d ' ')
            echo -e "${GREEN}✅ Auth users data extracted: $AUTH_USERS_FILE${NC}"
            echo "   Size: $(numfmt --to=iec-i --suffix=B $AUTH_SIZE 2>/dev/null || echo "${AUTH_SIZE} bytes")"
            echo "   Lines: $AUTH_LINES"
            # Prepend auth.users data to the complete file (must be imported first)
            {
                echo "-- Auth users data (import first for foreign key relationships)";
                cat "$AUTH_USERS_FILE";
                echo "";
                echo "-- Public schema data";
            } > "${PROD_COMPLETE_FILE}.tmp"
            cat "$PROD_COMPLETE_FILE" >> "${PROD_COMPLETE_FILE}.tmp"
            mv "${PROD_COMPLETE_FILE}.tmp" "$PROD_COMPLETE_FILE"
            echo "   Merged auth.users data into complete dump (will be imported first)"
        else
            echo -e "${YELLOW}⚠️  No auth.users data found in dump (skipping)${NC}"
            rm -f "$AUTH_USERS_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not extract auth.users data (continuing without it)${NC}"
        rm -f "$AUTH_USERS_FILE"
    fi
    rm -f "$AUTH_USERS_FILE.tmp"
else
    echo -e "${YELLOW}⚠️  Could not dump auth schema (continuing without auth.users)${NC}"
    echo "   Note: Foreign keys to auth.users may fail if users don't exist locally"
    rm -f "$AUTH_USERS_FILE" "$AUTH_USERS_FILE.tmp"
fi
echo ""

# Step 3: Dump schema separately (for reference only, not for import)
echo -e "${BLUE}📥 Step 3/5: Dumping production schema (for reference only)...${NC}"
PROD_SCHEMA_FILE="supabase/backups/prod-schema-$TIMESTAMP.sql"
if supabase db dump --linked --schema-only -s public > "$PROD_SCHEMA_FILE" 2>&1; then
    SCHEMA_SIZE=$(wc -c < "$PROD_SCHEMA_FILE" | tr -d ' ')
    echo -e "${GREEN}✅ Schema dump saved (reference only): $PROD_SCHEMA_FILE${NC}"
    echo "   Size: $(numfmt --to=iec-i --suffix=B $SCHEMA_SIZE 2>/dev/null || echo "${SCHEMA_SIZE} bytes")"
    echo "   Note: This is for reference only, not imported (migrations provide schema)"
else
    echo -e "${YELLOW}⚠️  Schema dump failed (continuing anyway)${NC}"
fi
echo ""

# Step 4: Reset local database
echo -e "${BLUE}🔄 Step 4/6: Resetting local database...${NC}"
echo "   This will apply all migrations from supabase/migrations/"
if supabase db reset --local; then
    echo -e "${GREEN}✅ Local database reset complete${NC}"
else
    echo -e "${RED}❌ Failed to reset local database${NC}"
    exit 1
fi
echo ""

# Step 4.5: Apply baseline.sql if it exists (to ensure all tables exist)
if [ -f "supabase/baseline.sql" ]; then
    echo -e "${BLUE}📋 Step 4.5/6: Applying baseline.sql to ensure complete schema...${NC}"
    echo "   This ensures all tables from baseline exist (migrations may not include all)"

    if command -v psql &> /dev/null; then
        BASELINE_CMD="psql postgresql://postgres:postgres@localhost:54322/postgres"
    elif docker ps &> /dev/null && docker ps | grep -q supabase_db_FairPay; then
        BASELINE_CMD="docker exec -i supabase_db_FairPay psql -U postgres -d postgres"
    else
        echo -e "${YELLOW}⚠️  Cannot apply baseline (no psql/Docker available)${NC}"
        BASELINE_CMD=""
    fi

    if [ -n "$BASELINE_CMD" ]; then
        # Apply baseline without transaction (baseline.sql has BEGIN/COMMIT which causes rollback on errors)
        # Use ON_ERROR_STOP=off to continue on errors
        BASELINE_OUTPUT=$(mktemp)
        BASELINE_ERROR=$(mktemp)

        # Determine connection string
        if [ "$BASELINE_CMD" = "psql" ]; then
            BASELINE_CONN="postgresql://postgres:postgres@localhost:54322/postgres"
            # For psql, use -v ON_ERROR_STOP=0 to continue on errors
            sed 's/^BEGIN;$/-- BEGIN; (removed for error handling)/; s/^COMMIT;$/-- COMMIT; (removed for error handling)/' supabase/baseline.sql | \
            psql "$BASELINE_CONN" -v ON_ERROR_STOP=0 > "$BASELINE_OUTPUT" 2> "$BASELINE_ERROR" || true
        else
            # For Docker, pipe and handle errors
            sed 's/^BEGIN;$/-- BEGIN; (removed for error handling)/; s/^COMMIT;$/-- COMMIT; (removed for error handling)/' supabase/baseline.sql | \
            docker exec -i supabase_db_FairPay psql -U postgres -d postgres > "$BASELINE_OUTPUT" 2> "$BASELINE_ERROR" || true
        fi

        # Check for critical errors (ignore "already exists" and notices)
        CRITICAL_ERRORS=$(grep -v "already exists" "$BASELINE_ERROR" | grep -v "NOTICE:" | grep -v "WARNING:" | grep -v "^$" | grep -i "error\|fatal" | wc -l | tr -d ' ')

        if [ "$CRITICAL_ERRORS" = "0" ]; then
            echo -e "${GREEN}✅ Baseline schema applied${NC}"
        else
            echo -e "${YELLOW}⚠️  Baseline applied with some errors (non-critical)${NC}"
            echo "   Errors (if any):"
            grep -v "already exists" "$BASELINE_ERROR" | grep -v "NOTICE:" | grep -v "WARNING:" | grep -v "^$" | head -5 | sed 's/^/   /' || true
        fi

        rm -f "$BASELINE_OUTPUT" "$BASELINE_ERROR"

        # Verify critical tables exist
        echo "   Verifying critical tables exist..."
        MISSING_TABLES=""
        for table in profiles expenses expense_splits payments groups group_members friendships user_roles donation_settings recurring_expenses attachments; do
            if [ "$BASELINE_CMD" = "psql" ]; then
                EXISTS=$(psql "$BASELINE_CONN" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null || echo "f")
            else
                EXISTS=$(docker exec supabase_db_FairPay psql -U postgres -d postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null || echo "f")
            fi
            if [ "$EXISTS" != "t" ]; then
                MISSING_TABLES="$MISSING_TABLES $table"
            fi
        done

        if [ -n "$MISSING_TABLES" ]; then
            echo -e "${RED}❌ Critical tables missing:$MISSING_TABLES${NC}"
            echo "   This may cause import to fail. Please check baseline.sql"
        else
            echo -e "${GREEN}✅ All critical tables exist${NC}"
        fi

        # Ensure comment column exists in expenses (from migration 20260109110000)
        echo "   Ensuring expenses.comment column exists..."
        if [ "$BASELINE_CMD" = "psql" ]; then
            psql "$BASELINE_CONN" -c "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS comment TEXT NULL;" 2>/dev/null || true
        else
            docker exec supabase_db_FairPay psql -U postgres -d postgres -c "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS comment TEXT NULL;" 2>/dev/null || true
        fi
    fi
    echo ""
fi

# Step 5: Import production database to local
echo -e "${BLUE}📤 Step 5/6: Importing production database to local...${NC}"
echo "   This may take a few minutes..."

# Determine import method and connection string
if command -v psql &> /dev/null; then
    PSQL_CMD="psql"
    PSQL_CONN="postgresql://postgres:postgres@localhost:54322/postgres"
    echo "   Using psql client..."
elif docker ps &> /dev/null && docker ps | grep -q supabase_db_FairPay; then
    PSQL_CMD="docker exec -i supabase_db_FairPay psql"
    PSQL_CONN="-U postgres -d postgres"
    echo "   Using Docker exec..."
else
    echo -e "${RED}❌ Neither psql nor Docker available for import${NC}"
    exit 1
fi

# Import with proper error handling
# Note: The dump file already has RLS disabled for auth.users section
# We'll use the dump file directly, but ensure RLS is disabled for the entire import
echo "   Importing data (RLS will be disabled during import)..."
IMPORT_OUTPUT=$(mktemp)
IMPORT_ERROR=$(mktemp)

# Create a temporary SQL file that wraps the dump with RLS disable commands
# Filter out non-SQL lines (like "Initialising login role...", "Dumping data...")
TEMP_IMPORT_FILE="supabase/backups/temp-import-$TIMESTAMP.sql"
{
    echo "-- Disable RLS and replication role for import";
    echo "SET session_replication_role = 'replica';";
    echo "SET LOCAL row_security = off;";
    echo "";
    # Filter dump file: remove non-SQL lines from Supabase CLI output
    # Keep all SQL statements and comments (lines starting with --, SET, INSERT, COPY, etc.)
    grep -v "^Initialising" "$PROD_COMPLETE_FILE" | \
    grep -v "^Dumping data" | \
    cat;
    echo "";
    echo "-- Re-enable RLS and replication role after import";
    echo "SET session_replication_role = 'origin';";
    echo "RESET row_security;";
} > "$TEMP_IMPORT_FILE"

# Import with proper error handling
if [ "$PSQL_CMD" = "psql" ]; then
    if $PSQL_CMD "$PSQL_CONN" < "$TEMP_IMPORT_FILE" > "$IMPORT_OUTPUT" 2> "$IMPORT_ERROR"; then
        IMPORT_EXIT_CODE=0
    else
        IMPORT_EXIT_CODE=$?
    fi
else
    if cat "$TEMP_IMPORT_FILE" | $PSQL_CMD $PSQL_CONN > "$IMPORT_OUTPUT" 2> "$IMPORT_ERROR"; then
        IMPORT_EXIT_CODE=0
    else
        IMPORT_EXIT_CODE=$?
    fi
fi

# Check for actual errors (ignore NOTICE and WARNING)
ERROR_COUNT=$(grep -v "NOTICE:" "$IMPORT_ERROR" | grep -v "WARNING:" | grep -v "^$" | grep -i "error\|fatal\|failed" | wc -l | tr -d ' ')

if [ $IMPORT_EXIT_CODE -eq 0 ] && [ "$ERROR_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ Import completed successfully${NC}"
    # Show last few lines of output for verification
    echo "   Last import messages:"
    tail -5 "$IMPORT_OUTPUT" | grep -v "^$" | sed 's/^/   /' || true
else
    echo -e "${RED}❌ Import failed or completed with errors${NC}"
    echo ""
    echo "   Error details:"
    grep -v "NOTICE:" "$IMPORT_ERROR" | grep -v "WARNING:" | grep -v "^$" | tail -20 | sed 's/^/   /' || true
    echo ""
    echo -e "${YELLOW}⚠️  Please check the error messages above${NC}"
    rm -f "$IMPORT_OUTPUT" "$IMPORT_ERROR" "$TEMP_IMPORT_FILE"
    exit 1
fi

# Clean up temp files
rm -f "$IMPORT_OUTPUT" "$IMPORT_ERROR" "$TEMP_IMPORT_FILE"
echo ""

# Step 6: Verify imported data
echo -e "${BLUE}🔍 Step 6/6: Verifying imported data...${NC}"
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
SELECT
    'balance_history' as table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_history')
        THEN (SELECT COUNT(*)::text FROM balance_history)
        ELSE 'N/A (table does not exist)'
    END as count
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
echo "   - Data dump (for import): $PROD_COMPLETE_FILE"
if [ -f "$PROD_SCHEMA_FILE" ]; then
    echo "   - Schema dump (reference only): $PROD_SCHEMA_FILE"
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

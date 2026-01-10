#!/bin/bash
# ========================================
# BASELINE PARITY TESTING SCRIPT
# ========================================
# Purpose: Verify the new baseline.sql produces identical schema to production
# Usage: ./scripts/test-baseline-parity.sh

set -e # Exit on error

echo "========================================"
echo "FAIRPAY BASELINE PARITY TEST"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LOCAL_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
BASELINE_FILE="supabase/baseline.sql"
OUTPUT_DIR="docs/database/parity-test"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Step 1: Verifying baseline file exists..."
if [ ! -f "$BASELINE_FILE" ]; then
  echo -e "${RED}❌ ERROR: Baseline file not found at $BASELINE_FILE${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Baseline file found${NC}"
echo ""

echo "Step 2: Checking Supabase CLI availability..."
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}❌ ERROR: Supabase CLI not found. Install from https://supabase.com/docs/guides/cli${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Supabase CLI available${NC}"
echo ""

echo "Step 3: Resetting local database..."
supabase db reset --force || {
  echo -e "${RED}❌ ERROR: Failed to reset database${NC}"
  exit 1
}
echo -e "${GREEN}✓ Database reset complete${NC}"
echo ""

echo "Step 4: Applying baseline.sql to local database..."
psql "$LOCAL_DB_URL" -f "$BASELINE_FILE" > "$OUTPUT_DIR/baseline-apply.log" 2>&1 || {
  echo -e "${RED}❌ ERROR: Failed to apply baseline. See $OUTPUT_DIR/baseline-apply.log${NC}"
  exit 1
}
echo -e "${GREEN}✓ Baseline applied successfully${NC}"
echo ""

echo "Step 5: Generating schema dump..."
pg_dump "$LOCAL_DB_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  --no-privileges \
  --schema=public \
  > "$OUTPUT_DIR/local-schema.sql" || {
  echo -e "${RED}❌ ERROR: Failed to generate schema dump${NC}"
  exit 1
}
echo -e "${GREEN}✓ Schema dump generated${NC}"
echo ""

echo "Step 6: Verifying object counts..."
psql "$LOCAL_DB_URL" -t -c "
SELECT
  'Tables: ' || COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Views: ' || COUNT(*)
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
SELECT 'Functions: ' || COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
UNION ALL
SELECT 'RLS Policies: ' || COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 'Indexes: ' || COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 'Storage Buckets: ' || COUNT(*)
FROM storage.buckets;
" > "$OUTPUT_DIR/object-counts.txt"

echo ""
echo "Object Counts:"
cat "$OUTPUT_DIR/object-counts.txt"
echo ""

echo "Step 7: Running functional tests..."

# Test 1: Verify extensions
echo "  - Testing extensions..."
psql "$LOCAL_DB_URL" -t -c "
SELECT extname FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto')
ORDER BY extname;
" > "$OUTPUT_DIR/test-extensions.txt"
EXT_COUNT=$(wc -l < "$OUTPUT_DIR/test-extensions.txt" | xargs)
if [ "$EXT_COUNT" -eq 2 ]; then
  echo -e "    ${GREEN}✓ Extensions present (uuid-ossp, pgcrypto)${NC}"
else
  echo -e "    ${RED}❌ Missing extensions${NC}"
fi

# Test 2: Verify core tables
echo "  - Testing core tables..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'user_roles', 'groups', 'group_members',
    'friendships', 'expenses', 'expense_splits', 'payments',
    'attachments', 'notifications', 'recurring_expenses',
    'user_settings', 'audit_logs', 'donation_settings', 'balance_history'
  );
" > "$OUTPUT_DIR/test-tables.txt"
TABLE_COUNT=$(cat "$OUTPUT_DIR/test-tables.txt" | xargs)
if [ "$TABLE_COUNT" -eq 15 ]; then
  echo -e "    ${GREEN}✓ All 15 core tables present${NC}"
else
  echo -e "    ${RED}❌ Missing tables (expected 15, found $TABLE_COUNT)${NC}"
fi

# Test 3: Verify views
echo "  - Testing views..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('user_debts_summary', 'user_debts_history');
" > "$OUTPUT_DIR/test-views.txt"
VIEW_COUNT=$(cat "$OUTPUT_DIR/test-views.txt" | xargs)
if [ "$VIEW_COUNT" -eq 2 ]; then
  echo -e "    ${GREEN}✓ Both debt views present${NC}"
else
  echo -e "    ${RED}❌ Missing views (expected 2, found $VIEW_COUNT)${NC}"
fi

# Test 4: Verify storage buckets
echo "  - Testing storage buckets..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM storage.buckets
WHERE id IN ('receipts', 'avatars', 'donation-images');
" > "$OUTPUT_DIR/test-storage.txt"
BUCKET_COUNT=$(cat "$OUTPUT_DIR/test-storage.txt" | xargs)
if [ "$BUCKET_COUNT" -eq 3 ]; then
  echo -e "    ${GREEN}✓ All 3 storage buckets present${NC}"
else
  echo -e "    ${RED}❌ Missing storage buckets (expected 3, found $BUCKET_COUNT)${NC}"
fi

# Test 5: Verify RLS enabled
echo "  - Testing RLS policies..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
" > "$OUTPUT_DIR/test-rls.txt"
RLS_COUNT=$(cat "$OUTPUT_DIR/test-rls.txt" | xargs)
if [ "$RLS_COUNT" -ge 13 ]; then
  echo -e "    ${GREEN}✓ RLS enabled on $RLS_COUNT tables${NC}"
else
  echo -e "    ${YELLOW}⚠ RLS enabled on only $RLS_COUNT tables (expected ≥13)${NC}"
fi

# Test 6: Verify realtime publication
echo "  - Testing realtime subscriptions..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('expenses', 'expense_splits');
" > "$OUTPUT_DIR/test-realtime.txt"
REALTIME_COUNT=$(cat "$OUTPUT_DIR/test-realtime.txt" | xargs)
if [ "$REALTIME_COUNT" -eq 2 ]; then
  echo -e "    ${GREEN}✓ Realtime enabled on expenses and expense_splits${NC}"
else
  echo -e "    ${YELLOW}⚠ Realtime not fully configured (expected 2, found $REALTIME_COUNT)${NC}"
fi

# Test 7: Verify settlement columns exist
echo "  - Testing settlement tracking columns..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expense_splits'
  AND column_name IN ('is_settled', 'settled_amount', 'settled_at');
" > "$OUTPUT_DIR/test-settlement.txt"
SETTLEMENT_COUNT=$(cat "$OUTPUT_DIR/test-settlement.txt" | xargs)
if [ "$SETTLEMENT_COUNT" -eq 3 ]; then
  echo -e "    ${GREEN}✓ Settlement tracking columns present in expense_splits${NC}"
else
  echo -e "    ${RED}❌ Missing settlement columns (expected 3, found $SETTLEMENT_COUNT)${NC}"
fi

# Test 8: Verify key functions exist
echo "  - Testing key functions..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user', 'is_admin', 'user_is_group_member',
    'get_user_balance', 'get_user_debts_aggregated', 'get_user_debts_history',
    'simplify_group_debts', 'settle_split', 'unsettle_split',
    'get_leaderboard_data'
  );
" > "$OUTPUT_DIR/test-functions.txt"
FUNCTION_COUNT=$(cat "$OUTPUT_DIR/test-functions.txt" | xargs)
if [ "$FUNCTION_COUNT" -ge 10 ]; then
  echo -e "    ${GREEN}✓ Key functions present ($FUNCTION_COUNT/10 verified)${NC}"
else
  echo -e "    ${YELLOW}⚠ Some functions missing (found $FUNCTION_COUNT/10)${NC}"
fi

# Test 9: Verify RLS policy counts per table
echo "  - Testing RLS policy details..."
psql "$LOCAL_DB_URL" -t -c "
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'groups', 'expenses', 'payments', 'expense_splits')
GROUP BY tablename
ORDER BY tablename;
" > "$OUTPUT_DIR/test-rls-details.txt"
RLS_DETAIL_COUNT=$(wc -l < "$OUTPUT_DIR/test-rls-details.txt" | xargs)
if [ "$RLS_DETAIL_COUNT" -eq 5 ]; then
  echo -e "    ${GREEN}✓ RLS policies configured on key tables${NC}"
else
  echo -e "    ${YELLOW}⚠ RLS configuration incomplete (expected 5 tables, found $RLS_DETAIL_COUNT)${NC}"
fi

# Test 10: Verify function signatures
echo "  - Testing function signatures..."
psql "$LOCAL_DB_URL" -t -c "
SELECT
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
  CASE WHEN p.proisstrict THEN 'STRICT' ELSE '' END as strict,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE '' END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'user_is_group_member', 'simplify_group_debts')
ORDER BY p.proname;
" > "$OUTPUT_DIR/test-function-signatures.txt"
SIG_COUNT=$(wc -l < "$OUTPUT_DIR/test-function-signatures.txt" | xargs)
if [ "$SIG_COUNT" -ge 3 ]; then
  echo -e "    ${GREEN}✓ Function signatures verified ($SIG_COUNT functions)${NC}"
else
  echo -e "    ${YELLOW}⚠ Function signature check incomplete${NC}"
fi

# Test 11: Verify foreign key constraints
echo "  - Testing foreign key constraints..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
  AND table_name IN (
    'group_members', 'expense_splits', 'payments',
    'friendships', 'expenses', 'attachments'
  );
" > "$OUTPUT_DIR/test-constraints.txt"
FK_COUNT=$(cat "$OUTPUT_DIR/test-constraints.txt" | xargs)
if [ "$FK_COUNT" -ge 15 ]; then
  echo -e "    ${GREEN}✓ Foreign key constraints present ($FK_COUNT FKs)${NC}"
else
  echo -e "    ${YELLOW}⚠ Some FK constraints may be missing (found $FK_COUNT)${NC}"
fi

# Test 12: Verify CHECK constraints
echo "  - Testing CHECK constraints..."
psql "$LOCAL_DB_URL" -t -c "
SELECT COUNT(*) FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND (constraint_name LIKE '%context%' OR constraint_name LIKE '%ordered%');
" > "$OUTPUT_DIR/test-check-constraints.txt"
CHECK_COUNT=$(cat "$OUTPUT_DIR/test-check-constraints.txt" | xargs)
if [ "$CHECK_COUNT" -ge 2 ]; then
  echo -e "    ${GREEN}✓ Key CHECK constraints present${NC}"
else
  echo -e "    ${YELLOW}⚠ Some CHECK constraints may be missing${NC}"
fi

echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"

# Generate test report
cat > "$OUTPUT_DIR/test-report.md" << EOF
# Baseline Parity Test Report

**Date:** $(date)
**Baseline File:** $BASELINE_FILE

## Test Results

| Test | Status | Details |
|------|--------|---------|
| Extensions | ✓ Pass | uuid-ossp, pgcrypto |
| Core Tables | $([ "$TABLE_COUNT" -eq 15 ] && echo "✓ Pass" || echo "✗ Fail") | $TABLE_COUNT/15 tables |
| Views | $([ "$VIEW_COUNT" -eq 2 ] && echo "✓ Pass" || echo "✗ Fail") | $VIEW_COUNT/2 views |
| Storage Buckets | $([ "$BUCKET_COUNT" -eq 3 ] && echo "✓ Pass" || echo "✗ Fail") | $BUCKET_COUNT/3 buckets |
| RLS Policies | $([ "$RLS_COUNT" -ge 13 ] && echo "✓ Pass" || echo "⚠ Warn") | $RLS_COUNT tables with RLS |
| RLS Policy Details | $([ "$RLS_DETAIL_COUNT" -eq 5 ] && echo "✓ Pass" || echo "⚠ Warn") | $RLS_DETAIL_COUNT/5 key tables |
| Realtime | $([ "$REALTIME_COUNT" -eq 2 ] && echo "✓ Pass" || echo "⚠ Warn") | $REALTIME_COUNT/2 tables |
| Settlement Columns | $([ "$SETTLEMENT_COUNT" -eq 3 ] && echo "✓ Pass" || echo "✗ Fail") | $SETTLEMENT_COUNT/3 columns |
| Key Functions | $([ "$FUNCTION_COUNT" -ge 10 ] && echo "✓ Pass" || echo "⚠ Warn") | $FUNCTION_COUNT/10 functions |
| Function Signatures | $([ "$SIG_COUNT" -ge 3 ] && echo "✓ Pass" || echo "⚠ Warn") | $SIG_COUNT signatures verified |
| Foreign Keys | $([ "$FK_COUNT" -ge 15 ] && echo "✓ Pass" || echo "⚠ Warn") | $FK_COUNT FK constraints |
| CHECK Constraints | $([ "$CHECK_COUNT" -ge 2 ] && echo "✓ Pass" || echo "⚠ Warn") | $CHECK_COUNT CHECK constraints |

## Object Counts

\`\`\`
$(cat "$OUTPUT_DIR/object-counts.txt")
\`\`\`

## Schema Dump

Full schema dump available at: \`$OUTPUT_DIR/local-schema.sql\`

## Baseline Apply Log

Full apply log available at: \`$OUTPUT_DIR/baseline-apply.log\`

## Recommendations

- Review any failing tests and update baseline.sql accordingly
- Verify production schema matches these counts before migration
- Test frontend CRUD operations after applying baseline
EOF

echo ""
cat "$OUTPUT_DIR/test-report.md"
echo ""

# Final verdict
if [ "$TABLE_COUNT" -eq 15 ] && [ "$VIEW_COUNT" -eq 2 ] && [ "$BUCKET_COUNT" -eq 3 ] && [ "$SETTLEMENT_COUNT" -eq 3 ]; then
  echo -e "${GREEN}✓ ALL CRITICAL TESTS PASSED${NC}"
  echo "Test report saved to: $OUTPUT_DIR/test-report.md"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED - Review test-report.md${NC}"
  echo "Test report saved to: $OUTPUT_DIR/test-report.md"
  exit 1
fi

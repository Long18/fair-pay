#!/bin/bash
# ============================================================================
# Production Schema Dump Script
# ============================================================================
# Purpose: Pull schema-only from production Supabase database (NO DATA)
# Output: scripts/production-schema.sql
# ============================================================================

set -e

echo "============================================"
echo " Production Schema Dump (Schema Only)"
echo "============================================"
echo ""

# Check for production DB URL
if [ -z "$PROD_DB_URL" ]; then
    echo "❌ ERROR: PROD_DB_URL environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export PROD_DB_URL='postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres'"
    echo "  $0"
    echo ""
    exit 1
fi

# Check for pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo "❌ ERROR: pg_dump command not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

OUTPUT_FILE="scripts/production-schema.sql"

echo "🔍 Dumping schema from production..."
echo "   Target: $OUTPUT_FILE"
echo ""

# Dump schema only (no data, no ownership, no privileges)
pg_dump "$PROD_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --exclude-schema='auth' \
  --exclude-schema='storage' \
  --exclude-schema='extensions' \
  --exclude-schema='realtime' \
  --exclude-schema='graphql' \
  --exclude-schema='graphql_public' \
  --exclude-schema='supabase_functions' \
  --exclude-schema='_realtime' \
  --exclude-schema='supavisor' \
  > "$OUTPUT_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Schema dump successful"
    echo ""
    echo "📊 Schema Statistics:"
    echo "   File size: $(wc -c < "$OUTPUT_FILE" | tr -d ' ') bytes"
    echo "   Lines: $(wc -l < "$OUTPUT_FILE" | tr -d ' ')"
    echo "   Tables: $(grep -c "^CREATE TABLE" "$OUTPUT_FILE" || echo 0)"
    echo "   Functions: $(grep -c "^CREATE FUNCTION\|^CREATE OR REPLACE FUNCTION" "$OUTPUT_FILE" || echo 0)"
    echo "   Views: $(grep -c "^CREATE VIEW\|^CREATE OR REPLACE VIEW" "$OUTPUT_FILE" || echo 0)"
    echo "   RLS Policies: $(grep -c "^CREATE POLICY" "$OUTPUT_FILE" || echo 0)"
    echo ""
    echo "✓ Production schema saved to $OUTPUT_FILE"
else
    echo "❌ Schema dump failed"
    echo ""
    echo "Common issues:"
    echo "  - Incorrect PROD_DB_URL"
    echo "  - Network connectivity"
    echo "  - Insufficient permissions"
    exit 1
fi

echo ""
echo "============================================"
echo " Next Steps"
echo "============================================"
echo ""
echo "1. Review the dumped schema:"
echo "   less $OUTPUT_FILE"
echo ""
echo "2. Compare with baseline:"
echo "   ./scripts/compare-prod-vs-baseline.sh"
echo ""

#!/bin/bash
# ============================================================================
# Production vs Baseline Comparison Script
# ============================================================================
# Purpose: Compare production schema with baseline.sql
# Categorizes differences as BLOCKING, RISKY, or SAFE
# Output: Detailed comparison report
# ============================================================================

set -e

BASELINE_FILE="supabase/baseline.sql"
PROD_SCHEMA_FILE="scripts/production-schema.sql"
REPORT_FILE="scripts/schema-comparison-report.txt"

echo "============================================"
echo " Production vs Baseline Schema Comparison"
echo "============================================"
echo ""

# Check for required files
if [ ! -f "$BASELINE_FILE" ]; then
    echo "❌ ERROR: $BASELINE_FILE not found"
    exit 1
fi

if [ ! -f "$PROD_SCHEMA_FILE" ]; then
    echo "❌ ERROR: $PROD_SCHEMA_FILE not found"
    echo ""
    echo "Please run first:"
    echo "  export PROD_DB_URL='...'"
    echo "  ./scripts/dump-production-schema.sh"
    echo ""
    exit 1
fi

echo "✓ Found baseline and production schema"
echo ""

# ============================================================================
# Extract Objects
# ============================================================================

echo "📊 Extracting objects..."

# Tables
BASELINE_TABLES=$(grep -E "^CREATE TABLE" "$BASELINE_FILE" | awk '{print $3}' | sort)
PROD_TABLES=$(grep -E "^CREATE TABLE" "$PROD_SCHEMA_FILE" | awk '{print $3}' | sort)

# Functions
BASELINE_FUNCTIONS=$(grep -E "^CREATE (OR REPLACE )?FUNCTION" "$BASELINE_FILE" | \
    grep -v "RETURNS TRIGGER" | \
    awk '{for(i=1;i<=NF;i++){if($i~/^[a-z_]+\(/){print $i; break}}}' | \
    sed 's/(.*$//' | sort)
PROD_FUNCTIONS=$(grep -E "^CREATE (OR REPLACE )?FUNCTION" "$PROD_SCHEMA_FILE" | \
    grep -v "RETURNS TRIGGER" | \
    awk '{for(i=1;i<=NF;i++){if($i~/^[a-z_]+\(/){print $i; break}}}' | \
    sed 's/(.*$//' | sort)

# Views
BASELINE_VIEWS=$(grep -E "^CREATE (OR REPLACE )?VIEW" "$BASELINE_FILE" | awk '{print $4}' | sort)
PROD_VIEWS=$(grep -E "^CREATE (OR REPLACE )?VIEW" "$PROD_SCHEMA_FILE" | awk '{print $4}' | sort)

# RLS Policies
BASELINE_POLICIES=$(grep -E '^CREATE POLICY' "$BASELINE_FILE" | sed 's/CREATE POLICY "\([^"]*\)".*/\1/' | sort)
PROD_POLICIES=$(grep -E '^CREATE POLICY' "$PROD_SCHEMA_FILE" | sed 's/CREATE POLICY "\([^"]*\)".*/\1/' | sort)

echo "  Baseline: $(echo "$BASELINE_TABLES" | wc -l | tr -d ' ') tables, $(echo "$BASELINE_FUNCTIONS" | wc -l | tr -d ' ') functions, $(echo "$BASELINE_VIEWS" | wc -l | tr -d ' ') views, $(echo "$BASELINE_POLICIES" | wc -l | tr -d ' ') policies"
echo "  Production: $(echo "$PROD_TABLES" | wc -l | tr -d ' ') tables, $(echo "$PROD_FUNCTIONS" | wc -l | tr -d ' ') functions, $(echo "$PROD_VIEWS" | wc -l | tr -d ' ') views, $(echo "$PROD_POLICIES" | wc -l | tr -d ' ') policies"
echo ""

# ============================================================================
# Compare Objects
# ============================================================================

echo "🔍 Comparing objects..."
echo ""

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
============================================
 Production vs Baseline Schema Comparison
============================================

EOF

# Tables
echo "## TABLES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TABLES_ONLY_IN_PROD=$(comm -23 <(echo "$PROD_TABLES") <(echo "$BASELINE_TABLES"))
TABLES_ONLY_IN_BASELINE=$(comm -13 <(echo "$PROD_TABLES") <(echo "$BASELINE_TABLES"))
TABLES_IN_BOTH=$(comm -12 <(echo "$PROD_TABLES") <(echo "$BASELINE_TABLES"))

if [ -n "$TABLES_ONLY_IN_PROD" ]; then
    echo "### Tables in Production but NOT in Baseline (BLOCKING):" >> "$REPORT_FILE"
    echo "$TABLES_ONLY_IN_PROD" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$TABLES_ONLY_IN_BASELINE" ]; then
    echo "### Tables in Baseline but NOT in Production (BLOCKING):" >> "$REPORT_FILE"
    echo "$TABLES_ONLY_IN_BASELINE" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$TABLES_IN_BOTH" ]; then
    echo "### Tables in Both:" >> "$REPORT_FILE"
    echo "$(echo "$TABLES_IN_BOTH" | wc -l | tr -d ' ') tables match" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Functions
echo "## FUNCTIONS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

FUNCTIONS_ONLY_IN_PROD=$(comm -23 <(echo "$PROD_FUNCTIONS") <(echo "$BASELINE_FUNCTIONS"))
FUNCTIONS_ONLY_IN_BASELINE=$(comm -13 <(echo "$PROD_FUNCTIONS") <(echo "$BASELINE_FUNCTIONS"))
FUNCTIONS_IN_BOTH=$(comm -12 <(echo "$PROD_FUNCTIONS") <(echo "$BASELINE_FUNCTIONS"))

if [ -n "$FUNCTIONS_ONLY_IN_PROD" ]; then
    echo "### Functions in Production but NOT in Baseline (RISKY):" >> "$REPORT_FILE"
    echo "$FUNCTIONS_ONLY_IN_PROD" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$FUNCTIONS_ONLY_IN_BASELINE" ]; then
    echo "### Functions in Baseline but NOT in Production (BLOCKING):" >> "$REPORT_FILE"
    echo "$FUNCTIONS_ONLY_IN_BASELINE" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$FUNCTIONS_IN_BOTH" ]; then
    echo "### Functions in Both:" >> "$REPORT_FILE"
    echo "$(echo "$FUNCTIONS_IN_BOTH" | wc -l | tr -d ' ') functions match" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Views
echo "## VIEWS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

VIEWS_ONLY_IN_PROD=$(comm -23 <(echo "$PROD_VIEWS") <(echo "$BASELINE_VIEWS"))
VIEWS_ONLY_IN_BASELINE=$(comm -13 <(echo "$PROD_VIEWS") <(echo "$BASELINE_VIEWS"))
VIEWS_IN_BOTH=$(comm -12 <(echo "$PROD_VIEWS") <(echo "$BASELINE_VIEWS"))

if [ -n "$VIEWS_ONLY_IN_PROD" ]; then
    echo "### Views in Production but NOT in Baseline (RISKY):" >> "$REPORT_FILE"
    echo "$VIEWS_ONLY_IN_PROD" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$VIEWS_ONLY_IN_BASELINE" ]; then
    echo "### Views in Baseline but NOT in Production (BLOCKING):" >> "$REPORT_FILE"
    echo "$VIEWS_ONLY_IN_BASELINE" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$VIEWS_IN_BOTH" ]; then
    echo "### Views in Both:" >> "$REPORT_FILE"
    echo "$(echo "$VIEWS_IN_BOTH" | wc -l | tr -d ' ') views match" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# RLS Policies
echo "## RLS POLICIES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

POLICIES_ONLY_IN_PROD=$(comm -23 <(echo "$PROD_POLICIES") <(echo "$BASELINE_POLICIES"))
POLICIES_ONLY_IN_BASELINE=$(comm -13 <(echo "$PROD_POLICIES") <(echo "$BASELINE_POLICIES"))
POLICIES_IN_BOTH=$(comm -12 <(echo "$PROD_POLICIES") <(echo "$BASELINE_POLICIES"))

if [ -n "$POLICIES_ONLY_IN_PROD" ]; then
    echo "### RLS Policies in Production but NOT in Baseline (BLOCKING):" >> "$REPORT_FILE"
    echo "$POLICIES_ONLY_IN_PROD" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$POLICIES_ONLY_IN_BASELINE" ]; then
    echo "### RLS Policies in Baseline but NOT in Production (BLOCKING):" >> "$REPORT_FILE"
    echo "$POLICIES_ONLY_IN_BASELINE" | sed 's/^/  - /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

if [ -n "$POLICIES_IN_BOTH" ]; then
    echo "### RLS Policies in Both:" >> "$REPORT_FILE"
    echo "$(echo "$POLICIES_IN_BOTH" | wc -l | tr -d ' ') policies match" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# ============================================================================
# Summary
# ============================================================================

BLOCKING_COUNT=0
RISKY_COUNT=0
SAFE_COUNT=0

[ -n "$TABLES_ONLY_IN_PROD" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$TABLES_ONLY_IN_PROD" | wc -l | tr -d ' ')))
[ -n "$TABLES_ONLY_IN_BASELINE" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$TABLES_ONLY_IN_BASELINE" | wc -l | tr -d ' ')))
[ -n "$FUNCTIONS_ONLY_IN_PROD" ] && RISKY_COUNT=$((RISKY_COUNT + $(echo "$FUNCTIONS_ONLY_IN_PROD" | wc -l | tr -d ' ')))
[ -n "$FUNCTIONS_ONLY_IN_BASELINE" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$FUNCTIONS_ONLY_IN_BASELINE" | wc -l | tr -d ' ')))
[ -n "$VIEWS_ONLY_IN_PROD" ] && RISKY_COUNT=$((RISKY_COUNT + $(echo "$VIEWS_ONLY_IN_PROD" | wc -l | tr -d ' ')))
[ -n "$VIEWS_ONLY_IN_BASELINE" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$VIEWS_ONLY_IN_BASELINE" | wc -l | tr -d ' ')))
[ -n "$POLICIES_ONLY_IN_PROD" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$POLICIES_ONLY_IN_PROD" | wc -l | tr -d ' ')))
[ -n "$POLICIES_ONLY_IN_BASELINE" ] && BLOCKING_COUNT=$((BLOCKING_COUNT + $(echo "$POLICIES_ONLY_IN_BASELINE" | wc -l | tr -d ' ')))

echo "## SUMMARY" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Differences Found:" >> "$REPORT_FILE"
echo "  - BLOCKING: $BLOCKING_COUNT (must fix before deploy)" >> "$REPORT_FILE"
echo "  - RISKY: $RISKY_COUNT (should review)" >> "$REPORT_FILE"
echo "  - SAFE: $SAFE_COUNT (informational only)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $BLOCKING_COUNT -eq 0 ] && [ $RISKY_COUNT -eq 0 ]; then
    echo "✅ READY FOR DEPLOYMENT - No blocking or risky differences" >> "$REPORT_FILE"
elif [ $BLOCKING_COUNT -eq 0 ]; then
    echo "⚠️  REVIEW REQUIRED - Risky differences found" >> "$REPORT_FILE"
else
    echo "❌ NOT READY - Blocking differences must be resolved" >> "$REPORT_FILE"
fi

# ============================================================================
# Display Report
# ============================================================================

echo "✅ Comparison complete!"
echo ""
cat "$REPORT_FILE"

echo ""
echo "============================================"
echo " Report saved to: $REPORT_FILE"
echo "============================================"

if [ $BLOCKING_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi

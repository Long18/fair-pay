#!/bin/bash
# ============================================================================
# Documentation Validation Script
# ============================================================================
# Purpose: Cross-check database documentation against baseline.sql
# Validates that all documented tables, functions, and policies exist in SQL
# ============================================================================

set -e

BASELINE_FILE="supabase/baseline.sql"
DOCS_DIR="docs/database"
ERRORS=0

echo "============================================"
echo " FairPay Documentation Validation"
echo "============================================"
echo ""

# Check if baseline exists
if [ ! -f "$BASELINE_FILE" ]; then
    echo "❌ ERROR: $BASELINE_FILE not found"
    exit 1
fi

if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ ERROR: $DOCS_DIR directory not found"
    exit 1
fi

echo "✓ Found baseline and documentation directory"
echo ""

# ============================================================================
# Extract objects from baseline.sql
# ============================================================================

echo "Extracting objects from baseline.sql..."

# Tables
BASELINE_TABLES=$(grep -E "^CREATE TABLE" "$BASELINE_FILE" | awk '{print $3}' | sort | uniq)
TABLE_COUNT=$(echo "$BASELINE_TABLES" | wc -l | tr -d ' ')
echo "  - Found $TABLE_COUNT tables in baseline"

# Functions (excluding triggers)
BASELINE_FUNCTIONS=$(grep -E "^CREATE (OR REPLACE )?FUNCTION" "$BASELINE_FILE" | \
    grep -v "RETURNS TRIGGER" | \
    awk '{for(i=1;i<=NF;i++){if($i~/^[a-z_]+\(/){print $i; break}}}' | \
    sed 's/(.*$//' | sort | uniq)
FUNCTION_COUNT=$(echo "$BASELINE_FUNCTIONS" | wc -l | tr -d ' ')
echo "  - Found $FUNCTION_COUNT functions in baseline"

# RLS Policies
BASELINE_POLICIES=$(grep -E '^CREATE POLICY' "$BASELINE_FILE" | \
    sed 's/CREATE POLICY "\([^"]*\)".*/\1/' | sort | uniq)
POLICY_COUNT=$(echo "$BASELINE_POLICIES" | wc -l | tr -d ' ')
echo "  - Found $POLICY_COUNT RLS policies in baseline"

# Views
BASELINE_VIEWS=$(grep -E "^CREATE (OR REPLACE )?VIEW" "$BASELINE_FILE" | awk '{print $4}' | sort | uniq)
VIEW_COUNT=$(echo "$BASELINE_VIEWS" | wc -l | tr -d ' ')
echo "  - Found $VIEW_COUNT views in baseline"

# Storage Buckets
BASELINE_BUCKETS=$(grep -E "^INSERT INTO storage.buckets.*VALUES" "$BASELINE_FILE" | \
    sed "s/.*VALUES *( *'\([^']*\)'.*/\1/" | sort | uniq)
BUCKET_COUNT=$(echo "$BASELINE_BUCKETS" | wc -l | tr -d ' ')
echo "  - Found $BUCKET_COUNT storage buckets in baseline"

echo ""

# ============================================================================
# Validate schema.md
# ============================================================================

echo "Validating schema.md..."

if [ ! -f "$DOCS_DIR/schema.md" ]; then
    echo "  ❌ schema.md not found"
    ERRORS=$((ERRORS + 1))
else
    SCHEMA_DOC="$DOCS_DIR/schema.md"

    # Check if all baseline tables are documented
    MISSING_TABLES=""
    while IFS= read -r table; do
        if ! grep -q "### \`$table\`" "$SCHEMA_DOC"; then
            MISSING_TABLES="$MISSING_TABLES\n    - $table"
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$BASELINE_TABLES"

    if [ -n "$MISSING_TABLES" ]; then
        echo "  ❌ Missing table documentation:$MISSING_TABLES"
    else
        echo "  ✓ All tables documented"
    fi

    # Check if all baseline views are documented
    MISSING_VIEWS=""
    while IFS= read -r view; do
        if ! grep -q "### \`$view\`" "$SCHEMA_DOC"; then
            MISSING_VIEWS="$MISSING_VIEWS\n    - $view"
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$BASELINE_VIEWS"

    if [ -n "$MISSING_VIEWS" ]; then
        echo "  ❌ Missing view documentation:$MISSING_VIEWS"
    else
        echo "  ✓ All views documented"
    fi
fi

echo ""

# ============================================================================
# Validate rls.md
# ============================================================================

echo "Validating rls.md..."

if [ ! -f "$DOCS_DIR/rls.md" ]; then
    echo "  ❌ rls.md not found"
    ERRORS=$((ERRORS + 1))
else
    RLS_DOC="$DOCS_DIR/rls.md"

    # Check if key tables have RLS documentation
    KEY_TABLES="profiles groups expenses payments"
    MISSING_RLS=""
    for table in $KEY_TABLES; do
        if ! grep -q "### \`$table\`" "$RLS_DOC"; then
            MISSING_RLS="$MISSING_RLS\n    - $table"
            ERRORS=$((ERRORS + 1))
        fi
    done

    if [ -n "$MISSING_RLS" ]; then
        echo "  ❌ Missing RLS documentation for key tables:$MISSING_RLS"
    else
        echo "  ✓ Key tables have RLS documentation"
    fi

    # Check if storage bucket policies are documented
    MISSING_BUCKET_DOCS=""
    while IFS= read -r bucket; do
        if ! grep -q "\`$bucket\`" "$RLS_DOC"; then
            MISSING_BUCKET_DOCS="$MISSING_BUCKET_DOCS\n    - $bucket"
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$BASELINE_BUCKETS"

    if [ -n "$MISSING_BUCKET_DOCS" ]; then
        echo "  ❌ Missing storage bucket documentation:$MISSING_BUCKET_DOCS"
    else
        echo "  ✓ All storage buckets documented"
    fi
fi

echo ""

# ============================================================================
# Validate functions.md
# ============================================================================

echo "Validating functions.md..."

if [ ! -f "$DOCS_DIR/functions.md" ]; then
    echo "  ❌ functions.md not found"
    ERRORS=$((ERRORS + 1))
else
    FUNCTIONS_DOC="$DOCS_DIR/functions.md"

    # Check if key functions are documented
    KEY_FUNCTIONS="is_admin user_is_group_member get_user_balance simplify_group_debts settle_split"
    MISSING_FUNC_DOCS=""
    for func in $KEY_FUNCTIONS; do
        if ! grep -q "### \`$func" "$FUNCTIONS_DOC"; then
            MISSING_FUNC_DOCS="$MISSING_FUNC_DOCS\n    - $func"
            ERRORS=$((ERRORS + 1))
        fi
    done

    if [ -n "$MISSING_FUNC_DOCS" ]; then
        echo "  ❌ Missing function documentation:$MISSING_FUNC_DOCS"
    else
        echo "  ✓ Key functions documented"
    fi
fi

echo ""

# ============================================================================
# Validate migrations.md
# ============================================================================

echo "Validating migrations.md..."

if [ ! -f "$DOCS_DIR/migrations.md" ]; then
    echo "  ❌ migrations.md not found"
    ERRORS=$((ERRORS + 1))
else
    MIGRATIONS_DOC="$DOCS_DIR/migrations.md"

    # Check for required sections
    REQUIRED_SECTIONS=(
        "Single Baseline"
        "How to Add a New Schema Change"
        "Incremental Migrations"
    )

    MISSING_SECTIONS=""
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -q "$section" "$MIGRATIONS_DOC"; then
            MISSING_SECTIONS="$MISSING_SECTIONS\n    - $section"
            ERRORS=$((ERRORS + 1))
        fi
    done

    if [ -n "$MISSING_SECTIONS" ]; then
        echo "  ❌ Missing required sections:$MISSING_SECTIONS"
    else
        echo "  ✓ All required sections present"
    fi
fi

echo ""

# ============================================================================
# Check for orphaned documentation
# ============================================================================

echo "Checking for orphaned documentation..."

# Extract documented tables from schema.md
if [ -f "$DOCS_DIR/schema.md" ]; then
    DOCUMENTED_TABLES=$(grep -E "^### \`[a-z_]+\`$" "$DOCS_DIR/schema.md" | \
        sed 's/### `\([^`]*\)`/\1/' | sort | uniq)

    ORPHANED_TABLES=""
    while IFS= read -r table; do
        if ! echo "$BASELINE_TABLES" | grep -q "^$table$"; then
            ORPHANED_TABLES="$ORPHANED_TABLES\n    - $table"
            ERRORS=$((ERRORS + 1))
        fi
    done <<< "$DOCUMENTED_TABLES"

    if [ -n "$ORPHANED_TABLES" ]; then
        echo "  ⚠️  Documented tables not in baseline:$ORPHANED_TABLES"
    else
        echo "  ✓ No orphaned table documentation"
    fi
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "============================================"
echo " Validation Summary"
echo "============================================"
echo "Baseline Objects:"
echo "  - Tables:  $TABLE_COUNT"
echo "  - Views:   $VIEW_COUNT"
echo "  - Functions: $FUNCTION_COUNT"
echo "  - RLS Policies: $POLICY_COUNT"
echo "  - Storage Buckets: $BUCKET_COUNT"
echo ""
echo "Documentation Files:"
echo "  - overview.md:   $([ -f "$DOCS_DIR/overview.md" ] && echo "✓" || echo "✗")"
echo "  - schema.md:     $([ -f "$DOCS_DIR/schema.md" ] && echo "✓" || echo "✗")"
echo "  - rls.md:        $([ -f "$DOCS_DIR/rls.md" ] && echo "✓" || echo "✗")"
echo "  - functions.md:  $([ -f "$DOCS_DIR/functions.md" ] && echo "✓" || echo "✗")"
echo "  - migrations.md: $([ -f "$DOCS_DIR/migrations.md" ] && echo "✓" || echo "✗")"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ VALIDATION PASSED - No errors found"
    exit 0
else
    echo "❌ VALIDATION FAILED - $ERRORS error(s) found"
    echo ""
    echo "Please review the errors above and update documentation accordingly."
    exit 1
fi

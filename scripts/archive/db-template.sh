#!/bin/bash

# Database Template Generator
# Creates migration and seed data templates following project conventions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📝 FairPay Database Template Generator"
echo "========================================"
echo ""

# Check if Supabase is initialized
if [ ! -d "supabase" ]; then
    echo "❌ Error: Supabase directory not found!"
    echo "   Please initialize Supabase first: pnpm supabase:start"
    exit 1
fi

# Parse arguments
TEMPLATE_TYPE="${1:-migration}"
TEMPLATE_NAME="${2:-}"

if [ -z "$TEMPLATE_NAME" ]; then
    echo "Usage: pnpm db:template <type> <name>"
    echo ""
    echo "Types:"
    echo "  migration  - Create a new migration file (default)"
    echo "  seed       - Create a new seed data template"
    echo ""
    echo "Examples:"
    echo "  pnpm db:template migration add_user_preferences"
    echo "  pnpm db:template seed test_data"
    echo ""
    echo "💡 Tip: You can also use the script directly:"
    echo "  ./scripts/db-template.sh migration my_migration"
    exit 0
fi

# Generate migration template
if [ "$TEMPLATE_TYPE" = "migration" ]; then
    echo "🔄 Creating migration template: $TEMPLATE_NAME"
    echo ""

    # Use Supabase CLI to create migration
    if command -v supabase &> /dev/null; then
        # Get next migration number
        LAST_MIGRATION=$(ls -1 supabase/migrations/*.sql 2>/dev/null | grep -E '^[0-9]+_' | sort -V | tail -1)
        if [ -n "$LAST_MIGRATION" ]; then
            LAST_NUM=$(basename "$LAST_MIGRATION" | cut -d'_' -f1 | sed 's/^0*//')
            NEXT_NUM=$((LAST_NUM + 1))
        else
            NEXT_NUM=1
        fi

        # Format with leading zeros (3 digits)
        FORMATTED_NUM=$(printf "%03d" "$NEXT_NUM")

        # Create migration using Supabase CLI
        MIGRATION_FILE=$(supabase migration new "$TEMPLATE_NAME" 2>&1 | grep -o '[0-9]\{14\}_[^[:space:]]*\.sql' | head -1)

        if [ -z "$MIGRATION_FILE" ]; then
            # Fallback: create manually
            TIMESTAMP=$(date +%Y%m%d%H%M%S)
            MIGRATION_FILE="${TIMESTAMP}_${TEMPLATE_NAME}.sql"
            MIGRATION_PATH="supabase/migrations/$MIGRATION_FILE"
        else
            MIGRATION_PATH="supabase/migrations/$MIGRATION_FILE"
        fi

        # Add template content
        cat > "$MIGRATION_PATH" << EOF
-- Migration: ${FORMATTED_NUM}_${TEMPLATE_NAME}.sql
-- Description: [Describe what this migration does]
-- Date: $(date +%Y-%m-%d)

-- TODO: Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--   updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );

-- Enable RLS if needed
-- ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Add policies if needed
-- CREATE POLICY "example_table_select"
-- ON example_table FOR SELECT
-- TO authenticated
-- USING (true);

EOF

        echo "✅ Migration template created: $MIGRATION_PATH"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Edit the migration file: $MIGRATION_PATH"
        echo "   2. Add your SQL statements"
        echo "   3. Test locally: pnpm db:reset"
        echo "   4. Apply to production: supabase db push"

    else
        echo "❌ Error: Supabase CLI not found!"
        echo "   Please install: npm install -g supabase"
        exit 1
    fi

# Generate seed template
elif [ "$TEMPLATE_TYPE" = "seed" ]; then
    echo "🌱 Creating seed data template: $TEMPLATE_NAME"
    echo ""

    SEED_PATH="supabase/seed/${TEMPLATE_NAME}.sql"

    # Check if file already exists
    if [ -f "$SEED_PATH" ]; then
        echo "⚠️  Warning: File already exists: $SEED_PATH"
        read -p "   Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Cancelled"
            exit 1
        fi
    fi

    # Create seed template
    cat > "$SEED_PATH" << 'EOF'
-- Seed Data: [TEMPLATE_NAME]
-- Description: [Describe what data this seed file creates]
-- Date: [DATE]
-- Prerequisites: [List any required data, e.g., "Requires existing profiles"]

-- ============================================
-- 1. [TABLE_NAME]
-- ============================================
-- Note: Replace UUIDs with actual IDs from your database

-- INSERT INTO [table_name] ([columns])
-- VALUES
--   ('[value1]', '[value2]', ...),
--   ('[value1]', '[value2]', ...)
-- ON CONFLICT ([conflict_column]) DO UPDATE SET
--   [column] = EXCLUDED.[column];

-- ============================================
-- 2. [ANOTHER_TABLE]
-- ============================================

-- INSERT INTO [another_table] ([columns])
-- VALUES
--   ('[value1]', '[value2]', ...);

EOF

    # Replace placeholders
    sed -i.bak "s/\[TEMPLATE_NAME\]/$TEMPLATE_NAME/g" "$SEED_PATH"
    sed -i.bak "s/\[DATE\]/$(date +%Y-%m-%d)/g" "$SEED_PATH"
    rm -f "${SEED_PATH}.bak"

    echo "✅ Seed template created: $SEED_PATH"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Edit the seed file: $SEED_PATH"
    echo "   2. Replace placeholders with actual data"
    echo "   3. Update UUIDs to match your database"
    echo "   4. Run: pnpm db:seed (or use docker exec)"

else
    echo "❌ Error: Unknown template type: $TEMPLATE_TYPE"
    echo "   Valid types: migration, seed"
    exit 1
fi

echo ""
echo "✨ Template ready!"

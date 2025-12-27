#!/bin/bash

# Simple script to pull production data into local
# Usage: ./scripts/pull-production-data-simple.sh

set -e

echo "🔄 Pulling Production Data..."

# Create backups directory
mkdir -p supabase/backups

# Dump production data
PROD_FILE="supabase/backups/prod-$(date +%Y%m%d-%H%M%S).sql"
echo "📥 Dumping production data..."
supabase db dump --data-only --schema public > "$PROD_FILE"
echo "✅ Saved to: $PROD_FILE"

# Reset local database (this will apply migrations)
echo "🔄 Resetting local database..."
supabase db reset

# Import production data
echo "📤 Importing production data..."
# Try psql first, fallback to supabase db push
if command -v psql &> /dev/null; then
    psql postgresql://postgres:postgres@localhost:54322/postgres < "$PROD_FILE"
else
    # Alternative using supabase CLI
    supabase db push --local --include-all < "$PROD_FILE" 2>&1 | tail -20 || \
    cat "$PROD_FILE" | supabase db execute --local - 2>&1 | tail -20
fi

echo "✅ Done! Production data is now in local database."
echo ""
echo "To verify data, check Supabase Studio:"
echo "  http://localhost:54323 (Database → Tables)"
echo ""
echo "Or use Supabase CLI:"
echo "  supabase db remote commit"

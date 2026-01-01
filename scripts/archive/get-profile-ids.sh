#!/bin/bash

# Helper script to get profile IDs for updating sample-data.sql

echo "📋 Getting Profile IDs from database..."
echo ""
echo "Opening Supabase Studio..."
echo ""

# Open Supabase Studio
if command -v open &> /dev/null; then
  open http://127.0.0.1:54323
elif command -v xdg-open &> /dev/null; then
  xdg-open http://127.0.0.1:54323
else
  echo "Please open: http://127.0.0.1:54323"
fi

echo ""
echo "📝 Instructions:"
echo "1. Click on 'SQL Editor' in the left sidebar"
echo "2. Run this query:"
echo ""
echo "   SELECT id, full_name FROM profiles LIMIT 5;"
echo ""
echo "3. Copy the UUIDs from the results"
echo ""
echo "💡 Then update supabase/seed/sample-data.sql:"
echo "   - Replace 00000000-0000-0000-0000-000000000001 with 1st UUID"
echo "   - Replace 00000000-0000-0000-0000-000000000002 with 2nd UUID"
echo "   - Replace 00000000-0000-0000-0000-000000000003 with 3rd UUID"
echo "   - Replace 00000000-0000-0000-0000-000000000004 with 4th UUID"
echo "   - Replace 00000000-0000-0000-0000-000000000005 with 5th UUID"
echo ""
echo "Then run: pnpm db:seed"

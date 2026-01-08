#!/bin/bash

echo "🧪 Testing Momo Payment Flow"
echo "=============================="

# Check Supabase is running
if ! pnpm supabase:status > /dev/null 2>&1; then
    echo "❌ Supabase is not running!"
    echo "   Run: pnpm supabase:start"
    exit 1
fi

echo "✅ Supabase is running"
echo ""

# Check if tables exist
echo "📊 Checking database tables..."
docker exec supabase_db_FairPay psql -U postgres -d postgres -c "
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'momo_settings')
    THEN '✅ momo_settings'
    ELSE '❌ momo_settings'
  END as status
UNION ALL
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'momo_payment_requests')
    THEN '✅ momo_payment_requests'
    ELSE '❌ momo_payment_requests'
  END
UNION ALL
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_momo_payment_request')
    THEN '✅ create_momo_payment_request()'
    ELSE '❌ create_momo_payment_request()'
  END;
"

echo ""
echo "📝 Next steps:"
echo "1. Open http://localhost:5173"
echo "2. Login with user1@test.com / password123"
echo "3. Create an expense"
echo "4. Click 'Pay via MoMo' button"
echo ""


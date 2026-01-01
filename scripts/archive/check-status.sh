#!/bin/bash

# Check Database Status Script
# Displays current test data in the database

echo "📊 DATABASE STATUS"
echo "=================="
echo ""

echo "👥 Users:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT '  - ' || full_name || ' (' || email || ')' FROM profiles ORDER BY created_at;"

echo ""
echo "🤝 Friendships:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM friendships WHERE status = 'accepted';" | xargs echo "  Total:"

echo ""
echo "🏠 Groups:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT '  - ' || name || ' (' || (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id) || ' members)' FROM groups ORDER BY created_at;"

echo ""
echo "💰 Expenses:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM expenses;" | xargs echo "  Total:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT '  - ' || description || ': ₫' || ROUND(amount::numeric, 0) FROM expenses ORDER BY expense_date DESC LIMIT 5;"

echo ""
echo "💸 Payments:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM payments;" | xargs echo "  Total:"

echo ""
echo "📈 Debt Summary:"
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -t -c "
SELECT '  ' || p1.full_name || ' owes ' || p2.full_name || ': ₫' || ROUND(amount_owed::numeric, 0)
FROM user_debts_summary uds
JOIN profiles p1 ON p1.id = uds.owes_user
JOIN profiles p2 ON p2.id = uds.owed_user
ORDER BY amount_owed DESC
LIMIT 10;
"

echo ""

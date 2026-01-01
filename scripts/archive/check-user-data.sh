#!/bin/bash

# Check data for specific user
USER_ID="9ac73f98-d6ff-54dd-8337-e96816e855c1"
API_KEY="sb_publishable_0yceATVVLm4qzXjhzj7c7g_sdu0N2Ku"

echo "=== Checking data for user: long.lnt@amanotes.com ==="
echo ""

echo "1. User Profile:"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/profiles?select=*&id=eq.$USER_ID" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

echo ""
echo ""
echo "2. Recent Expenses (with joins):"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/expenses?select=*,groups!group_id(id,name),profiles!created_by(id,full_name)&limit=3&order=created_at.desc" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

echo ""
echo ""
echo "3. Recent Payments (with joins):"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/payments?select=*,groups!group_id(id,name),profiles!created_by(id,full_name),from_profile:from_user(full_name),to_profile:to_user(full_name)&limit=3&order=created_at.desc" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

echo ""
echo ""
echo "4. Check if groups/profiles are returning data:"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/groups?select=id,name&limit=1" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

echo ""
echo ""
echo "5. Check profiles table:"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/profiles?select=id,full_name&limit=1" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

echo ""

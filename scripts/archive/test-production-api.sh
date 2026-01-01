#!/bin/bash

# Test Production API endpoints
echo "Testing Production Supabase API..."
echo ""

# Test expenses endpoint
echo "1. Testing /rest/v1/expenses endpoint:"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/expenses?select=*,groups!group_id(id,name),profiles!created_by(id,full_name)&offset=0&limit=10&order=created_at.desc" \
  -H "apikey: sb_publishable_0yceATVVLm4qzXjhzj7c7g_sdu0N2Ku" \
  -H "Authorization: Bearer sb_publishable_0yceATVVLm4qzXjhzj7c7g_sdu0N2Ku" | jq '.' | head -50

echo ""
echo "2. Testing /rest/v1/payments endpoint:"
curl -s "https://nowtovakbozjjkdsjmtd.supabase.co/rest/v1/payments?select=*,groups!group_id(id,name),profiles!created_by(id,full_name),from_profile:from_user(full_name),to_profile:to_user(full_name)&offset=0&limit=10&order=created_at.desc" \
  -H "apikey: sb_publishable_0yceATVVLm4qzXjhzj7c7g_sdu0N2Ku" \
  -H "Authorization: Bearer sb_publishable_0yceATVVLm4qzXjhzj7c7g_sdu0N2Ku" | jq '.' | head -50

echo ""
echo "Done!"

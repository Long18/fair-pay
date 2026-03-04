#!/usr/bin/env bash

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"
  exit 2
fi

EXPENSE_ID="${1:-0b5b1be4-8f79-4b63-bbdc-7c1c111d50f1}"
BASE_URL="${2:-https://long-pay.vercel.app/api/og/expense}"
NOT_FOUND_HASH="${NOT_FOUND_HASH:-64b95bcedda54ecad61de91fcf9cd94dbcafcdda}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-}}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "ERROR: Missing Supabase credentials."
  echo "Set SUPABASE_URL + SUPABASE_ANON_KEY or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY."
  exit 2
fi

pass_count=0
fail_count=0

pass() {
  pass_count=$((pass_count + 1))
  printf '[PASS] %s\n' "$1"
}

fail() {
  fail_count=$((fail_count + 1))
  printf '[FAIL] %s\n' "$1"
}

contains() {
  local haystack="$1"
  local needle="$2"
  [[ "$haystack" == *"$needle"* ]]
}

echo "Running OG post-hotfix verification..."
echo "Expense ID: $EXPENSE_ID"
echo "Endpoint:   $BASE_URL"
echo

# 1 + 3: get_expense_og_data (anon RPC)
og_resp="$(curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/get_expense_og_data" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_expense_id\":\"$EXPENSE_ID\"}")"

og_type="$(printf '%s' "$og_resp" | jq -r 'type')"
og_rows=0
og_error_code=""
og_error_msg=""
if [[ "$og_type" == "array" ]]; then
  og_rows="$(printf '%s' "$og_resp" | jq 'length')"
else
  og_error_code="$(printf '%s' "$og_resp" | jq -r '.code // ""')"
  og_error_msg="$(printf '%s' "$og_resp" | jq -r '.message // ""')"
fi

if [[ "$og_rows" -eq 1 ]]; then
  pass "1. OG row count is 1 (og_rows=$og_rows)"
else
  fail "1. OG row count expected 1, got $og_rows (code=$og_error_code msg=$og_error_msg)"
fi

if [[ "$og_error_code" == "42804" ]] || contains "$og_error_msg" "structure of query does not match function result type"; then
  fail "3. RPC get_expense_og_data still has type mismatch (code=$og_error_code msg=$og_error_msg)"
elif [[ "$og_rows" -eq 1 ]]; then
  pass "3. RPC get_expense_og_data works with anon key (no type mismatch)"
else
  fail "3. RPC get_expense_og_data did not return valid row (code=$og_error_code msg=$og_error_msg)"
fi

# 2: get_expense_splits_public row count
splits_resp="$(curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/get_expense_splits_public" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_expense_id\":\"$EXPENSE_ID\"}")"
split_rows="$(printf '%s' "$splits_resp" | jq 'if type=="array" then length else 0 end')"

if [[ "$split_rows" -gt 0 ]]; then
  pass "2. Split row count > 0 (split_rows=$split_rows)"
else
  fail "2. Split row count expected >0, got $split_rows"
fi

# 4 + 5: Route behavior with cache buster
hdr_found="$(mktemp)"
img_found="/tmp/og_hotfix_${EXPENSE_ID}.png"
curl -sS -D "$hdr_found" -o "$img_found" "$BASE_URL?id=$EXPENSE_ID&cb=postfix-found-1"
cache_control_found="$(awk -F': ' 'tolower($1)=="cache-control" {print $2}' "$hdr_found" | tr -d '\r')"
x_vercel_cache_found="$(awk -F': ' 'tolower($1)=="x-vercel-cache" {print $2}' "$hdr_found" | tr -d '\r')"
img_hash="$(shasum "$img_found" | awk '{print $1}')"

if contains "$cache_control_found" "no-store"; then
  pass "4. Found-branch cache header looks correct for no-cache policy ($cache_control_found)"
else
  fail "4. Found-branch cache header mismatch (expected no-store, got: $cache_control_found)"
fi

if [[ "$img_hash" != "$NOT_FOUND_HASH" ]]; then
  pass "5. Image hash differs from known not-found hash ($img_hash)"
else
  fail "5. Image hash matches known not-found hash ($img_hash)"
fi

# 6: Cache behavior without cache buster
hdr_1="$(mktemp)"
hdr_2="$(mktemp)"
curl -sS -D "$hdr_1" -o /dev/null "$BASE_URL?id=$EXPENSE_ID"
curl -sS -D "$hdr_2" -o /dev/null "$BASE_URL?id=$EXPENSE_ID"
cache_1="$(awk -F': ' 'tolower($1)=="x-vercel-cache" {print $2}' "$hdr_1" | tr -d '\r')"
cache_2="$(awk -F': ' 'tolower($1)=="x-vercel-cache" {print $2}' "$hdr_2" | tr -d '\r')"

if [[ "$cache_1" == "MISS" && "$cache_2" == "MISS" ]]; then
  pass "6. Cache sequence matches no-cache policy (MISS -> MISS)"
else
  fail "6. Cache sequence unexpected for no-cache policy ($cache_1 -> $cache_2)"
fi

# 7: Config suspicion heuristic
if [[ "$og_rows" -eq 1 && "$img_hash" == "$NOT_FOUND_HASH" ]]; then
  fail "7. RPC passes but route still not-found. Check Vercel env: SUPABASE_SERVICE_ROLE_KEY may be wrong for current project."
else
  pass "7. No strong signal of runtime env mismatch."
fi

# 8: Final acceptance
final_ok=true
if [[ "$og_rows" -ne 1 ]]; then final_ok=false; fi
if [[ "$split_rows" -le 0 ]]; then final_ok=false; fi
if [[ "$img_hash" == "$NOT_FOUND_HASH" ]]; then final_ok=false; fi
if ! contains "$cache_control_found" "no-store"; then final_ok=false; fi

echo
echo "----- Raw facts -----"
echo "og_rows=$og_rows"
echo "split_rows=$split_rows"
echo "og_error_code=${og_error_code:-}"
echo "og_error_msg=${og_error_msg:-}"
echo "cache_control_found=$cache_control_found"
echo "x_vercel_cache_found=$x_vercel_cache_found"
echo "image_hash=$img_hash"
echo "not_found_hash=$NOT_FOUND_HASH"
echo "cache_seq=$cache_1,$cache_2"

echo
echo "----- Summary -----"
echo "pass_count=$pass_count"
echo "fail_count=$fail_count"

rm -f "$hdr_found" "$hdr_1" "$hdr_2"

if [[ "$final_ok" == true ]]; then
  pass "8. Final acceptance PASSED"
  exit 0
fi

fail "8. Final acceptance FAILED"
exit 1

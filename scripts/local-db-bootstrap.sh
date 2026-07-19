#!/usr/bin/env bash
# FairPay local DB bootstrap (Hybrid M1)
# Remote Supabase remains the default for agents — use this only when you need a full local stack.
#
# What this does:
#   1. Ensures local Supabase is running
#   2. `supabase db reset` (migrations + config.toml seeds)
#   3. Applies supabase/baseline.sql (core tables; not wired into CLI reset)
#   4. Verifies public.profiles / public.expenses exist
#
# What this does NOT do:
#   - Push to remote / rewrite migration history
#   - Re-seed after reset (seeds already run via config.toml)
#
# Usage (from repo root):
#   pnpm db:local:bootstrap
#   # or: ./scripts/local-db-bootstrap.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_FairPay}"
BASELINE="$ROOT/supabase/baseline.sql"

echo "==> FairPay local DB bootstrap"
echo "    Prefer remote env for agents; this path is optional/advanced."
echo ""

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: Docker is required for local Supabase" >&2
  exit 1
fi

if [ ! -f "$BASELINE" ]; then
  echo "error: missing $BASELINE" >&2
  exit 1
fi

echo "==> Starting Supabase (no-op if already running)"
supabase start

echo "==> db reset (migrations + seed paths from supabase/config.toml)"
echo "    Note: reset alone does NOT apply baseline.sql"
supabase db reset

echo "==> Applying baseline.sql (core DDL; ignores already-exists)"
apply_baseline() {
  # Strip outer BEGIN/COMMIT so partial errors don't roll back the whole file
  sed 's/^BEGIN;$/-- BEGIN;/; s/^COMMIT;$/-- COMMIT;/' "$BASELINE"
}

if command -v psql >/dev/null 2>&1; then
  apply_baseline | psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=0 >/tmp/fairpay-baseline.out 2>/tmp/fairpay-baseline.err || true
elif docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  apply_baseline | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres >/tmp/fairpay-baseline.out 2>/tmp/fairpay-baseline.err || true
else
  echo "error: cannot reach local Postgres (psql or container $DB_CONTAINER)" >&2
  exit 1
fi

CRITICAL="$(grep -Eiv 'already exists|NOTICE:|WARNING:|^$' /tmp/fairpay-baseline.err 2>/dev/null | grep -Eic 'error|fatal' || true)"
if [ "${CRITICAL:-0}" != "0" ]; then
  echo "warning: baseline applied with some errors (showing first lines):"
  grep -Eiv 'already exists|NOTICE:|WARNING:|^$' /tmp/fairpay-baseline.err | head -8 || true
else
  echo "    baseline applied"
fi

echo "==> Verifying core tables"
VERIFY_SQL="SELECT CASE WHEN to_regclass('public.profiles') IS NULL THEN 'MISSING' ELSE 'ok' END AS profiles, CASE WHEN to_regclass('public.expenses') IS NULL THEN 'MISSING' ELSE 'ok' END AS expenses;"
if command -v psql >/dev/null 2>&1; then
  RESULT="$(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc "$VERIFY_SQL")"
else
  RESULT="$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -tAc "$VERIFY_SQL")"
fi
echo "    $RESULT"
if echo "$RESULT" | grep -q MISSING; then
  echo "error: profiles/expenses missing after bootstrap — baseline may have failed" >&2
  exit 1
fi

echo ""
echo "✅ Local DB bootstrap finished."
echo "   Next: copy keys from \`pnpm supabase:status\` into .env.local, then \`pnpm dev\`."
echo "   Do NOT re-run sample-data.sql manually — config.toml already seeded on reset."

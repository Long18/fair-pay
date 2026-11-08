#!/usr/bin/env bash
# FairPay local DB bootstrap (Hybrid M1)
# Remote Supabase remains the default for agents — use this only when you need a full local stack.
#
# What this does:
#   1. Ensures local Supabase is running
#   2. `supabase db reset --no-seed` with migrations temporarily disabled (clean postgres)
#   3. Applies supabase/baseline.sql (core tables; migration history starts mid-chain)
#   4. `supabase migration up` (incremental migrations on top of baseline)
#   5. Applies config.toml seed paths
#   6. Verifies public.profiles / public.expenses exist
#
# What this does NOT do:
#   - Push to remote / rewrite migration history
#
# Usage (from repo root):
#   pnpm db:local:bootstrap
#   # or: ./scripts/local-db-bootstrap.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_FairPay}"
BASELINE="$ROOT/supabase/baseline.sql"
CONFIG="$ROOT/supabase/config.toml"
DB_URL="${SUPABASE_LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

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

if [ ! -f "$CONFIG" ]; then
  echo "error: missing $CONFIG" >&2
  exit 1
fi

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DB_URL" "$@"
  elif docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres "$@"
  else
    echo "error: cannot reach local Postgres (psql or container $DB_CONTAINER)" >&2
    exit 1
  fi
}

run_psql_file() {
  local file="$1"
  shift
  if command -v psql >/dev/null 2>&1; then
    psql "$DB_URL" "$@" -f "$file"
  else
    run_psql "$@" -f - <"$file"
  fi
}

apply_baseline() {
  # Strip outer BEGIN/COMMIT so partial errors don't roll back the whole file
  sed 's/^BEGIN;$/-- BEGIN;/; s/^COMMIT;$/-- COMMIT;/' "$BASELINE"
}

set_db_migrations_enabled() {
  local enabled="$1"
  python3 - "$CONFIG" "$enabled" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
value = sys.argv[2].lower()
if value not in {"true", "false"}:
    raise SystemExit(f"invalid enabled flag: {value}")

text = path.read_text()
pattern = r"(\[db\.migrations\]\s*\n(?:[^\[]*\n)*?)enabled\s*=\s*(?:true|false)"
replacement = rf"\1enabled = {value}"
new_text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit("could not patch [db.migrations].enabled in config.toml")
path.write_text(new_text)
PY
}

CONFIG_BACKUP=""
restore_config() {
  if [ -n "$CONFIG_BACKUP" ] && [ -f "$CONFIG_BACKUP" ]; then
    cp "$CONFIG_BACKUP" "$CONFIG"
  fi
}
trap restore_config EXIT

echo "==> Starting Supabase (no-op if already running)"
supabase start

CONFIG_BACKUP="$(mktemp)"
cp "$CONFIG" "$CONFIG_BACKUP"

echo "==> db reset (no migrations — baseline supplies core schema first)"
set_db_migrations_enabled false
supabase db reset --no-seed --yes

echo "==> Applying baseline.sql (core DDL)"
apply_baseline | run_psql -v ON_ERROR_STOP=0 >/tmp/fairpay-baseline.out 2>/tmp/fairpay-baseline.err || true

GAPS_SQL="$ROOT/supabase/scripts/local/ensure-baseline-gaps.sql"
if [ -f "$GAPS_SQL" ]; then
  echo "==> Applying baseline gap fill (local-only types)"
  run_psql_file "$GAPS_SQL" -v ON_ERROR_STOP=1
fi

CRITICAL="$(grep -Eiv 'already exists|NOTICE:|WARNING:|^$' /tmp/fairpay-baseline.err 2>/dev/null | grep -Eic 'error|fatal' || true)"
if [ "${CRITICAL:-0}" != "0" ]; then
  echo "warning: baseline applied with some errors (showing first lines):"
  grep -Eiv 'already exists|NOTICE:|WARNING:|^$' /tmp/fairpay-baseline.err | head -8 || true
else
  echo "    baseline applied"
fi

echo "==> Applying migrations (supabase/migrations)"
restore_config
trap - EXIT
CONFIG_BACKUP=""
supabase migration up

echo "==> Applying config.toml seeds"
# Keep in sync with supabase/config.toml [db.seed].sql_paths
SEED_FILES=(
  "$ROOT/supabase/seed/sample-data.sql"
  "$ROOT/supabase/seed/demo-login-circle.sql"
)
for seed in "${SEED_FILES[@]}"; do
  if [ ! -f "$seed" ]; then
    echo "error: missing seed file $seed" >&2
    exit 1
  fi
  echo "    $seed"
  run_psql_file "$seed" -v ON_ERROR_STOP=1
done

echo "==> Verifying core tables"
VERIFY_SQL="SELECT CASE WHEN to_regclass('public.profiles') IS NULL THEN 'MISSING' ELSE 'ok' END AS profiles, CASE WHEN to_regclass('public.expenses') IS NULL THEN 'MISSING' ELSE 'ok' END AS expenses;"
RESULT="$(run_psql -tAc "$VERIFY_SQL")"
echo "    $RESULT"
if echo "$RESULT" | grep -q MISSING; then
  echo "error: profiles/expenses missing after bootstrap — baseline may have failed" >&2
  exit 1
fi

echo ""
echo "✅ Local DB bootstrap finished."
echo "   Next: copy keys from \`pnpm supabase:status\` into .env.local, then \`pnpm dev\`."
echo "   Point .env.local at http://127.0.0.1:54321 (API) — not remote until you choose that."

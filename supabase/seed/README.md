# Supabase Seed Data

## Hybrid policy

- **Agents / default:** use **remote** Supabase (see root `AGENTS.md`).
- **Local (optional):** run `pnpm db:local:bootstrap` once — it resets, applies baseline, and relies on config.toml seeds. Do **not** double-seed.

## Config-driven seeds (preferred)

`supabase/config.toml` already seeds on `supabase db reset` / `pnpm db:local:bootstrap`:

```toml
[db.seed]
enabled = true
sql_paths = ['./seed/sample-data.sql', './seed/demo-login-circle.sql']
```

Manual docker seed is only for repairing an existing local DB **without** a full reset:

```bash
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/sample-data.sql
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/demo-login-circle.sql
```

## Available Seed File

**`sample-data.sql`** (122KB, ~1,993 lines)
- Comprehensive test data with realistic transactions
- Multiple users, groups, expenses, and payments
- Useful for development and testing scenarios
- Safe to run on fresh or existing local databases (idempotent where designed)

**`demo-login-circle.sql`**
- Guaranteed friendships/group/expenses between login accounts (admin/mod/user1/…)

## For Production-Like Testing

For testing with real production data:

```bash
# 1. Pull latest production data
cd scripts/production
./dump-production-schema.sh

# 2. Reset + baseline via bootstrap (or sync-full)
cd ../..
pnpm db:local:bootstrap

# 3. Import production data (replaces sample seed content)
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/production/production-data.sql
```

**Production data advantages:**
- Real user relationships and transaction patterns
- Actual balances and debt calculations
- Production-verified data integrity

## Fresh local environments

```bash
pnpm db:local:bootstrap
# Then: pnpm supabase:status → copy keys to .env.local → pnpm dev
```

`supabase db reset` alone is **not** enough: core tables live in `supabase/baseline.sql`, which CLI reset does not apply.

## Seed Data Contents

The `sample-data.sql` includes:
- **Users**: Multiple test users with profiles
- **Groups**: Expense-sharing groups
- **Friendships**: User relationships
- **Expenses**: Various expense types and categories
- **Payments**: Direct payment records
- **Splits**: Expense split configurations

## When to Use Seed Data

**Use config.toml / bootstrap seeds when:**
- Setting up a new local development environment
- Testing features with controlled data
- Creating reproducible test scenarios

**Use production data when:**
- Testing with real-world patterns
- Verifying production-like behavior
- Debugging production issues locally

## Maintenance

**To update seed data:**
1. Edit `supabase/seed/sample-data.sql` (and/or `demo-login-circle.sql`)
2. Test with `pnpm db:local:bootstrap`
3. Verify data integrity and relationships
4. Commit changes

**Best practices:**
- Keep seed data minimal but realistic
- Use UUIDs consistently
- Maintain referential integrity
- **Never** put schema DDL (`CREATE FUNCTION`, etc.) in seed files — use migrations
- Document any special test scenarios

---

**Status:** Active seed files via config.toml + optional `pnpm db:local:bootstrap`

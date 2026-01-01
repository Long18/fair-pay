# Supabase Seed Data

## Current Approach

**Active seed file for local development:**

```bash
# Apply seed data to local database
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/sample-data.sql
```

## Available Seed File

**`sample-data.sql`** (122KB, 1,993 lines)
- Comprehensive test data with realistic transactions
- Multiple users, groups, expenses, and payments
- Useful for development and testing scenarios
- Safe to run on fresh or existing local databases

## For Production-Like Testing

For testing with real production data:

```bash
# 1. Pull latest production data
cd scripts/production
./dump-production-schema.sh

# 2. Reset local database
cd ../..
supabase db reset

# 3. Import production data
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/production/production-data.sql
```

**Production data advantages:**
- Real user relationships and transaction patterns
- Actual balances and debt calculations
- Production-verified data integrity
- 28 users, 156 expenses, 165 payments, 325 friendships

## For Fresh Environments

```bash
# Reset to baseline + seed data
supabase db reset

# Apply seed data
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < supabase/seed/sample-data.sql
```

## Seed Data Contents

The `sample-data.sql` includes:
- **Users**: Multiple test users with profiles
- **Groups**: Expense-sharing groups
- **Friendships**: User relationships
- **Expenses**: Various expense types and categories
- **Payments**: Direct payment records
- **Splits**: Expense split configurations

## When to Use Seed Data

**Use `sample-data.sql` when:**
- Setting up a new development environment
- Testing features with controlled data
- Creating reproducible test scenarios
- Demonstrating the application

**Use production data when:**
- Testing with real-world patterns
- Verifying production-like behavior
- Debugging production issues locally
- Performance testing with realistic volumes

## Configuration

The seed file path is configured in `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ['./seed/sample-data.sql']
```

## Maintenance

**To update seed data:**
1. Edit `supabase/seed/sample-data.sql`
2. Test by running `supabase db reset`
3. Verify data integrity and relationships
4. Commit changes

**Best practices:**
- Keep seed data minimal but realistic
- Use UUIDs consistently
- Maintain referential integrity
- Document any special test scenarios

---

**Last Updated:** January 1, 2026  
**Status:** ✅ Active seed file available  
**Size:** 122KB, 1,993 lines

# Verification Scripts

Schema and data verification tools for ensuring database integrity.

## Available Scripts

### test-baseline-parity.sh

Test that baseline.sql applies correctly and creates expected schema.

**Usage:**
```bash
./test-baseline-parity.sh
```

**Tests (12 total):**
1. ✅ Extensions installed
2. ✅ Tables created
3. ✅ Constraints defined
4. ✅ Indexes created
5. ✅ Functions defined
6. ✅ RLS policies applied
7. ✅ Triggers created
8. ✅ Views created
9. ✅ Storage buckets configured
10. ✅ Grants applied
11. ✅ Foreign keys valid
12. ✅ Unique constraints enforced

**Example:**
```bash
# Run all tests
./test-baseline-parity.sh

# Run with verbose output
./test-baseline-parity.sh --verbose
```

**Output:**
```
Testing Baseline Parity
=======================

✅ Extensions: 5/5 installed
✅ Tables: 15/15 created
✅ Constraints: 42/42 defined
✅ Indexes: 28/28 created
✅ Functions: 12/12 defined
✅ RLS Policies: 35/35 applied
✅ Triggers: 8/8 created
✅ Views: 3/3 created
✅ Storage Buckets: 2/2 configured
✅ Grants: 18/18 applied
✅ Foreign Keys: 24/24 valid
✅ Unique Constraints: 12/12 enforced

All tests passed! ✅
```

### compare-prod-vs-baseline.sh

Compare production schema with baseline.sql to identify drift.

**Usage:**
```bash
./compare-prod-vs-baseline.sh [OPTIONS]
```

**Options:**
- `--detailed` - Show detailed differences
- `--output FILE` - Save report to file

**Example:**
```bash
# Basic comparison
./compare-prod-vs-baseline.sh

# Detailed comparison
./compare-prod-vs-baseline.sh --detailed

# Save report
./compare-prod-vs-baseline.sh --output drift-report.txt
```

**Comparison Categories:**

**Tables:**
- Missing in baseline
- Missing in production
- Column differences

**Functions:**
- Missing in baseline
- Missing in production
- Signature differences

**RLS Policies:**
- Missing in baseline
- Missing in production
- Definition differences

**Indexes:**
- Missing in baseline
- Missing in production
- Definition differences

**Constraints:**
- Missing in baseline
- Missing in production
- Definition differences

**Output:**
```
Schema Comparison: Production vs Baseline
==========================================

Tables
------
✅ All tables match

Functions
---------
⚠️  Missing in baseline:
  - get_user_activities_v2

RLS Policies
------------
✅ All policies match

Indexes
-------
⚠️  Missing in baseline:
  - idx_expenses_created_at_desc

Constraints
-----------
✅ All constraints match

Summary
-------
Safe Drift: 0 items
Risky Drift: 1 item (get_user_activities_v2)
Blocking Drift: 0 items

Recommendation: Create migration for risky drift
```

### validate-documentation.sh

Validate that documentation matches actual database schema.

**Usage:**
```bash
./validate-documentation.sh [OPTIONS]
```

**Options:**
- `--docs-dir DIR` - Documentation directory (default: ../../.serena/memories)
- `--fix` - Attempt to fix documentation issues

**Example:**
```bash
# Validate documentation
./validate-documentation.sh

# Validate with custom docs directory
./validate-documentation.sh --docs-dir /path/to/docs

# Validate and fix issues
./validate-documentation.sh --fix
```

**Checks:**

**Tables:**
- Tables in docs exist in baseline.sql
- All baseline tables are documented
- Column descriptions match schema

**Functions:**
- Functions in docs exist in baseline.sql
- Function signatures match
- Parameters documented correctly

**RLS Policies:**
- Policies in docs exist in baseline.sql
- Policy definitions match
- Policy descriptions accurate

**Output:**
```
Documentation Validation
========================

Tables
------
✅ All documented tables exist
⚠️  Undocumented tables:
  - audit_logs (added in migration 20260110)

Functions
---------
✅ All documented functions exist
✅ All function signatures match

RLS Policies
------------
✅ All documented policies exist
⚠️  Policy definition mismatch:
  - expenses_select_policy (definition changed)

Summary
-------
Valid: 42/45 items
Warnings: 3 items
Errors: 0 items

Recommendation: Update documentation for warnings
```

### db-inventory.sql

Comprehensive database inventory queries.

**Usage:**
```bash
# Run against local database
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -f db-inventory.sql > inventory.txt

# Run against production
psql $SUPABASE_DB_URL -f db-inventory.sql > inventory-prod.txt
```

**Inventory Sections:**

1. **Extensions**
   - Installed extensions
   - Extension versions

2. **Tables**
   - Table names
   - Row counts
   - Table sizes
   - Last modified

3. **Columns**
   - Column names
   - Data types
   - Nullable
   - Defaults

4. **Constraints**
   - Primary keys
   - Foreign keys
   - Unique constraints
   - Check constraints

5. **Indexes**
   - Index names
   - Index types
   - Indexed columns
   - Index sizes

6. **Functions**
   - Function names
   - Return types
   - Parameters
   - Language

7. **Triggers**
   - Trigger names
   - Trigger events
   - Trigger functions

8. **Views**
   - View names
   - View definitions

9. **RLS Policies**
   - Policy names
   - Policy tables
   - Policy commands
   - Policy definitions

10. **Storage Buckets**
    - Bucket names
    - Bucket settings
    - File counts

11. **Grants**
    - Role grants
    - Table grants
    - Function grants

**Example Output:**
```sql
-- Extensions
uuid-ossp | 1.1
pgcrypto | 1.3

-- Tables
profiles | 28 rows | 128 KB
expenses | 156 rows | 512 KB
payments | 165 rows | 384 KB

-- Functions
get_user_debts(uuid) | TABLE | plpgsql
calculate_balance(uuid, uuid) | numeric | plpgsql

-- RLS Policies
profiles_select_policy | profiles | SELECT | authenticated
expenses_insert_policy | expenses | INSERT | authenticated
```

## Verification Workflows

### After Migration

```bash
# 1. Test baseline parity
./test-baseline-parity.sh

# 2. Compare with production
./compare-prod-vs-baseline.sh

# 3. Validate documentation
./validate-documentation.sh
```

### Before Deployment

```bash
# 1. Run all verification scripts
./test-baseline-parity.sh
./compare-prod-vs-baseline.sh --detailed
./validate-documentation.sh

# 2. Generate inventory
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -f db-inventory.sql > pre-deploy-inventory.txt

# 3. Review results
cat pre-deploy-inventory.txt
```

### Schema Drift Detection

```bash
# 1. Compare schemas
./compare-prod-vs-baseline.sh --output drift-report.txt

# 2. Review drift
cat drift-report.txt

# 3. Create migration if needed
cd ../../..
supabase migration new fix_schema_drift
```

### Documentation Audit

```bash
# 1. Validate documentation
./validate-documentation.sh > doc-validation.txt

# 2. Review warnings
grep "⚠️" doc-validation.txt

# 3. Fix documentation
./validate-documentation.sh --fix
```

## Verification Reports

### Baseline Parity Report

```
Testing Baseline Parity
=======================

✅ Extensions: 5/5 installed
✅ Tables: 15/15 created
✅ Constraints: 42/42 defined
✅ Indexes: 28/28 created
✅ Functions: 12/12 defined
✅ RLS Policies: 35/35 applied
✅ Triggers: 8/8 created
✅ Views: 3/3 created
✅ Storage Buckets: 2/2 configured
✅ Grants: 18/18 applied
✅ Foreign Keys: 24/24 valid
✅ Unique Constraints: 12/12 enforced

All tests passed! ✅
```

### Schema Drift Report

```
Schema Comparison: Production vs Baseline
==========================================

Safe Drift (0 items):
- None

Risky Drift (2 items):
- Function: get_user_activities_v2 (missing in baseline)
- Index: idx_expenses_created_at_desc (missing in baseline)

Blocking Drift (0 items):
- None

Recommendation: Create migration for risky drift
```

### Documentation Validation Report

```
Documentation Validation
========================

Valid: 42/45 items
Warnings: 3 items
Errors: 0 items

Warnings:
- Table 'audit_logs' not documented
- Function 'get_user_activities_v2' signature mismatch
- Policy 'expenses_select_policy' definition changed

Recommendation: Update documentation for warnings
```

## Drift Categories

### Safe Drift

Changes that don't affect functionality:
- Comments
- Formatting
- Non-functional indexes

**Action:** Document in next migration

### Risky Drift

Changes that may affect functionality:
- New functions
- New indexes
- Modified RLS policies

**Action:** Create migration immediately

### Blocking Drift

Changes that break functionality:
- Missing tables
- Missing columns
- Missing constraints

**Action:** Fix immediately, deploy urgently

## Troubleshooting

### Test Fails with "Table Not Found"

Reset database and reapply baseline:
```bash
cd ../../..
supabase db reset
```

### Comparison Shows Many Differences

Production may have drifted significantly:
```bash
# Create migration to sync
supabase migration new sync_production_schema

# Copy production schema
cd supabase/scripts/sync
./dump-production-schema.sh
```

### Documentation Validation Fails

Update documentation:
```bash
# Fix automatically
./validate-documentation.sh --fix

# Or update manually
vim ../../.serena/memories/database_schema_reference.md
```

### Inventory Query Times Out

Reduce query scope:
```bash
# Query specific sections
psql -c "SELECT * FROM pg_tables WHERE schemaname = 'public'"
```

## Best Practices

1. **Run verification after every migration**
2. **Compare with production regularly** (weekly)
3. **Keep documentation in sync** with schema
4. **Address risky drift immediately**
5. **Generate inventory before major changes**
6. **Automate verification in CI/CD**
7. **Review drift reports in team meetings**

## Verification Checklist

After schema changes:
- [ ] Run test-baseline-parity.sh
- [ ] Run compare-prod-vs-baseline.sh
- [ ] Run validate-documentation.sh
- [ ] Review all warnings and errors
- [ ] Create migrations for drift
- [ ] Update documentation
- [ ] Generate inventory report
- [ ] Commit changes

## Related Scripts

- [../sync/sync-full.sh](../sync/README.md) - Sync production data
- [../backup/backup-local.sh](../backup/README.md) - Create backups
- [../utilities/reset-local.sh](../utilities/README.md) - Reset database

## Support

For issues or questions, check:
1. This README
2. Main [scripts README](../README.md)
3. Serena memory: `database_overview`
4. Serena memory: `database_migrations_strategy`

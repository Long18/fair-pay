# FairPay Database Scripts

Organized scripts for database operations, verification, and development utilities.

---

## 📁 Folder Structure

```
scripts/
├── production/      # Production database operations
├── verification/    # Schema and documentation validation
├── utilities/       # Development utilities
└── archive/         # Deprecated/obsolete scripts (45 files)
```

---

## 🏭 Production Operations

**Location:** `scripts/production/`

### Dump Production Schema

```bash
./production/dump-production-schema.sh
```

**Output:** `production/production-schema.sql` (schema-only, no data)

### Dump Production Data

```bash
cd production
supabase db dump --linked --data-only --use-copy=false > production-data.sql
```

**Output:** `production/production-data.sql` (data-only INSERT statements)

### Verify Production Database

```bash
./production/verify-production-database.sh
```

**Checks:**
- Table statistics and row counts
- Function inventory
- Index health
- Performance metrics
- RLS policy coverage

**Output:** Console report + saves to production folder

### Schema Comparison Report

**File:** `production/schema-comparison-report.txt`

Manual comparison notes between production and baseline.sql.

---

## ✅ Verification & Validation

**Location:** `scripts/verification/`

### Compare Production vs Baseline

```bash
./verification/compare-prod-vs-baseline.sh
```

**Compares:**
- Tables, columns, constraints
- Functions and signatures
- Views and materialized views
- RLS policies
- Indexes

**Output:** Categorized differences (safe/risky/blocking drift)

### Validate Documentation

```bash
./verification/validate-documentation.sh
```

**Validates:**
- Tables in docs exist in baseline.sql
- Functions match documented signatures
- RLS policies are correctly described
- Cross-references are valid

**Output:** Missing or incorrect documentation entries

### Test Baseline Parity

```bash
./verification/test-baseline-parity.sh
```

**12 Tests:**
1. Baseline file exists
2. Extensions installed
3. Tables created
4. Constraints applied
5. Indexes created
6. Functions created
7. RLS enabled
8. RLS policies applied
9. Triggers active
10. Views created
11. Storage buckets configured
12. Grants applied

**Output:** Test results with pass/fail status

### Database Inventory

```bash
# Via Docker
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -f verification/db-inventory.sql

# Or via psql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f verification/db-inventory.sql
```

**Inventories:**
- All tables with column details
- All constraints (PK, FK, CHECK, UNIQUE)
- All indexes
- All views and materialized views
- All functions and procedures
- All triggers
- All RLS policies
- Storage buckets and policies

**Output:** Comprehensive database object list

---

## 🛠️ Development Utilities

**Location:** `scripts/utilities/`

### Open Supabase Studio

```bash
./utilities/open-studio.sh
```

Opens http://127.0.0.1:54323 in your default browser.

### Check Environment

```bash
node utilities/check-env.js
```

**Checks:**
- Required environment variables
- Supabase connection details
- Node.js version
- Supabase CLI installed

---

## 🗄️ Archive

**Location:** `scripts/archive/` (45 files)

Contains deprecated scripts from previous development phases:

**Categories:**
- **Pull scripts (7):** Old production pull methods
- **Seed scripts (15):** Fake data generation (replaced by production data)
- **Icon migration (6):** FontAwesome/Lucide migration (completed)
- **Python parsers (3):** SQL generation from requests (obsolete)
- **Test/debug (11):** One-off debugging scripts
- **Misc (3):** Migration history fixes, public access, etc.

**All archived scripts are preserved in git history.**

---

## 🚀 Common Workflows

### 1. Sync Production Data Locally

```bash
# Dump production data
cd scripts/production
supabase db dump --linked --data-only > production-data.sql

# Reset local database
cd ../..
supabase db reset

# Import production data
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/production/production-data.sql
```

### 2. Verify Schema Changes

```bash
# After making schema changes
./verification/test-baseline-parity.sh

# Compare with production
./verification/compare-prod-vs-baseline.sh

# Validate documentation
./verification/validate-documentation.sh
```

### 3. Create New Migration

```bash
# Create migration file
supabase migration new feature_name

# Edit the migration
# Then test locally
supabase db reset

# Verify with tests
./verification/test-baseline-parity.sh

# Deploy to production
supabase db push --linked
```

### 4. Audit Database State

```bash
# Get complete inventory
docker exec -i supabase_db_FairPay psql -U postgres -d postgres -f verification/db-inventory.sql > db-state.txt

# Verify production health
./production/verify-production-database.sh
```

---

## 📊 Script Dependencies

**Requirements:**
- Docker (for local Supabase access)
- Supabase CLI (`supabase`)
- Bash 4.0+ (for array support)
- `diff`, `grep`, `sed` (standard Unix tools)
- Node.js (for check-env.js)

**Optional:**
- `psql` client (alternative to Docker exec)
- `jq` (for JSON parsing in some scripts)

---

## 🔐 Security Notes

**Credentials:**
- Production credentials loaded from `.env.local` (gitignored)
- Scripts use Supabase CLI authentication
- Never commit production passwords or keys

**Data Privacy:**
- `production-data.sql` contains real user data (gitignored)
- `production-schema.sql` is safe to commit (no data)
- `schema-comparison-report.txt` may contain production metadata

**Recommended `.gitignore` entries:**
```gitignore
scripts/production/production-data.sql
scripts/production/*-report.txt
scripts/verification/*-output.txt
```

---

## 📝 Contributing

### Adding New Scripts

1. Place in appropriate folder:
   - Production ops → `production/`
   - Validation → `verification/`
   - Dev tools → `utilities/`

2. Make executable: `chmod +x script-name.sh`

3. Add documentation to this README

4. Test locally before committing

### Deprecating Scripts

1. Move to `archive/`
2. Update this README
3. Check for references in CI/CD
4. Commit with explanation

---

## 📖 Related Documentation

- **Database Overview:** `.serena/memories/database_overview.md`
- **Production Sync:** `.serena/memories/production_database_sync.md`
- **Baseline Schema:** `supabase/baseline.sql`
- **Seed Data:** `supabase/seed/README.md`

---

**Last Updated:** January 1, 2026  
**Total Active Scripts:** 11 (5 production, 4 verification, 2 utilities)  
**Archived Scripts:** 45


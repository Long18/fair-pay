# Database Library Functions

This directory contains reusable library functions for database operations.

## Available Libraries

### dumper.sh

Database dumping functions for production sync operations.

**Functions:**

1. **dump_production_schema()**
   - Dumps schema-only from production database
   - Uses Supabase CLI to connect to linked project
   - Generates timestamped schema files
   - Validates dump integrity
   - **Requirements:** 1.2

2. **dump_production_data()**
   - Dumps data from production database
   - Supports full and incremental dumps
   - Handles auth.users separately for foreign keys
   - Optional compression with gzip
   - **Requirements:** 1.3, 6.2

**Usage:**

```bash
# Source the library
source supabase/scripts/lib/dumper.sh

# Dump schema
dump_production_schema "output/directory"

# Dump full data without compression
dump_production_data "full" "output/directory" "" "false"

# Dump full data with compression
dump_production_data "full" "output/directory" "" "true"

# Dump incremental data (specific tables)
# Note: Currently falls back to full dump due to Supabase CLI limitations
dump_production_data "incremental" "output/directory" "profiles,expenses" "false"
```

**Environment Variables:**

- `SKIP_AUTH_USERS`: Set to "true" to skip auth.users dump (default: false)
- `CONFIG_FILE`: Path to sync configuration file (default: ../sync/config.json)

**Output:**

- Schema dumps: `schema-YYYYMMDD-HHMMSS.sql`
- Data dumps: `data-{type}-YYYYMMDD-HHMMSS.sql[.gz]`
- Exported variables: `DUMPER_SCHEMA_FILE`, `DUMPER_DATA_FILE`

**Testing:**

Run the test suite to verify functionality:

```bash
./supabase/scripts/lib/test-dumper.sh
```

## Implementation Notes

### Schema Dumping

The Supabase CLI doesn't have a `--schema-only` flag, so we:
1. Dump everything using `supabase db dump --linked -s public`
2. Filter out data statements (INSERT, COPY) to get schema-only
3. Keep CREATE, ALTER, COMMENT, GRANT, REVOKE statements

### Data Dumping

- **Full dumps**: Dump all tables from public schema
- **Incremental dumps**: Currently limited by Supabase CLI (no table inclusion flag)
  - Falls back to full dump with a warning
  - Future: Implement pg_dump-based incremental dumps
- **Auth.users handling**: Optional dump with timeout to avoid hanging
  - Extracted separately and prepended to data dump
  - Required for foreign key relationships
  - Can be skipped with `SKIP_AUTH_USERS=true`

### Compression

- Uses gzip for compression when enabled
- Reduces file size by ~80% (e.g., 318KB → 54KB)
- Automatically detects if gzip is available
- Falls back to uncompressed if gzip not found

### Error Handling

- Validates Supabase CLI installation
- Checks project linkage
- Validates dump file integrity
- Detects actual errors (not SQL strings containing "error")
- Provides helpful error messages

## Future Enhancements

1. **Incremental dumps with pg_dump**: Implement table-specific dumps using pg_dump directly
2. **Parallel dumping**: Dump multiple tables in parallel for faster operations
3. **Resumable dumps**: Support resuming interrupted dumps
4. **Schema comparison**: Compare dumped schema with local schema
5. **Data filtering**: Support WHERE clauses for partial data dumps

## Related Files

- `supabase/scripts/sync/config.json` - Configuration file
- `supabase/scripts/lib/test-dumper.sh` - Test suite
- `scripts/production/dump-production-schema.sh` - Legacy schema dump script
- `scripts/production/pull-production-full.sh` - Legacy full sync script

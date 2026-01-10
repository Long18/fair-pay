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


### anonymizer.sh

Data anonymization and table filtering functions for privacy compliance.

**Functions:**

1. **anonymize_data()**
   - Anonymizes sensitive data in SQL dumps
   - Supports multiple anonymization strategies
   - Preserves referential integrity through consistent hashing
   - Generates mapping file for debugging
   - **Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8

2. **filter_tables()**
   - Filters SQL dumps to include/exclude specific tables
   - Preserves table dependencies
   - Supports both include and exclude modes
   - **Requirements:** 3.3, 3.4

**Anonymization Strategies:**

- `fake-email`: Replace with fake-{hash}@example.com
- `fake-name`: Replace with Fake User {hash} (requires column-specific rules)
- `fake-phone`: Replace with +1555{random}
- `hash`: Replace with SHA256 hash
- `null`: Replace with NULL

**Usage:**

```bash
# Source the library
source supabase/scripts/lib/anonymizer.sh

# Anonymize data with mapping file
CONFIG_FILE="supabase/scripts/sync/config.json" \
  anonymize_data \
  "input.sql" \
  "output-anonymized.sql" \
  "mapping.txt"

# Filter tables (include mode - only specified tables)
filter_tables \
  "input.sql" \
  "output-filtered.sql" \
  "include" \
  "profiles,expenses,payments"

# Filter tables (exclude mode - all except specified tables)
filter_tables \
  "input.sql" \
  "output-filtered.sql" \
  "exclude" \
  "audit_logs,temp_data,debug_info"
```

**Configuration:**

Anonymization requires configuration in `supabase/scripts/sync/config.json`:

```json
{
  "anonymization": {
    "enabled": true,
    "rules": [
      {
        "table": "profiles",
        "column": "email",
        "strategy": "fake-email"
      },
      {
        "table": "profiles",
        "column": "phone",
        "strategy": "fake-phone"
      },
      {
        "table": "users",
        "column": "full_name",
        "strategy": "fake-name"
      }
    ]
  }
}
```

**Environment Variables:**

- `CONFIG_FILE`: Path to sync configuration file (default: ../sync/config.json)

**Output:**

- Anonymized dumps: User-specified output file
- Mapping files: Optional mapping of original → anonymized values
- Statistics: Rules applied, total replacements, file sizes

**Testing:**

Run the test suite to verify functionality:

```bash
./supabase/scripts/lib/test-anonymizer.sh
```

## Anonymization Implementation Notes

### Referential Integrity

- Uses SHA256 hashing to ensure consistent anonymization
- Same input always produces same output (e.g., same email → same fake email)
- Preserves foreign key relationships across tables
- Maintains data type constraints

### Pattern Matching

- Works with standard pg_dump formats (INSERT and COPY statements)
- Handles single-line and multi-line SQL statements
- Preserves SQL structure and formatting
- Validates output file integrity

### Mapping Files

- Records original → anonymized value mappings
- Useful for debugging and data correlation
- Format: `email: original@example.com -> fake-abc123@example.com`
- Optional parameter (can be omitted)

### Performance

- Processes files line-by-line for memory efficiency
- Handles large dumps (100MB+) without issues
- Uses temporary files to avoid data loss
- Validates output before finalizing

## Table Filtering Implementation Notes

### Filter Modes

- **Include mode**: Only specified tables are included in output
  - All other tables are filtered out
  - Useful for syncing specific subsets of data
  - Warning: May break foreign key relationships

- **Exclude mode**: All tables except specified ones are included
  - Specified tables are filtered out
  - Useful for removing sensitive or large tables
  - Preserves most data relationships

### SQL Statement Support

- Handles COPY statements: `COPY public.table_name (...) FROM stdin;`
- Handles INSERT statements: `INSERT INTO public.table_name (...) VALUES (...);`
- Preserves schema definitions and comments
- Maintains SQL dump structure

### Dependency Handling

- Warns about potential foreign key issues
- Recommends including dependent tables
- Preserves table order in dump
- Maintains referential integrity where possible

## Security Considerations

### Anonymization

- ⚠️ Anonymization is NOT encryption
- Hashing is deterministic (same input → same output)
- Mapping files contain sensitive information
- Store mapping files securely or delete after use
- Review anonymized data before sharing

### Table Filtering

- Filtered data may still contain sensitive information
- Foreign key relationships may expose filtered data
- Review filtered dumps before distribution
- Consider anonymization in addition to filtering

## Future Enhancements

### Anonymization

1. **Advanced strategies**: Support for custom anonymization functions
2. **Column-specific rules**: Better support for name anonymization
3. **Batch processing**: Parallel anonymization for large dumps
4. **Reversible anonymization**: Optional encryption-based anonymization
5. **Data masking**: Partial anonymization (e.g., mask@*****.com)

### Table Filtering

1. **Dependency analysis**: Automatic inclusion of dependent tables
2. **Smart filtering**: Analyze foreign keys before filtering
3. **Partial table filtering**: Filter specific rows, not entire tables
4. **Schema preservation**: Option to keep schema for filtered tables

## Related Files

- `supabase/scripts/sync/config.json` - Configuration file
- `supabase/scripts/lib/test-anonymizer.sh` - Test suite
- `supabase/scripts/lib/dumper.sh` - Data dumping functions

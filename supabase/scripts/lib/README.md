# Database Library Functions

This directory contains reusable library functions for database operations.

## Available Libraries

### config-loader.sh

Configuration loading and parsing functions for sync operations.

**Functions:**

1. **load_config()**
   - Loads configuration from config.json
   - Substitutes environment variables (${VAR_NAME} pattern)
   - Provides default values for missing configuration
   - Exports configuration as CONFIG_* environment variables
   - **Requirements:** 3.1, 3.2

2. **get_config_value()**
   - Gets a specific configuration value by key
   - Supports default values
   - Returns configuration value or default

3. **print_config()**
   - Prints all loaded configuration values
   - Useful for debugging and verification

**Usage:**

```bash
# Source the library
source supabase/scripts/lib/config-loader.sh

# Load configuration
load_config

# Print configuration
print_config

# Get specific value
version=$(get_config_value "CONFIG_VERSION" "1.0.0")
echo "Version: $version"

# Use configuration values
echo "Production Project: ${CONFIG_PROD_PROJECT_REF}"
echo "Local Database: ${CONFIG_LOCAL_DATABASE_URL}"
```

**Exported Variables:**

- `CONFIG_VERSION` - Configuration version
- `CONFIG_PROD_PROJECT_REF` - Production project reference
- `CONFIG_PROD_VERIFY_BEFORE_SYNC` - Verify before sync flag
- `CONFIG_LOCAL_DATABASE_URL` - Local database URL
- `CONFIG_LOCAL_DOCKER_CONTAINER` - Local Docker container name
- `CONFIG_SYNC_INCLUDE_TABLES` - Comma-separated list of tables to include
- `CONFIG_SYNC_EXCLUDE_TABLES` - Comma-separated list of tables to exclude
- `CONFIG_SYNC_INCLUDE_AUTH_USERS` - Include auth.users flag
- `CONFIG_SYNC_INCLUDE_STORAGE` - Include storage flag
- `CONFIG_SYNC_ANONYMIZE` - Anonymize data flag
- `CONFIG_ANONYMIZATION_ENABLED` - Anonymization enabled flag
- `CONFIG_ANONYMIZATION_RULES` - JSON array of anonymization rules
- `CONFIG_BACKUP_ENABLED` - Backup enabled flag
- `CONFIG_BACKUP_RETENTION_DAYS` - Backup retention days
- `CONFIG_BACKUP_MAX_BACKUPS` - Maximum number of backups
- `CONFIG_BACKUP_COMPRESSION` - Backup compression flag
- `CONFIG_OUTPUT_DIRECTORY` - Output directory path
- `CONFIG_OUTPUT_COMPRESSION` - Output compression flag

**Environment Variable Substitution:**

The config loader supports environment variable substitution using the `${VAR_NAME}` pattern:

```json
{
  "production": {
    "projectRef": "${SUPABASE_PROD_PROJECT_REF}"
  }
}
```

Variables are loaded from `.env.local` in the project root.

**Testing:**

Run the test suite to verify functionality:

```bash
./supabase/scripts/lib/test-config.sh
```

### validator.sh

Configuration validation functions for ensuring config integrity.

**Functions:**

1. **validate_config()**
   - Validates entire configuration
   - Checks required fields
   - Validates table names, strategies, booleans, and numbers
   - Reports specific validation errors
   - **Requirements:** 3.9, 3.10

2. **validate_table_name()**
   - Validates a single table name
   - Prevents SQL injection
   - Ensures valid PostgreSQL identifiers
   - Supports schema.table format

3. **validate_anonymization_strategy()**
   - Validates anonymization strategy
   - Checks against valid strategies list
   - Provides helpful error messages

4. **validate_boolean()**
   - Validates boolean values (true/false)
   - Rejects other values (yes/no, 1/0)

5. **validate_number()**
   - Validates numeric values
   - Supports min/max range validation
   - Ensures positive integers

**Usage:**

```bash
# Source the libraries
source supabase/scripts/lib/config-loader.sh
source supabase/scripts/lib/validator.sh

# Load and validate configuration
load_config
validate_config

# Validate individual values
validate_table_name "users"
validate_table_name "public.profiles"
validate_anonymization_strategy "fake-email"
validate_boolean "true" "my_field"
validate_number "5" "retention_days" 1 365
```

**Validation Rules:**

- **Table names**: Must start with letter/underscore, contain only alphanumeric and underscores, max 63 chars
- **Anonymization strategies**: Must be one of: fake-email, fake-name, fake-phone, hash, null
- **Booleans**: Must be exactly "true" or "false"
- **Numbers**: Must be positive integers, optionally within min/max range

**Testing:**

Run the test suite to verify functionality:

```bash
./supabase/scripts/lib/test-config.sh
```

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
- `supabase/scripts/lib/config-loader.sh` - Configuration loader
- `supabase/scripts/lib/validator.sh` - Configuration validator
- `supabase/scripts/lib/test-config.sh` - Config loader and validator test suite
- `supabase/scripts/lib/test-dumper.sh` - Dumper test suite
- `supabase/scripts/lib/test-anonymizer.sh` - Anonymizer test suite
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
- `supabase/scripts/lib/config-loader.sh` - Configuration loader
- `supabase/scripts/lib/validator.sh` - Configuration validator
- `supabase/scripts/lib/test-config.sh` - Config loader and validator test suite
- `supabase/scripts/lib/test-anonymizer.sh` - Test suite
- `supabase/scripts/lib/dumper.sh` - Data dumping functions

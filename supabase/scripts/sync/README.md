# Sync Scripts

Production database synchronization with anonymization, verification, and reporting.

## Available Scripts

### sync-full.sh

Full database synchronization from production to local.

**Usage:**
```bash
./sync-full.sh [OPTIONS]
```

**Options:**
- `--anonymize` - Anonymize sensitive data
- `--backup` - Create backup before sync
- `--no-backup` - Skip backup creation
- `--compress` - Compress dump files
- `--parallel` - Use parallel processing
- `--dry-run` - Test without making changes
- `--resume` - Resume interrupted sync

**Example:**
```bash
# Full sync with anonymization and backup
./sync-full.sh --anonymize --backup

# Quick sync without backup
./sync-full.sh --no-backup

# Test sync without changes
./sync-full.sh --dry-run
```

**Process:**
1. Create local backup (if enabled)
2. Dump production schema
3. Dump production data
4. Anonymize data (if enabled)
5. Reset local database
6. Import schema and data
7. Verify row counts and foreign keys
8. Generate sync report

### sync-incremental.sh

Sync specific tables without affecting others.

**Usage:**
```bash
./sync-incremental.sh --tables "table1,table2,table3" [OPTIONS]
```

**Options:**
- `--tables` - Comma-separated list of tables (required)
- `--anonymize` - Anonymize sensitive data
- `--verify` - Verify foreign keys after sync

**Example:**
```bash
# Sync only expenses and payments
./sync-incremental.sh --tables "expenses,payments" --anonymize

# Sync with verification
./sync-incremental.sh --tables "profiles" --verify
```

**Process:**
1. Dump specified tables from production
2. Anonymize data (if enabled)
3. Import to local database
4. Verify foreign keys (if enabled)
5. Generate sync report

### sync-schema-only.sh

Compare production and local schemas without syncing data.

**Usage:**
```bash
./sync-schema-only.sh
```

**Process:**
1. Dump production schema
2. Dump local schema
3. Compare schemas
4. Report differences

### dump-production-schema.sh

Dump production database schema only.

**Usage:**
```bash
./dump-production-schema.sh [OUTPUT_FILE]
```

**Example:**
```bash
# Dump to default location
./dump-production-schema.sh

# Dump to specific file
./dump-production-schema.sh dumps/schema-$(date +%Y%m%d).sql
```

### verify-production-database.sh

Verify production database health and statistics.

**Usage:**
```bash
./verify-production-database.sh
```

**Checks:**
- Table row counts
- Function inventory
- Index health
- RLS policy coverage
- Performance metrics

## Configuration

Configuration is stored in `config.json`:

```json
{
  "production": {
    "project_ref": "your-project-ref",
    "db_url": "${SUPABASE_DB_URL}"
  },
  "local": {
    "db_url": "postgresql://postgres:postgres@localhost:54322/postgres"
  },
  "sync": {
    "include_tables": ["*"],
    "exclude_tables": ["auth.users"],
    "strategy": "full"
  },
  "anonymization": {
    "enabled": true,
    "fields": {
      "profiles.email": "fake-email",
      "profiles.full_name": "fake-name",
      "profiles.phone": "fake-phone"
    }
  },
  "backup": {
    "enabled": true,
    "retention_days": 7,
    "max_backups": 10
  },
  "output": {
    "dumps_dir": "dumps",
    "reports_dir": "reports",
    "compress": false
  }
}
```

### Configuration Options

#### production

- `project_ref` - Supabase project reference
- `db_url` - Production database URL (use environment variable)

#### local

- `db_url` - Local database URL

#### sync

- `include_tables` - Tables to include (use `["*"]` for all)
- `exclude_tables` - Tables to exclude
- `strategy` - Sync strategy: `full` or `incremental`

#### anonymization

- `enabled` - Enable/disable anonymization
- `fields` - Field-level anonymization rules

**Anonymization Strategies:**
- `fake-email` - Generate fake email addresses
- `fake-name` - Generate fake names
- `fake-phone` - Generate fake phone numbers
- `hash` - Hash the value (one-way)
- `null` - Set to NULL

#### backup

- `enabled` - Create backup before sync
- `retention_days` - Days to keep backups
- `max_backups` - Maximum number of backups to keep

#### output

- `dumps_dir` - Directory for dump files
- `reports_dir` - Directory for sync reports
- `compress` - Compress dump files with gzip

## Anonymization

Anonymization protects sensitive data when syncing to local environments.

### Supported Strategies

**fake-email**
```
user@example.com → user-abc123@example.local
```

**fake-name**
```
John Doe → Test User 123
```

**fake-phone**
```
+1234567890 → +1000000001
```

**hash**
```
sensitive-data → 5d41402abc4b2a76b9719d911017c592
```

**null**
```
sensitive-data → NULL
```

### Configuration Example

```json
{
  "anonymization": {
    "enabled": true,
    "fields": {
      "profiles.email": "fake-email",
      "profiles.full_name": "fake-name",
      "profiles.phone": "fake-phone",
      "profiles.avatar_url": "null",
      "user_settings.api_key": "hash"
    }
  }
}
```

### Referential Integrity

Anonymization preserves referential integrity:
- Foreign keys remain valid
- Unique constraints are maintained
- Relationships are preserved

### Mapping File

Anonymization generates a mapping file for debugging:

```
dumps/anonymization-mapping-20260110.json
```

This maps original values to anonymized values (for development only).

## Dump Files

Dump files are stored in `dumps/` directory:

```
dumps/
├── schema-20260110-123456.sql
├── data-full-20260110-123456.sql
├── data-full-20260110-123456.sql.gz
├── data-incremental-20260110-123456.sql
└── anonymization-mapping-20260110.json
```

### Naming Convention

- `schema-YYYYMMDD-HHMMSS.sql` - Schema dumps
- `data-full-YYYYMMDD-HHMMSS.sql` - Full data dumps
- `data-incremental-YYYYMMDD-HHMMSS.sql` - Incremental dumps
- `*.sql.gz` - Compressed dumps

### Cleanup

Old dumps are automatically cleaned up based on retention policy.

Manual cleanup:
```bash
# Remove dumps older than 7 days
find dumps/ -name "*.sql*" -mtime +7 -delete
```

## Sync Reports

Sync reports are generated in `reports/` directory:

```
reports/
├── sync-full-20260110-123456.md
└── sync-incremental-20260110-123456.md
```

### Report Contents

- Sync timestamp and duration
- Tables synced and row counts
- Anonymization summary
- Verification results
- Warnings and errors
- Performance metrics

### Example Report

```markdown
# Sync Report: Full Sync

**Date:** 2026-01-10 12:34:56
**Duration:** 2m 34s
**Status:** ✅ Success

## Summary

- **Tables Synced:** 15
- **Total Rows:** 1,234
- **Anonymized Fields:** 8
- **Backup Created:** Yes

## Tables

| Table | Rows | Status |
|-------|------|--------|
| profiles | 28 | ✅ |
| expenses | 156 | ✅ |
| payments | 165 | ✅ |

## Verification

- ✅ Row counts match
- ✅ Foreign keys valid
- ✅ RLS policies applied
- ✅ Indexes created

## Warnings

- None

## Errors

- None
```

## Performance

### Parallel Processing

Enable parallel processing for large databases:

```bash
./sync-full.sh --parallel
```

This uses GNU parallel or xargs to dump tables concurrently.

### Compression

Enable compression to reduce disk usage:

```bash
./sync-full.sh --compress
```

Compressed dumps are 5-10x smaller.

### Resumable Sync

If a sync is interrupted, resume from the last checkpoint:

```bash
./sync-full.sh --resume
```

Checkpoints are stored in `dumps/.checkpoint`.

## Safety Features

### Production Write Protection

Scripts never write to production by default. To enable:

```bash
./sync-full.sh --allow-production-write
```

You'll be prompted to type "CONFIRM" before proceeding.

### Automatic Backups

Full sync creates automatic backups before any destructive operations.

Disable with `--no-backup` (not recommended).

### Dry Run Mode

Test sync operations without making changes:

```bash
./sync-full.sh --dry-run
```

This shows what would happen without actually syncing.

## Troubleshooting

### Sync Fails with "Permission Denied"

Make scripts executable:
```bash
chmod +x *.sh
```

### Dump Files Too Large

Enable compression:
```bash
./sync-full.sh --compress
```

### Foreign Key Violations

Run verification to identify issues:
```bash
cd ../verification
./test-baseline-parity.sh
```

### Slow Sync Performance

Enable parallel processing:
```bash
./sync-full.sh --parallel
```

### Out of Disk Space

Clean up old dumps:
```bash
find dumps/ -name "*.sql*" -mtime +7 -delete
```

## Best Practices

1. **Always use anonymization** for local development
2. **Create backups** before full syncs
3. **Verify after sync** to catch issues early
4. **Clean up old dumps** regularly
5. **Use incremental sync** for specific tables
6. **Test with dry-run** before production syncs
7. **Monitor sync reports** for warnings

## Related Scripts

- [../backup/backup-local.sh](../backup/README.md) - Create backups
- [../verification/test-baseline-parity.sh](../verification/README.md) - Verify schema
- [../lib/dumper.sh](../lib/README.md) - Dump functions
- [../lib/anonymizer.sh](../lib/README.md) - Anonymization functions

## Support

For issues or questions, check:
1. This README
2. Main [scripts README](../README.md)
3. Serena memory: `production_database_sync`

# Supabase Scripts

Automated production database synchronization system with comprehensive backup, verification, and reporting capabilities.

## Directory Structure

```
supabase/scripts/
├── sync/              # Production data synchronization
├── backup/            # Database backup and restore
├── verification/      # Schema and data verification
├── utilities/         # Development utilities
└── lib/               # Shared library functions
```

## Quick Start

### Sync Production Data

```bash
# Full sync with anonymization
cd supabase/scripts/sync
./sync-full.sh --anonymize

# Schema only
./dump-production-schema.sh
```

### Backup & Restore

```bash
# Create backup
cd supabase/scripts/backup
./backup-local.sh

# Restore from backup
./restore-local.sh
```

### Verification

```bash
# Verify schema parity
cd supabase/scripts/verification
./test-baseline-parity.sh

# Compare with production
./compare-prod-vs-baseline.sh
```

## Prerequisites

- Supabase CLI installed and configured
- Docker running (for local database)
- Project linked to production (`supabase link`)
- Required environment variables set

## Environment Variables

```bash
# Production database (from Supabase dashboard)
SUPABASE_DB_URL=postgresql://...

# Local database (default)
LOCAL_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Common Workflows

### 1. Sync Production to Local

```bash
cd supabase/scripts/sync
./sync-full.sh --anonymize --backup
```

This will:
1. Create a backup of your local database
2. Dump production schema and data
3. Anonymize sensitive data (emails, names, phones)
4. Reset local database with baseline + migrations
5. Import anonymized data
6. Verify row counts and foreign keys
7. Generate sync report

### 2. Incremental Sync (Specific Tables)

```bash
cd supabase/scripts/sync
./sync-incremental.sh --tables "expenses,payments"
```

### 3. Verify Schema Changes

```bash
cd supabase/scripts/verification
./test-baseline-parity.sh
./compare-prod-vs-baseline.sh
```

### 4. Create Migration

```bash
# Create migration file
supabase migration new feature_name

# Test locally
supabase db reset

# Verify
cd supabase/scripts/verification
./test-baseline-parity.sh

# Deploy
supabase db push --linked
```

## Directory Details

### sync/

Production database synchronization scripts.

- `sync-full.sh` - Full database sync
- `sync-incremental.sh` - Sync specific tables
- `sync-schema-only.sh` - Schema comparison only
- `dump-production-schema.sh` - Dump production schema
- `verify-production-database.sh` - Verify production health
- `config.json` - Sync configuration
- `dumps/` - Generated dump files
- `reports/` - Sync reports

See [sync/README.md](sync/README.md) for details.

### backup/

Database backup and restore operations.

- `backup-local.sh` - Create local database backup
- `restore-local.sh` - Restore from backup
- `cleanup-old-backups.sh` - Manage backup retention
- `local/` - Local backup files

See [backup/README.md](backup/README.md) for details.

### verification/

Schema and data verification tools.

- `test-baseline-parity.sh` - Test baseline application
- `compare-prod-vs-baseline.sh` - Compare schemas
- `validate-documentation.sh` - Validate docs consistency
- `db-inventory.sql` - Database inventory queries

See [verification/README.md](verification/README.md) for details.

### utilities/

Development utilities and helpers.

- `open-studio.sh` - Quick Supabase Studio launcher
- `check-env.js` - Environment validation
- `reset-local.sh` - Reset local database

See [utilities/README.md](utilities/README.md) for details.

### lib/

Shared library functions used by sync scripts.

- `dumper.sh` - Database dump functions
- `anonymizer.sh` - Data anonymization
- `importer.sh` - Database import functions
- `verifier.sh` - Verification functions
- `reporter.sh` - Report generation
- `config-loader.sh` - Configuration management

See [lib/README.md](lib/README.md) for details.

## Configuration

Sync configuration is stored in `sync/config.json`:

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
      "profiles.full_name": "fake-name"
    }
  },
  "backup": {
    "enabled": true,
    "retention_days": 7,
    "max_backups": 10
  }
}
```

## Safety Features

### Production Write Protection

All scripts that could write to production require:
- `--allow-production-write` flag
- Typing "CONFIRM" when prompted
- All attempts are logged

### Automatic Backups

Full sync creates automatic backups before any destructive operations.

### Dry Run Mode

Test sync operations without making changes:

```bash
./sync-full.sh --dry-run
```

## Performance

### Parallel Processing

Large database syncs use parallel processing for faster dumps:

```bash
./sync-full.sh --parallel
```

### Compression

Enable compression for dump files:

```bash
./sync-full.sh --compress
```

### Resumable Sync

Interrupted syncs can be resumed from the last checkpoint:

```bash
./sync-full.sh --resume
```

## Troubleshooting

### Supabase CLI Not Found

```bash
# Install Supabase CLI
npm install -g supabase

# Or with Homebrew
brew install supabase/tap/supabase
```

### Docker Not Running

```bash
# Start Docker Desktop
# Or start Docker daemon
sudo systemctl start docker
```

### Project Not Linked

```bash
# Link to production project
supabase link --project-ref your-project-ref
```

### Permission Denied

```bash
# Make scripts executable
chmod +x supabase/scripts/**/*.sh
```

## Security Notes

- Never commit production data dumps to git
- Always use anonymization for local development
- Production credentials should be in environment variables
- Backup files may contain sensitive data - handle carefully

## Contributing

When adding new scripts:

1. Follow existing naming conventions
2. Add comprehensive error handling
3. Include usage documentation
4. Add to appropriate README
5. Test on both macOS and Linux
6. Use shellcheck for bash validation

## Related Documentation

- [Database Overview](../../.serena/memories/database_overview.md)
- [Production Database Sync](../../.serena/memories/production_database_sync.md)
- [Database Migration Strategy](../../.serena/memories/database_migrations_strategy.md)
- [Scripts Refactoring](../../.serena/memories/scripts_refactoring.md)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the relevant README in subdirectories
3. Check Serena memories for context
4. Contact the development team

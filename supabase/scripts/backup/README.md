# Backup Scripts

Database backup and restore operations with retention management.

## Available Scripts

### backup-local.sh

Create a backup of the local database.

**Usage:**
```bash
./backup-local.sh [OPTIONS]
```

**Options:**
- `--compress` - Compress backup with gzip
- `--name NAME` - Custom backup name
- `--output DIR` - Output directory (default: local/)

**Example:**
```bash
# Create compressed backup
./backup-local.sh --compress

# Create named backup
./backup-local.sh --name "before-migration"

# Create backup in custom location
./backup-local.sh --output /path/to/backups
```

**Process:**
1. Generate timestamped filename
2. Dump local database
3. Compress if enabled
4. Verify backup integrity
5. Report backup size and location

### restore-local.sh

Restore local database from a backup.

**Usage:**
```bash
./restore-local.sh [BACKUP_FILE]
```

**Example:**
```bash
# List available backups and choose
./restore-local.sh

# Restore specific backup
./restore-local.sh local/backup-20260110-123456.sql

# Restore compressed backup
./restore-local.sh local/backup-20260110-123456.sql.gz
```

**Process:**
1. List available backups (if no file specified)
2. Confirm restoration
3. Reset local database
4. Apply baseline.sql
5. Apply migrations
6. Restore backup data
7. Verify restoration success

### cleanup-old-backups.sh

Manage backup retention based on policy.

**Usage:**
```bash
./cleanup-old-backups.sh [OPTIONS]
```

**Options:**
- `--retention-days N` - Keep backups newer than N days (default: 7)
- `--max-backups N` - Keep only N most recent backups (default: 10)
- `--dry-run` - Show what would be deleted without deleting

**Example:**
```bash
# Clean up backups older than 7 days
./cleanup-old-backups.sh

# Keep only 5 most recent backups
./cleanup-old-backups.sh --max-backups 5

# Test cleanup without deleting
./cleanup-old-backups.sh --dry-run
```

**Process:**
1. List all backups in local/ directory
2. Identify backups to delete based on policy
3. Delete old backups
4. Report deleted backups and space freed

## Backup Files

Backups are stored in `local/` directory:

```
local/
├── backup-20260110-123456.sql
├── backup-20260110-123456.sql.gz
├── backup-before-migration.sql
└── backup-test-workflow.sql
```

### Naming Convention

- `backup-YYYYMMDD-HHMMSS.sql` - Timestamped backups
- `backup-NAME.sql` - Named backups
- `*.sql.gz` - Compressed backups

### File Sizes

Typical backup sizes:
- Uncompressed: 10-50 MB
- Compressed: 1-5 MB (5-10x smaller)

## Retention Policy

Default retention policy:
- Keep backups newer than 7 days
- Keep maximum 10 most recent backups
- Older backups are automatically deleted

Configure in `../sync/config.json`:

```json
{
  "backup": {
    "enabled": true,
    "retention_days": 7,
    "max_backups": 10
  }
}
```

## Backup Strategies

### Automatic Backups

Full sync creates automatic backups before destructive operations:

```bash
cd ../sync
./sync-full.sh --backup
```

### Manual Backups

Create manual backups before risky operations:

```bash
# Before migration
./backup-local.sh --name "before-migration"

# Before testing
./backup-local.sh --name "before-testing"

# Before major changes
./backup-local.sh --name "before-refactor"
```

### Scheduled Backups

Set up cron job for daily backups:

```bash
# Add to crontab
0 2 * * * cd /path/to/supabase/scripts/backup && ./backup-local.sh --compress
```

## Restoration

### Full Restoration

Restore complete database from backup:

```bash
./restore-local.sh local/backup-20260110-123456.sql
```

This will:
1. Reset database to baseline
2. Apply all migrations
3. Restore backup data

### Selective Restoration

To restore specific tables, use psql:

```bash
# Extract specific table from backup
pg_restore -t expenses local/backup-20260110-123456.sql | \
  docker exec -i supabase_db_FairPay psql -U postgres -d postgres
```

## Verification

### Verify Backup Integrity

Check if backup file is valid:

```bash
# For uncompressed backups
head -n 10 local/backup-20260110-123456.sql

# For compressed backups
gunzip -c local/backup-20260110-123456.sql.gz | head -n 10
```

### Verify Restoration

After restoration, verify data:

```bash
cd ../verification
./test-baseline-parity.sh
```

## Compression

### Enable Compression

Compress backups to save disk space:

```bash
./backup-local.sh --compress
```

### Decompress Backups

Decompress for inspection:

```bash
gunzip local/backup-20260110-123456.sql.gz
```

### Compression Ratio

Typical compression ratios:
- SQL dumps: 5-10x smaller
- Large databases: 10-20x smaller

## Disk Space Management

### Check Backup Sizes

```bash
du -sh local/
du -h local/*.sql*
```

### Clean Up Old Backups

```bash
# Automatic cleanup
./cleanup-old-backups.sh

# Manual cleanup
rm local/backup-20260101-*.sql*
```

### Monitor Disk Usage

```bash
df -h
```

## Safety Features

### Confirmation Prompts

Restoration requires confirmation:

```
⚠️  WARNING: This will reset your local database!
Type 'CONFIRM' to proceed:
```

### Backup Before Restore

Always create a backup before restoration:

```bash
./backup-local.sh --name "before-restore"
./restore-local.sh local/backup-20260110-123456.sql
```

### Dry Run Mode

Test cleanup without deleting:

```bash
./cleanup-old-backups.sh --dry-run
```

## Troubleshooting

### Backup Fails with "Permission Denied"

Make scripts executable:
```bash
chmod +x *.sh
```

### Restore Fails with "Database in Use"

Stop all connections:
```bash
supabase stop
supabase start
```

### Out of Disk Space

Clean up old backups:
```bash
./cleanup-old-backups.sh --max-backups 3
```

### Compressed Backup Won't Restore

Decompress first:
```bash
gunzip local/backup-20260110-123456.sql.gz
./restore-local.sh local/backup-20260110-123456.sql
```

### Backup File Corrupted

Check file integrity:
```bash
# For compressed files
gunzip -t local/backup-20260110-123456.sql.gz

# For uncompressed files
head -n 10 local/backup-20260110-123456.sql
```

## Best Practices

1. **Create backups before risky operations**
2. **Use compression** to save disk space
3. **Name important backups** for easy identification
4. **Test restoration** periodically
5. **Monitor disk usage** regularly
6. **Clean up old backups** automatically
7. **Verify backup integrity** after creation

## Backup Checklist

Before major changes:
- [ ] Create named backup
- [ ] Verify backup file exists
- [ ] Check backup file size
- [ ] Test restoration (optional)
- [ ] Proceed with changes
- [ ] Keep backup until changes are stable

## Related Scripts

- [../sync/sync-full.sh](../sync/README.md) - Full sync with backup
- [../verification/test-baseline-parity.sh](../verification/README.md) - Verify schema
- [../utilities/reset-local.sh](../utilities/README.md) - Reset database

## Support

For issues or questions, check:
1. This README
2. Main [scripts README](../README.md)
3. Serena memory: `production_database_sync`

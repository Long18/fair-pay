# Utility Scripts

Development utilities and helper scripts for common tasks.

## Available Scripts

### open-studio.sh

Quick launcher for Supabase Studio (local database UI).

**Usage:**
```bash
./open-studio.sh
```

**What it does:**
1. Checks if Supabase is running
2. Opens http://127.0.0.1:54323 in default browser
3. Displays connection info

**Example:**
```bash
# Open Supabase Studio
./open-studio.sh

# Output:
# Opening Supabase Studio...
# URL: http://127.0.0.1:54323
# Database: postgres
# User: postgres
```

**Troubleshooting:**

If Supabase is not running:
```bash
# Start Supabase
cd ../../../..
supabase start

# Then open Studio
cd supabase/scripts/utilities
./open-studio.sh
```

### check-env.js

Validate development environment and required dependencies.

**Usage:**
```bash
node check-env.js
```

**Checks:**

1. **Node.js Version**
   - Minimum: v18.0.0
   - Recommended: v20.0.0+

2. **Supabase CLI**
   - Installed: `supabase --version`
   - Minimum: v1.100.0

3. **Docker**
   - Running: `docker ps`
   - Version: 20.0.0+

4. **Environment Variables**
   - `SUPABASE_DB_URL` (production)
   - `LOCAL_DB_URL` (optional)

5. **Project Link**
   - Linked to production: `supabase link --project-ref`

6. **Database Connection**
   - Local database accessible
   - Production database accessible (if URL provided)

**Example Output:**
```
Environment Validation
======================

✅ Node.js: v20.10.0
✅ Supabase CLI: v1.123.4
✅ Docker: 24.0.6 (running)
✅ Environment Variables:
   - SUPABASE_DB_URL: configured
   - LOCAL_DB_URL: using default
✅ Project Link: linked to project-ref-abc123
✅ Local Database: accessible
✅ Production Database: accessible

All checks passed! ✅
```

**Error Output:**
```
Environment Validation
======================

✅ Node.js: v20.10.0
❌ Supabase CLI: not installed
✅ Docker: 24.0.6 (running)
⚠️  Environment Variables:
   - SUPABASE_DB_URL: not configured
   - LOCAL_DB_URL: using default
❌ Project Link: not linked
✅ Local Database: accessible
❌ Production Database: cannot connect

Errors: 3
Warnings: 1

Please fix errors before proceeding.
```

**Options:**
```bash
# Verbose output
node check-env.js --verbose

# Check specific items
node check-env.js --check node,docker,supabase

# Skip production checks
node check-env.js --skip-production
```

### reset-local.sh

Reset local database to baseline state.

**Usage:**
```bash
./reset-local.sh [OPTIONS]
```

**Options:**
- `--seed` - Load seed data after reset
- `--no-migrations` - Skip migrations (baseline only)
- `--confirm` - Skip confirmation prompt

**Example:**
```bash
# Reset with confirmation
./reset-local.sh

# Reset and load seed data
./reset-local.sh --seed

# Reset without migrations
./reset-local.sh --no-migrations

# Reset without confirmation
./reset-local.sh --confirm
```

**Process:**
1. Confirm reset (unless --confirm)
2. Stop Supabase
3. Reset database
4. Apply baseline.sql
5. Apply migrations (unless --no-migrations)
6. Load seed data (if --seed)
7. Start Supabase
8. Verify schema

**Output:**
```
Resetting Local Database
========================

⚠️  WARNING: This will delete all local data!
Type 'CONFIRM' to proceed: CONFIRM

✅ Stopping Supabase...
✅ Resetting database...
✅ Applying baseline.sql...
✅ Applying migrations (15 files)...
✅ Starting Supabase...
✅ Verifying schema...

Reset complete! ✅
```

## Common Workflows

### Start Development

```bash
# 1. Check environment
node check-env.js

# 2. Reset database
./reset-local.sh --seed

# 3. Open Studio
./open-studio.sh
```

### After Pulling Changes

```bash
# 1. Reset database with new migrations
./reset-local.sh

# 2. Verify schema
cd ../verification
./test-baseline-parity.sh
```

### Before Creating Migration

```bash
# 1. Reset to clean state
./reset-local.sh

# 2. Make schema changes in Studio
./open-studio.sh

# 3. Generate migration
cd ../../../..
supabase db diff -f migration_name
```

### Troubleshooting Environment

```bash
# 1. Check environment
node check-env.js --verbose

# 2. Fix issues based on output

# 3. Verify fixes
node check-env.js
```

## Environment Setup

### Required Tools

**Node.js:**
```bash
# Install with nvm
nvm install 20
nvm use 20
```

**Supabase CLI:**
```bash
# Install with npm
npm install -g supabase

# Or with Homebrew
brew install supabase/tap/supabase
```

**Docker:**
```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### Environment Variables

Create `.env` file in project root:

```bash
# Production database (from Supabase dashboard)
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Local database (optional, uses default if not set)
LOCAL_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Project Link

Link to production project:

```bash
# Link project
supabase link --project-ref your-project-ref

# Verify link
supabase projects list
```

## Script Maintenance

### Making Scripts Executable

```bash
chmod +x *.sh
```

### Testing Scripts

```bash
# Test open-studio.sh
./open-studio.sh

# Test check-env.js
node check-env.js

# Test reset-local.sh (dry run)
./reset-local.sh --dry-run
```

### Updating Scripts

When updating scripts:
1. Test locally first
2. Update documentation
3. Commit with descriptive message
4. Notify team of changes

## Troubleshooting

### "Command not found: supabase"

Install Supabase CLI:
```bash
npm install -g supabase
```

### "Docker is not running"

Start Docker:
```bash
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker
```

### "Project not linked"

Link to production:
```bash
supabase link --project-ref your-project-ref
```

### "Cannot connect to database"

Check Supabase is running:
```bash
supabase status
```

If not running:
```bash
supabase start
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x *.sh
```

### "Node version too old"

Update Node.js:
```bash
nvm install 20
nvm use 20
```

## Best Practices

1. **Run check-env.js** before starting work
2. **Use reset-local.sh** to ensure clean state
3. **Open Studio** for visual database inspection
4. **Keep tools updated** (Node, Supabase CLI, Docker)
5. **Set environment variables** in .env file
6. **Link to production** for sync operations
7. **Test scripts** after updates

## Utility Checklist

Before starting development:
- [ ] Run check-env.js
- [ ] All checks pass
- [ ] Database accessible
- [ ] Project linked
- [ ] Environment variables set

After pulling changes:
- [ ] Reset local database
- [ ] Verify schema
- [ ] Test application

Before creating migration:
- [ ] Reset to clean state
- [ ] Make changes in Studio
- [ ] Generate migration
- [ ] Test migration

## Related Scripts

- [../sync/sync-full.sh](../sync/README.md) - Sync production data
- [../backup/backup-local.sh](../backup/README.md) - Create backups
- [../verification/test-baseline-parity.sh](../verification/README.md) - Verify schema

## Support

For issues or questions, check:
1. This README
2. Main [scripts README](../README.md)
3. Supabase CLI docs: https://supabase.com/docs/guides/cli
4. Docker docs: https://docs.docker.com

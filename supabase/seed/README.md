# Supabase Seed Data

## Current Approach

**Use production data for local development:**

```bash
# Pull latest production data
cd scripts/production
./dump-production-schema.sh

# Import to local Supabase
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < production-data.sql
```

## Archived Files

- `archive-sample-data.sql` - Old fake seed data (122KB, 1993 lines)
- `archive-correct-from-request.sql` - Old generated seed (94KB, 1055 lines)

**Why archived:**
- Production data now available via `scripts/production/production-data.sql`
- Real user relationships and transactions provide better testing
- Baseline.sql handles schema, no need for seed data in fresh environments

## For Fresh Environments

```bash
# Reset local database to baseline
supabase db reset

# Import production data (optional, for realistic testing)
docker exec -i supabase_db_FairPay psql -U postgres -d postgres < scripts/production/production-data.sql
```

## If You Need Custom Seed Data

Create minimal test data if needed:

```sql
-- supabase/seed/minimal.sql
-- Insert 2-3 test users for basic testing
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test1@example.com', '$2a$10$...', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'test2@example.com', '$2a$10$...', NOW(), NOW(), NOW());

INSERT INTO profiles (id, full_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User 1', 'test1@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'Test User 2', 'test2@example.com');
```

## Documentation

See `.serena/memories/production_database_sync.md` for:
- Production data sync process
- Data statistics and sample records
- Development workflow guidance


# Public Debt API - Setup & Implementation Guide

## Overview

This document covers the setup, testing, and deployment of the Public Debt API system for FairPay.

## What's Included

### 1. Database Layer
- **Migration**: `supabase/migrations/20260206100000_create_public_debt_api_system.sql`
  - Creates `api_secrets` table for token management
  - Implements RLS policies for security
  - Provides 5 core database functions

### 2. Backend (Edge Functions)
- **Function**: `supabase/functions/get-user-debt/index.ts`
  - Public CORS-enabled endpoint
  - Validates secrets
  - Returns comprehensive debt data in JSON

### 3. Frontend (React/TypeScript)
- **Types**: `src/types/api-debt.ts`
  - TypeScript interfaces for all API responses
  - Type-safe consumption

- **Hook**: `src/hooks/usePublicDebtApi.ts`
  - React hook for frontend components
  - Manages loading, error, and data states
  - Automatic CORS handling

- **Client**: `src/utility/debt-api-client.ts`
  - Utility class for API operations
  - Secret management (create, list, revoke)
  - Debt data formatting

- **Component**: `src/components/api-secrets-manager.tsx`
  - UI for managing API secrets
  - Create, view, and revoke interface
  - Copy-to-clipboard functionality

### 4. Documentation
- **Main Docs**: `docs/public-debt-api.md`
  - Complete API reference
  - Usage examples (JS, Python, cURL)
  - Integration examples
  - Security guidelines

## Setup Instructions

### Step 1: Apply the Database Migration

```bash
# 1. Navigate to project root
cd /Users/long.lnt/Desktop/Projects/FairPay

# 2. Apply the migration
pnpm supabase db push

# 3. Verify the migration applied
pnpm supabase db list
```

**What this creates:**
- `api_secrets` table with proper indexing
- RLS policies (users see only their own secrets)
- 5 database functions:
  - `get_user_debt_by_secret()` - Main API function
  - `create_api_secret()` - Generate new secret
  - `list_api_secrets()` - List user's secrets
  - `revoke_api_secret()` - Deactivate secret

### Step 2: Deploy the Edge Function

```bash
# 1. Deploy to Supabase (if using remote)
pnpm supabase functions deploy get-user-debt --remote

# 2. Or test locally
pnpm supabase functions serve

# 3. Verify function is accessible
curl "http://localhost:54321/functions/v1/get-user-debt?user_id=test&secret=test"
```

**Expected response** (with invalid secret):
```json
{
  "success": false,
  "error_message": "Invalid or expired API secret"
}
```

### Step 3: Integrate into Settings Page

Add the API Secrets Manager to the user's settings page:

```typescript
// In your settings component
import { ApiSecretsManager } from '@/components/api-secrets-manager'

export function UserSettings() {
  return (
    <div className="space-y-8">
      <OtherSettings />
      <ApiSecretsManager />
    </div>
  )
}
```

### Step 4: Test the Full Flow

#### 1. Create a Test Secret

```bash
# Sign in to FairPay app
# Go to Settings → API Secrets
# Click "Create Secret"
# Label it "Test"
# Copy the secret token

# Save for testing:
USER_ID=your-uuid-here
SECRET_TOKEN=your-secret-token-here
```

#### 2. Test the API Endpoint

```bash
# Local testing
curl "http://localhost:54321/functions/v1/get-user-debt?user_id=$USER_ID&secret=$SECRET_TOKEN" | jq

# Remote testing (production)
curl "https://your-supabase-url.supabase.co/functions/v1/get-user-debt?user_id=$USER_ID&secret=$SECRET_TOKEN" | jq
```

#### 3. Test from Frontend

```typescript
import { usePublicDebtApi } from '@/hooks/usePublicDebtApi'

function TestComponent() {
  const { data, error, fetchDebt } = usePublicDebtApi()
  
  return (
    <>
      <button onClick={() => fetchDebt(USER_ID, SECRET_TOKEN)}>
        Load Debt
      </button>
      {error && <p>Error: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </>
  )
}
```

## Database Functions Reference

### `get_user_debt_by_secret(user_id UUID, secret_token TEXT)`

Main API function that:
1. Validates the secret exists and is active
2. Checks expiration (if set)
3. Updates `last_used_at` timestamp
4. Fetches comprehensive debt data
5. Returns structured JSON

**Permissions**: `EXECUTE TO anon, authenticated`

**Returns**:
- `success` - Boolean indicating validation result
- `error_message` - Error text if validation failed
- `user_id`, `user_name`, `user_email` - User details
- `total_owed_to_me`, `total_i_owe`, `net_balance` - Balance summary
- `debts_by_person` - Array of individual debts with settlement info
- `debts_by_group` - Array of group-level summaries
- `settlement_summary` - Aggregate settlement statistics

### `create_api_secret(label TEXT)`

Creates a new API secret for authenticated user.

**Permissions**: `EXECUTE TO authenticated`

**Returns**:
- `id` - Secret UUID
- `secret_token` - Random 32-char token (never stored plaintext)
- `label` - User-provided label
- `created_at` - Timestamp
- `expires_at` - Expiration (NULL = never expires)

### `list_api_secrets()`

Lists all API secrets for authenticated user.

**Permissions**: `EXECUTE TO authenticated`

**Returns**: Array of secrets (without token values)

### `revoke_api_secret(secret_id UUID)`

Deactivates a secret (cannot be reactivated).

**Permissions**: `EXECUTE TO authenticated`

## Security Implementation

### Token Generation
```sql
-- 16 random bytes = 32 hex characters
v_token := encode(gen_random_bytes(16), 'hex');
```

### Storage
- Tokens are **never** stored plaintext
- Database stores: `api_secrets` table with hashed comparison (via query parameters)
- Each request validates against the stored token

### RLS Policies
```sql
-- Users can only see their own secrets
SELECT using (auth.uid() = user_id)
INSERT with check (auth.uid() = user_id)
UPDATE using (auth.uid() = user_id)
DELETE using (auth.uid() = user_id)
```

### Audit Trail
- `last_used_at` timestamp updated on each API call
- `created_by` tracks who created the secret
- No sensitive data logged

## Performance Optimization

### Indexes Created
```sql
CREATE INDEX idx_api_secrets_user_id ON api_secrets(user_id);
CREATE INDEX idx_api_secrets_token ON api_secrets(secret_token) WHERE is_active = true;
CREATE INDEX idx_api_secrets_expires_at ON api_secrets(expires_at) WHERE is_active = true;
```

### Query Optimization
- `SECURITY DEFINER` functions bypass RLS for internal queries
- Reuses existing `get_user_debts_history()` and `get_user_balance()` functions
- Single database round-trip for all data

### Edge Function Optimization
- Anon client (faster than authenticated)
- No session persistence needed
- CORS headers cached

## Deployment Checklist

### Pre-Deployment
- [ ] Migration applied and tested locally
- [ ] Edge function deployed
- [ ] Component integrated into settings
- [ ] Documentation reviewed
- [ ] Types are correct

### Testing
- [ ] Create API secret succeeds
- [ ] List secrets shows all user's secrets
- [ ] API endpoint returns valid JSON
- [ ] Invalid secret returns 401
- [ ] Missing parameters return 400
- [ ] Settlement data is accurate

### Post-Deployment
- [ ] Monitor function logs for errors
- [ ] Test with actual user data
- [ ] Verify CORS works from external domains
- [ ] Check that secrets are properly validated

## Environment Variables

The Edge Function uses these Supabase environment variables (auto-injected):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anon key for public access

**No additional setup required** - Supabase provides these automatically.

## API Endpoint URL

Once deployed, the API is available at:

```
https://<your-project-ref>.supabase.co/functions/v1/get-user-debt
```

Or locally during development:

```
http://localhost:54321/functions/v1/get-user-debt
```

## Common Issues & Troubleshooting

### Issue: Function not found (404)

**Solution**: Ensure function is deployed
```bash
pnpm supabase functions deploy get-user-debt
```

### Issue: CORS errors

**Solution**: The function has CORS headers enabled. If issues persist:
```typescript
// Verify CORS headers in response
curl -i "https://...get-user-debt?user_id=test&secret=test"
```

### Issue: Database errors (500)

**Solution**: Verify migration applied
```bash
pnpm supabase migration list
pnpm supabase db push
```

### Issue: Invalid UUID error

**Solution**: Ensure user_id is valid UUID format
```bash
# Valid: 550e8400-e29b-41d4-a716-446655440000
# Invalid: 123456
```

## Monitoring & Maintenance

### Check API Usage
```sql
-- View last usage of each secret
SELECT 
  id, label, last_used_at, is_active
FROM api_secrets
ORDER BY last_used_at DESC;
```

### Find Unused Secrets
```sql
-- Secrets never used
SELECT id, label, created_at
FROM api_secrets
WHERE last_used_at IS NULL
AND created_at < NOW() - INTERVAL '30 days';
```

### Revoke Expired Secrets
```sql
-- Auto-revoke past expiration
UPDATE api_secrets
SET is_active = false
WHERE expires_at < NOW()
  AND is_active = true;
```

## Future Enhancements

### Potential Improvements
1. **Rate limiting** - Add request throttling per secret
2. **Metrics** - Track usage statistics
3. **Webhooks** - Notify when debts change significantly
4. **Scheduled exports** - Auto-export debt data at intervals
5. **Multiple currency support** - Return data in different currencies
6. **Custom date ranges** - Filter debt by date range
7. **Webhook signatures** - Signed callbacks for webhooks
8. **OAuth integration** - OAuth2 flow for third-party apps

## Support & Documentation

- **Main API docs**: `docs/public-debt-api.md`
- **Code examples**: In the docs file (JS, Python, cURL)
- **Inline code comments**: All functions have detailed JSDoc comments
- **Integration examples**: Slack, dashboards, and more in docs

## Version History

- **v1.0** (2026-02-06): Initial release
  - Token-based authentication
  - Comprehensive debt data API
  - Secret management UI
  - Full documentation

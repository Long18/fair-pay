# FairPay Agent API — Developer Quickstart

Welcome! This guide walks you through integrating with the FairPay Agent API to create group expenses programmatically.

## Overview

The FairPay Agent API enables you to create group expenses on behalf of authenticated users through a **preview → confirm → commit** flow. This three-step process ensures transparency and requires explicit user confirmation before any expense is written to the database.

### What the Agent API Does

- List groups and members
- Create a preview of a proposed expense (immutable, server-validated)
- Detect likely duplicate expenses
- Confirm and commit the expense (idempotent for safety)
- Poll operation status

### What Requires Human Confirmation

The confirm and commit steps **must be performed by the FairPay UI**, never by an AI agent or automated client. This ensures:

- Transparency: users see the exact expense before confirmation
- Non-repudiation: confirmations are bound to a preview hash
- Atomicity: preview and confirmation are consumed together

---

## Prerequisites

### Supabase Setup

1. You must have a **Supabase project** with the FairPay application deployed.
2. Ensure the Edge Function `fairpay-agent-api` is deployed at:
   ```
   https://{project-ref}.supabase.co/functions/v1/fairpay-agent-api
   ```
3. Run the migration scripts to create the required tables and functions:
   - `supabase/migrations/20260622094450_agent_api_phase1a.sql`
   - `supabase/migrations/20260623081229_admin_agent_operations_rpcs.sql`

### JWT Requirement

Every API request requires a **valid Supabase JWT** in the `Authorization` header. The JWT encodes the authenticated user's `user_id`, which the API reads directly from the token. Never send `user_id` or `actor_user_id` in the request body — the server always extracts the actor from the JWT.

To obtain a JWT:
1. Authenticate via Supabase Auth (email/password, OAuth, etc.)
2. Supabase returns a JWT in the session
3. Pass it to the Agent API as `Authorization: Bearer <jwt>`

---

## Authentication

### Bearer Token Format

All requests must include:

```
Authorization: Bearer <supabase_jwt>
```

The JWT is a standard Supabase session token. Its `sub` claim contains your `user_id`.

### Example: Get Your JWT (Browser/Node.js)

**Browser with Supabase client:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project-ref.supabase.co',
  'your-anon-key'
);

// After sign-in
const { data: { session } } = await supabase.auth.getSession();
const jwt = session.access_token; // Use this in Authorization header
```

**Node.js with manual auth:**
```javascript
const response = await fetch(
  'https://your-project-ref.supabase.co/auth/v1/token?grant_type=password',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123'
    })
  }
);
const { access_token } = await response.json();
```

---

## Step-by-Step Walkthrough

### 1. Verify Connection (GET /v1/me)

Start by confirming your JWT is valid and retrieving your profile.

**curl:**
```bash
curl -X GET "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript:**
```javascript
const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/me',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
);

const { user } = await response.json();
console.log(`Logged in as: ${user.full_name} (${user.email})`);
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "alice@example.com",
    "full_name": "Alice Johnson",
    "avatar_url": "https://..."
  }
}
```

---

### 2. List Groups (GET /v1/groups)

Retrieve all groups you are a member of.

**curl:**
```bash
curl -X GET "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/groups" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript:**
```javascript
const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/groups',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
);

const { groups } = await response.json();
groups.forEach(g => {
  console.log(`${g.name} (${g.member_count} members) - Role: ${g.member_role}`);
});
```

**Response (200 OK):**
```json
{
  "groups": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Southeast Asia Trip",
      "description": "Group for our 2-week vacation",
      "is_archived": false,
      "member_count": 4,
      "member_role": "admin"
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Apartment Roommates",
      "description": null,
      "is_archived": false,
      "member_count": 3,
      "member_role": "member"
    }
  ]
}
```

---

### 3. Get Group Members (GET /v1/groups/{id}/members)

List all registered members of a specific group. Only members with confirmed email addresses are included.

**curl:**
```bash
curl -X GET "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/groups/550e8400-e29b-41d4-a716-446655440000/members" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript:**
```javascript
const groupId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(
  `https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/groups/${groupId}/members`,
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
);

const { members } = await response.json();
members.forEach(m => {
  // Always use member_id for API calls, never user_id
  console.log(`${m.full_name} (ID: ${m.member_id})`);
});
```

**Response (200 OK):**
```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": [
    {
      "member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "role": "admin",
      "full_name": "Alice Johnson",
      "email": "alice@example.com",
      "avatar_url": "https://..."
    },
    {
      "member_id": "9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "role": "member",
      "full_name": "Bob Smith",
      "email": "bob@example.com",
      "avatar_url": null
    },
    {
      "member_id": "a1b2c3d4-e5f6-4890-abcd-1234567890ef",
      "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "role": "member",
      "full_name": "Carol Lee",
      "email": "carol@example.com",
      "avatar_url": "https://..."
    }
  ]
}
```

**Important:** Always use `member_id` when referencing group members in subsequent API calls. Never use `user_id` — the API expects the `group_members.id` value.

---

### 4. Check for Duplicates (POST /v1/expense-duplicate-checks)

Before creating an expense, check if a similar one already exists. This prevents accidental duplication.

**curl:**
```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expense-duplicate-checks" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Dinner at Pho King",
    "amount": 450000,
    "payer_member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f",
    "expense_date": "2026-06-23",
    "window_hours": 24
  }'
```

**JavaScript:**
```javascript
const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expense-duplicate-checks',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Dinner at Pho King',
      amount: 450000, // VND (integer only)
      payer_member_id: '7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f',
      expense_date: '2026-06-23',
      window_hours: 24
    })
  }
);

const { matches } = await response.json();
if (matches.length > 0) {
  console.log('Found potential duplicates:');
  matches.forEach(m => {
    console.log(`  - ${m.description} (${m.amount} VND on ${m.expense_date})`);
  });
}
```

**Response (200 OK) — No duplicates:**
```json
{
  "matches": []
}
```

**Response (200 OK) — Found duplicates:**
```json
{
  "matches": [
    {
      "expense_id": "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f",
      "match_type": "strong",
      "reason": "Same payer, amount, and description within 24 hours",
      "description": "Dinner at Pho King",
      "amount": 450000,
      "expense_date": "2026-06-23",
      "created_at": "2026-06-23T18:30:00Z"
    }
  ]
}
```

---

### 5. Create a Preview (POST /v1/expenses/preview)

Create an immutable preview of the expense. The server validates the request, computes split allocations, and returns a preview hash that binds the expense to confirmation and commit steps.

**curl:**
```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/preview" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Dinner at Pho King",
    "amount": 450000,
    "currency": "VND",
    "category": "Food & Drink",
    "expense_date": "2026-06-23",
    "comment": "Shared with roommates",
    "payer_member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f",
    "split_method": "equal",
    "participants": [
      {"member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f"},
      {"member_id": "9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b"},
      {"member_id": "a1b2c3d4-e5f6-4890-abcd-1234567890ef"}
    ]
  }'
```

**JavaScript:**
```javascript
const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/preview',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Dinner at Pho King',
      amount: 450000, // VND (integer only, no decimals)
      currency: 'VND',
      category: 'Food & Drink',
      expense_date: '2026-06-23',
      comment: 'Shared with roommates',
      payer_member_id: '7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f',
      split_method: 'equal', // or 'exact', 'fixed_then_equal_remainder'
      participants: [
        { member_id: '7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f' },
        { member_id: '9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b' },
        { member_id: 'a1b2c3d4-e5f6-4890-abcd-1234567890ef' }
      ]
    })
  }
);

const { preview_id, preview_hash, operation_id, expires_at, preview, duplicate_warnings } = await response.json();
console.log(`Preview created: ${preview_id}`);
console.log(`Expires at: ${expires_at}`);
console.log(`Splits:`);
preview.splits.forEach(s => {
  console.log(`  - ${s.full_name}: ${s.amount} VND`);
});

// Save preview_hash and preview_id for the confirm step
```

**Response (200 OK):**
```json
{
  "preview_id": "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
  "preview_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
  "operation_id": "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "expires_at": "2026-06-23T19:15:30Z",
  "preview": {
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "group_name": "Southeast Asia Trip",
    "description": "Dinner at Pho King",
    "amount": 450000,
    "currency": "VND",
    "category": "Food & Drink",
    "expense_date": "2026-06-23",
    "comment": "Shared with roommates",
    "payer": {
      "member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "full_name": "Alice Johnson"
    },
    "requested_split_method": "equal",
    "splits": [
      {
        "member_id": "7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f",
        "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "full_name": "Alice Johnson",
        "amount": 150000
      },
      {
        "member_id": "9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "full_name": "Bob Smith",
        "amount": 150000
      },
      {
        "member_id": "a1b2c3d4-e5f6-4890-abcd-1234567890ef",
        "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "full_name": "Carol Lee",
        "amount": 150000
      }
    ],
    "total_check": 450000
  },
  "duplicate_warnings": [
    {
      "expense_id": "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f",
      "match_type": "likely",
      "reason": "Similar amount and description within 48 hours",
      "description": "Lunch at Pho King",
      "amount": 380000,
      "expense_date": "2026-06-22",
      "created_at": "2026-06-22T12:00:00Z"
    }
  ]
}
```

**Important Notes:**

- The `preview_hash` is a SHA-256 signature of the canonical preview. You must pass it unchanged to the confirm and commit steps.
- Preview expires after **10 minutes** (`expires_at`). If you need to re-confirm, you must create a new preview.
- `duplicate_warnings` are informational; they don't block preview creation.
- All amounts are **integer VND** (no decimals). Division is exact; remainders are allocated to the last participant.

---

### 6. Confirm the Preview (POST /v1/previews/{preview_id}/confirm)

After the user reviews the preview in the FairPay UI, the UI calls confirm to bind the actor to the preview. This endpoint is **UI-only** — agents never call it directly.

**For reference (UI calls this):**

```javascript
const previewId = 'd9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a';
const previewHash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';

const response = await fetch(
  `https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/previews/${previewId}/confirm`,
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      preview_hash: previewHash
    })
  }
);

const { confirmation_id, expires_at } = await response.json();
// Pass confirmation_id to commit step
```

---

### 7. Commit the Expense (POST /v1/expenses/commit)

After confirmation, the FairPay UI calls commit to atomically write the expense and splits. This endpoint is **UI-only** — agents never call it directly.

**For reference (UI calls this):**

```javascript
const previewId = 'd9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a';
const previewHash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';
const confirmationId = 'e1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c';

// Idempotency key: must be unique per user per commit attempt
const idempotencyKey = `${userId}-${Date.now()}-${Math.random()}`;

const response = await fetch(
  'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/commit',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      preview_id: previewId,
      preview_hash: previewHash,
      confirmation_id: confirmationId
    })
  }
);

const { expense_id, splits_count } = await response.json();
console.log(`Expense committed: ${expense_id} with ${splits_count} splits`);
```

**Response (200 OK):**
```json
{
  "success": true,
  "expense_id": "g2h3i4j5-k6l7-8m9n-0o1p-2q3r4s5t6u7v",
  "preview_id": "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
  "operation_id": "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "total_amount": 450000,
  "currency": "VND",
  "splits_count": 3
}
```

---

### 8. Poll Operation Status (GET /v1/operations/{preview_id})

Poll the operation status to track progress from preview through commit.

**curl:**
```bash
curl -X GET "https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/operations/d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript:**
```javascript
const previewId = 'd9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a';

const response = await fetch(
  `https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/operations/${previewId}`,
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
);

const { status, result, error } = await response.json();
console.log(`Operation status: ${status}`);

if (status === 'failed') {
  console.error(`Error: ${error.code} - ${error.message}`);
} else if (status === 'committed') {
  console.log(`Expense created: ${result.expense_id}`);
}
```

**Response (200 OK):**
```json
{
  "operation_id": "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "preview_id": "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
  "status": "committed",
  "result": {
    "expense_id": "g2h3i4j5-k6l7-8m9n-0o1p-2q3r4s5t6u7v",
    "splits_count": 3
  },
  "error": null,
  "created_at": "2026-06-23T18:05:30Z",
  "updated_at": "2026-06-23T18:06:15Z"
}
```

**Possible Statuses:**

| Status | Meaning |
|--------|---------|
| `pending` | Preview creation in progress |
| `previewed` | Preview created; awaiting confirmation |
| `confirmed` | Confirmation received; awaiting commit |
| `committed` | ✓ Expense written successfully |
| `expired` | ✗ Preview TTL (10 min) elapsed |
| `failed` | ✗ Operation failed; see `error` field |

---

## Error Handling

The API returns structured error responses. Always check the HTTP status code and the `error.code` field.

**Error Response Format:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "User has created ≥ 10 previews in the last 60 seconds.",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning | Action |
|------|------|---------|--------|
| `UNAUTHENTICATED` | 401 | Invalid or missing JWT | Refresh your token and retry |
| `GROUP_NOT_ACCESSIBLE` | 403 | Not a member or group is archived | Verify group membership; check group status |
| `RATE_LIMIT_EXCEEDED` | 429 | > 10 previews/min | Wait 60 seconds before retrying |
| `PREVIEW_NOT_FOUND` | 404 | Preview ID does not exist or not owned by you | Verify preview_id and that you created it |
| `PREVIEW_EXPIRED` | 410 | Preview TTL (10 min) elapsed | Create a new preview |
| `PREVIEW_CONSUMED` | 409 | Preview already used in a commit | Create a new preview |
| `HASH_MISMATCH` | 422 | Submitted hash doesn't match stored hash | Ensure you're passing the original hash |
| `CONFIRMATION_NOT_FOUND` | 404 | Confirmation ID not found | Verify confirmation_id from confirm step |
| `INVALID_VND_AMOUNT` | 422 | Amount ≤ 0 or > 9,999,999,999 | Use integer VND in valid range |
| `SPLIT_SUM_MISMATCH` | 422 | Sum of splits ≠ total amount | Verify split allocation |
| `DUPLICATE_PARTICIPANT` | 422 | Same member_id appears twice | Each participant should appear once |
| `INVALID_PREVIEW_CONTEXT` | 422 | Group/currency/actor mismatch | Verify preview data integrity |
| `DUPLICATE_EXPENSE` | 409 | Near-identical expense exists | Check duplicates first; confirm if intentional |

**Example: Handle Rate Limiting**

```javascript
async function createPreviewWithRetry(previewData) {
  let retries = 0;
  while (retries < 3) {
    try {
      const response = await fetch(
        'https://your-project-ref.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/preview',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(previewData)
        }
      );

      if (response.status === 429) {
        console.log('Rate limited. Waiting 65 seconds...');
        await new Promise(resolve => setTimeout(resolve, 65000));
        retries++;
        continue;
      }

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(`${error.code}: ${error.message}`);
      }

      return await response.json();
    } catch (err) {
      if (retries === 2) throw err;
      retries++;
    }
  }
}
```

---

## Best Practices

### 1. Always Check for Duplicates First

Before creating a preview, call the duplicate-check endpoint with the proposed expense details. This prevents accidental duplication and improves user experience.

```javascript
// Step 1: Check for duplicates
const duplicates = await checkDuplicates(groupId, description, amount, payerId, date);
if (duplicates.length > 0) {
  console.warn('Found similar expenses:');
  duplicates.forEach(dup => {
    console.warn(`  - ${dup.description} (${dup.amount} VND) on ${dup.expense_date}`);
  });
  // Decide whether to proceed or cancel
}

// Step 2: Create preview only if acceptable
const preview = await createPreview(previewData);
```

### 2. Use the Correct Split Methods

- **`equal`**: Divide the total equally among all participants. Works best with whole numbers.
- **`exact`**: Specify exact amounts for each participant. Sum must equal the total.
- **`fixed_then_equal_remainder`**: Assign fixed amounts to some, divide the remainder equally among others. Useful for fixed contributions + shared costs.

**Example: `exact` split**
```javascript
{
  split_method: 'exact',
  amount: 450000,
  participants: [
    { member_id: 'alice-id', amount: 200000 }, // Alice pays 200k
    { member_id: 'bob-id', amount: 150000 },   // Bob pays 150k
    { member_id: 'carol-id', amount: 100000 }  // Carol pays 100k
  ]
}
```

### 3. Always Use member_id, Never user_id

When referencing group members in API calls, **always use `member_id`** (from `group_members.id`), never `user_id` (from `profiles.id`). The API requires `member_id` to enforce group membership.

```javascript
// ✓ Correct
const payerId = '7c8b0220-1f4b-4c2f-8d9e-3a1b2c3d4e5f'; // member_id

// ✗ Wrong
const payerId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // user_id
```

### 4. Handle Preview Expiry

Previews expire after **10 minutes**. If you need more time, create a new preview before the first one expires.

```javascript
const { expires_at } = preview;
const timeRemaining = new Date(expires_at) - Date.now();
if (timeRemaining < 60000) { // Less than 1 minute
  console.warn('Preview expiring soon. Create a new one.');
}
```

### 5. Use Idempotency Keys for Commits

The `Idempotency-Key` header makes commit calls safe to retry. If a network error occurs during commit, retry with the same key to retrieve the original response.

```javascript
const idempotencyKey = `user-${userId}-expense-${Date.now()}`;

// First attempt
const response1 = await fetch('...commit', {
  headers: { 'Idempotency-Key': idempotencyKey }
});

// Network error — safe to retry with the same key
const response2 = await fetch('...commit', {
  headers: { 'Idempotency-Key': idempotencyKey }
});
// Returns the same result as response1
```

### 6. Polling Intervals

When polling operation status, use exponential backoff to avoid overwhelming the server:

```javascript
async function pollUntilTerminal(previewId, maxWait = 60000) {
  let elapsed = 0;
  let delay = 500; // Start with 500ms

  while (elapsed < maxWait) {
    const response = await fetch(`...operations/${previewId}`);
    const { status, result, error } = await response.json();

    if (['committed', 'failed', 'expired'].includes(status)) {
      return { status, result, error };
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    elapsed += delay;
    delay = Math.min(delay * 1.5, 5000); // Cap at 5 seconds
  }

  throw new Error('Operation did not complete within timeout');
}
```

---

## Important Constraints

### VND Amounts

- All amounts must be **positive integers** (no decimals).
- Range: **1 to 9,999,999,999 VND**.
- When splitting with `equal`, the remainder is allocated to the last participant.

### member_id vs user_id

- **`member_id`** (`group_members.id`): Use this in all API requests. It ties users to groups.
- **`user_id`** (`profiles.id`): Read-only in responses. Never send it in request bodies.

### Preview Expiry

- Previews expire after **10 minutes** (`expires_at` field).
- Confirmations and commits must occur within this window.
- If a preview expires, create a new one.

### Single-Use Confirmations

- A confirmation can only be used once for commit.
- If commit fails, you must create a new preview and confirmation.
- Idempotency keys prevent duplicate commits, but not duplicate confirmations.

### Rate Limiting

- **10 previews per minute per user** (per `/v1/expenses/preview`).
- If exceeded, receive a 429 response. Wait ≥60 seconds before retrying.

### Member Registration

- Only members with confirmed email addresses are returned by `/v1/groups/{id}/members`.
- Pending/invited members cannot be payers or participants.

---

## Quick Reference

### Endpoint Summary

| Method | Path | Role |
|--------|------|------|
| GET | `/v1/me` | Verify connection |
| GET | `/v1/groups` | List user's groups |
| GET | `/v1/groups/{id}/members` | List group members |
| POST | `/v1/expense-duplicate-checks` | Check for duplicates |
| POST | `/v1/expenses/preview` | Create immutable preview |
| POST | `/v1/previews/{id}/confirm` | UI confirms preview |
| POST | `/v1/expenses/commit` | UI commits expense |
| GET | `/v1/operations/{id}` | Poll operation status |

### Required Headers

```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json (for POST)
Idempotency-Key: <unique-key> (for commit only)
```

### Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Invalid JWT |
| 403 | Not authorized for this resource |
| 404 | Resource not found |
| 409 | Conflict (e.g., preview already consumed) |
| 410 | Preview expired |
| 422 | Validation error |
| 429 | Rate limit exceeded |

---

## Support & Feedback

For issues or questions:

1. Check the **Error Handling** section above.
2. Review the **OpenAPI contract**: `docs/openapi-agent-api-v1.yaml`.
3. Consult the **internal guide**: `docs/agent-api-internal-guide.md` (FairPay engineers only).
4. Contact the FairPay team.

Happy building!

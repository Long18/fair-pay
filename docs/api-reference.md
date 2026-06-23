# FairPay Agent API v1 — API Reference

**Version:** 1.0.0  
**Base URL:** `https://{project_ref}.supabase.co/functions/v1/fairpay-agent-api`  
**Status:** Internal-only (Phase 1A)

> **For engineers only.** The Agent API enables AI-driven clients to create group expenses on behalf of authenticated users through a strict preview → confirm → commit flow with immutable server-side previews, single-use confirmations, and idempotent commits.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Concepts](#common-concepts)
3. [Rate Limits](#rate-limits)
4. [API Endpoints](#api-endpoints)
5. [Error Codes & Handling](#error-codes--handling)
6. [Operation Lifecycle](#operation-lifecycle)
7. [Split Methods](#split-methods)

---

## Authentication

All requests require a valid Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

The actor identity is **always** read from the JWT claim `sub` (user ID). Request bodies never include `user_id`, `actor_user_id`, or any user identity field — these are rejected.

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/me
```

---

## Common Concepts

### VND Amounts

All monetary values are **integer Vietnamese Dong (VND)** with no decimals.

- **Valid range:** 0 to 9,999,999,999
- **Precision:** Whole numbers only (no cents/divisions)
- **Example:** 150,000 VND is represented as `150000`

### Member ID vs User ID

- **`member_id`** (UUID): `group_members.id` — identifies a person's membership in a specific group. Use this in all request bodies (payer, participants).
- **`user_id`** (UUID): `profiles.id` — identifies a person globally. Appears in responses for reference but never in requests.

**Critical:** Always use `member_id` when specifying payers and participants. Confusing these will cause `PARTICIPANT_CHANGED` or `PAYER_CHANGED` errors.

### Timestamps

- **ISO 8601 format:** `2026-06-23T14:30:00Z`
- **Date strings:** `YYYY-MM-DD` (e.g., `2026-06-23`)

### UUID

All IDs use the UUID v4 format: `550e8400-e29b-41d4-a716-446655440000`

### Expense Categories

Valid expense categories (optional):
- `Food & Drink`
- `Transportation`
- `Accommodation`
- `Entertainment`
- `Shopping`
- `Utilities`
- `Healthcare`
- `Education`
- `Other`

---

## Rate Limits

**Preview creation is rate-limited to 10 previews per minute per authenticated user.**

When the limit is exceeded, the endpoint returns HTTP 429 with error code `RATE_LIMIT_EXCEEDED`.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "10 previews per minute exceeded for this user"
  }
}
```

**Recommendation:** Implement exponential backoff; retry after 60 seconds.

---

## API Endpoints

### 1. GET /v1/me

Get the authenticated user's profile.

**Method:** `GET`  
**Path:** `/v1/me`  
**Auth:** Required

#### Response

**HTTP 200** — OK

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "full_name": "Alice Chen",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `user.id` | UUID | User's unique ID |
| `user.email` | string | Email address |
| `user.full_name` | string | Full name |
| `user.avatar_url` | string \| null | Profile photo URL or null |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |

#### Example

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/me
```

---

### 2. GET /v1/groups

List the authenticated user's non-archived groups.

**Method:** `GET`  
**Path:** `/v1/groups`  
**Auth:** Required

#### Response

**HTTP 200** — OK

```json
{
  "groups": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Vietnam Trip 2026",
      "description": "Summer vacation expenses",
      "is_archived": false,
      "member_count": 4,
      "member_role": "admin"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "House Rent",
      "description": null,
      "is_archived": false,
      "member_count": 2,
      "member_role": "member"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `groups[].id` | UUID | Group ID |
| `groups[].name` | string | Group name |
| `groups[].description` | string \| null | Optional description |
| `groups[].is_archived` | boolean | Archive status |
| `groups[].member_count` | integer | Number of registered members |
| `groups[].member_role` | `"admin"` \| `"member"` | Your role in this group |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |

#### Example

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/groups
```

---

### 3. GET /v1/groups/{group_id}/members

List all registered members of a group.

**Method:** `GET`  
**Path:** `/v1/groups/{group_id}/members`  
**Auth:** Required

#### Parameters

| Name | In | Type | Required | Description |
|------|----|----|----------|-------------|
| `group_id` | path | UUID | Yes | Group ID |

#### Response

**HTTP 200** — OK

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "members": [
    {
      "member_id": "550e8400-e29b-41d4-a716-446655440010",
      "user_id": "550e8400-e29b-41d4-a716-446655440100",
      "role": "admin",
      "full_name": "Alice Chen",
      "email": "alice@example.com",
      "avatar_url": "https://example.com/alice.jpg"
    },
    {
      "member_id": "550e8400-e29b-41d4-a716-446655440011",
      "user_id": "550e8400-e29b-41d4-a716-446655440101",
      "role": "member",
      "full_name": "Bob Smith",
      "email": "bob@example.com",
      "avatar_url": null
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `group_id` | UUID | The requested group ID |
| `members[].member_id` | UUID | **Use this** for payer/participant references |
| `members[].user_id` | UUID | User's global ID (reference only) |
| `members[].role` | `"admin"` \| `"member"` | Role in the group |
| `members[].full_name` | string | Member's name |
| `members[].email` | string \| null | Email or null |
| `members[].avatar_url` | string \| null | Profile photo or null |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `GROUP_NOT_ACCESSIBLE` | Not a member of this group or group is archived |
| 404 | `PREVIEW_NOT_FOUND` | Group not found |

#### Example

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/groups/550e8400-e29b-41d4-a716-446655440001/members"
```

---

### 4. POST /v1/expense-duplicate-checks

Check for likely duplicate expenses before creating a preview.

**Method:** `POST`  
**Path:** `/v1/expense-duplicate-checks`  
**Auth:** Required

#### Request Body

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Lunch at The Pizza Place",
  "amount": 450000,
  "payer_member_id": "550e8400-e29b-41d4-a716-446655440010",
  "expense_date": "2026-06-23",
  "window_hours": 24
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | UUID | Yes | Group ID |
| `description` | string | Yes | Expense description (1–200 chars) |
| `amount` | integer | Yes | VND amount (positive) |
| `payer_member_id` | UUID | Yes | Member ID of payer |
| `expense_date` | string | No | Date in `YYYY-MM-DD` format (defaults to today) |
| `window_hours` | integer | No | Search window in hours (1–168, default 24) |

#### Response

**HTTP 200** — OK

```json
{
  "matches": [
    {
      "expense_id": "550e8400-e29b-41d4-a716-446655440020",
      "match_type": "strong",
      "reason": "Identical description and amount within 2 hours",
      "description": "Lunch at The Pizza Place",
      "amount": 450000,
      "expense_date": "2026-06-23",
      "created_at": "2026-06-23T12:00:00Z"
    },
    {
      "expense_id": "550e8400-e29b-41d4-a716-446655440021",
      "match_type": "likely",
      "reason": "Similar description and nearby amount",
      "description": "Pizza lunch",
      "amount": 455000,
      "expense_date": "2026-06-23",
      "created_at": "2026-06-23T11:55:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `matches[].expense_id` | UUID | Existing expense ID |
| `matches[].match_type` | `"strong"` \| `"likely"` | Confidence level |
| `matches[].reason` | string | Why this is a match |
| `matches[].description` | string | Matched expense description |
| `matches[].amount` | integer | VND amount |
| `matches[].expense_date` | string | Expense date |
| `matches[].created_at` | ISO 8601 | When the expense was created |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 422 | `INVALID_VND_AMOUNT` | Amount invalid |
| 422 | `HASH_MISMATCH` | Request validation failed |

#### Example

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "550e8400-e29b-41d4-a716-446655440001",
    "description": "Lunch at The Pizza Place",
    "amount": 450000,
    "payer_member_id": "550e8400-e29b-41d4-a716-446655440010",
    "expense_date": "2026-06-23",
    "window_hours": 24
  }' \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/expense-duplicate-checks
```

---

### 5. POST /v1/expenses/preview

Create an immutable expense preview. This validates the request, allocates splits, checks for duplicates, and stores an immutable preview server-side.

**Method:** `POST`  
**Path:** `/v1/expenses/preview`  
**Auth:** Required

#### Request Body

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Vietnam trip accommodation",
  "amount": 3000000,
  "currency": "VND",
  "category": "Accommodation",
  "expense_date": "2026-06-23",
  "comment": "3 nights at the beach resort",
  "payer_member_id": "550e8400-e29b-41d4-a716-446655440010",
  "split_method": "equal",
  "participants": [
    {
      "member_id": "550e8400-e29b-41d4-a716-446655440010"
    },
    {
      "member_id": "550e8400-e29b-41d4-a716-446655440011"
    },
    {
      "member_id": "550e8400-e29b-41d4-a716-446655440012"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | UUID | Yes | Group ID |
| `description` | string | Yes | Expense title (1–200 chars) |
| `amount` | integer | Yes | Total VND amount (positive) |
| `currency` | string | No | Currency code; only `"VND"` supported (default: `"VND"`) |
| `category` | string | No | Expense category (see Common Concepts) |
| `expense_date` | string | No | Date in `YYYY-MM-DD` format (defaults to today) |
| `comment` | string | No | Additional notes (max 1000 chars) |
| `payer_member_id` | UUID | Yes | Member ID who paid |
| `split_method` | string | Yes | `"equal"`, `"exact"`, or `"fixed_then_equal_remainder"` |
| `participants[].member_id` | UUID | Yes | Participant member ID |
| `participants[].amount` | integer | Conditional | Required for `"exact"` split method |
| `participants[].fixed_amount` | integer | Conditional | Required for `"fixed_then_equal_remainder"` method |

#### Response

**HTTP 200** — OK

```json
{
  "preview_id": "550e8400-e29b-41d4-a716-446655440030",
  "preview_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "operation_id": "550e8400-e29b-41d4-a716-446655440031",
  "expires_at": "2026-06-23T14:30:00Z",
  "preview": {
    "group_id": "550e8400-e29b-41d4-a716-446655440001",
    "group_name": "Vietnam Trip 2026",
    "description": "Vietnam trip accommodation",
    "amount": 3000000,
    "currency": "VND",
    "category": "Accommodation",
    "expense_date": "2026-06-23",
    "comment": "3 nights at the beach resort",
    "payer": {
      "member_id": "550e8400-e29b-41d4-a716-446655440010",
      "user_id": "550e8400-e29b-41d4-a716-446655440100",
      "full_name": "Alice Chen"
    },
    "requested_split_method": "equal",
    "splits": [
      {
        "member_id": "550e8400-e29b-41d4-a716-446655440010",
        "user_id": "550e8400-e29b-41d4-a716-446655440100",
        "full_name": "Alice Chen",
        "amount": 1000000
      },
      {
        "member_id": "550e8400-e29b-41d4-a716-446655440011",
        "user_id": "550e8400-e29b-41d4-a716-446655440101",
        "full_name": "Bob Smith",
        "amount": 1000000
      },
      {
        "member_id": "550e8400-e29b-41d4-a716-446655440012",
        "user_id": "550e8400-e29b-41d4-a716-446655440102",
        "full_name": "Carol Deng",
        "amount": 1000000
      }
    ],
    "total_check": 3000000
  },
  "duplicate_warnings": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `preview_id` | UUID | Unique preview identifier (use in confirm/commit) |
| `preview_hash` | string | SHA-256 hash; required for confirm/commit (64 hex chars) |
| `operation_id` | UUID | Operation tracking ID |
| `expires_at` | ISO 8601 | Preview expiration (10 minutes from creation) |
| `preview.group_id` | UUID | Group ID |
| `preview.group_name` | string | Group name |
| `preview.description` | string | Expense title |
| `preview.amount` | integer | Total VND |
| `preview.currency` | `"VND"` | Currency |
| `preview.category` | string \| null | Category (if provided) |
| `preview.expense_date` | string | Date |
| `preview.comment` | string \| null | Comment (if provided) |
| `preview.payer` | object | Payer details |
| `preview.requested_split_method` | string | Split method used |
| `preview.splits[]` | array | Array of split allocations |
| `preview.splits[].member_id` | UUID | Participant member ID |
| `preview.splits[].user_id` | UUID | Participant user ID |
| `preview.splits[].full_name` | string | Participant name |
| `preview.splits[].amount` | integer | Allocated VND amount |
| `preview.total_check` | integer | Sum of all splits (should equal `amount`) |
| `duplicate_warnings[]` | array | Likely duplicate expenses (see /expense-duplicate-checks) |

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 403 | `GROUP_NOT_ACCESSIBLE` | Not a member or group archived |
| 429 | `RATE_LIMIT_EXCEEDED` | >10 previews/minute |
| 422 | `INVALID_VND_AMOUNT` | Amount invalid |
| 422 | `SPLIT_SUM_MISMATCH` | Sum of splits ≠ total amount |
| 422 | `DUPLICATE_PARTICIPANT` | Same member_id in splits twice |
| 422 | `PARTICIPANT_CHANGED` | Member no longer valid in group |
| 422 | `PAYER_CHANGED` | Payer member_id invalid |
| 422 | `INVALID_PREVIEW_CONTEXT` | Validation failed |

#### Example

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "550e8400-e29b-41d4-a716-446655440001",
    "description": "Vietnam trip accommodation",
    "amount": 3000000,
    "currency": "VND",
    "category": "Accommodation",
    "expense_date": "2026-06-23",
    "comment": "3 nights at the beach resort",
    "payer_member_id": "550e8400-e29b-41d4-a716-446655440010",
    "split_method": "equal",
    "participants": [
      {"member_id": "550e8400-e29b-41d4-a716-446655440010"},
      {"member_id": "550e8400-e29b-41d4-a716-446655440011"},
      {"member_id": "550e8400-e29b-41d4-a716-446655440012"}
    ]
  }' \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/preview
```

---

### 6. GET /v1/operations/{preview_id}

Poll the status of an agent operation.

**Method:** `GET`  
**Path:** `/v1/operations/{preview_id}`  
**Auth:** Required

#### Parameters

| Name | In | Type | Required | Description |
|------|----|----|----------|-------------|
| `preview_id` | path | UUID | Yes | Preview ID |

#### Response

**HTTP 200** — OK

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440031",
  "preview_id": "550e8400-e29b-41d4-a716-446655440030",
  "status": "committed",
  "result": null,
  "error": null,
  "created_at": "2026-06-23T14:20:00Z",
  "updated_at": "2026-06-23T14:25:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `operation_id` | UUID | Operation ID |
| `preview_id` | UUID \| null | Associated preview ID |
| `status` | string | Current status (see Operation Lifecycle) |
| `result` | object \| null | Result data (populated on success) |
| `error` | object \| null | Error details if failed |
| `created_at` | ISO 8601 | Operation creation time |
| `updated_at` | ISO 8601 | Last update time |

**Status values:**
- `pending` — Initial state
- `previewed` — Preview created
- `confirmed` — Confirmed by user
- `committed` — Committed to database
- `failed` — Error occurred (terminal)
- `expired` — Preview expired (terminal)

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `PREVIEW_NOT_FOUND` | Operation not found |

#### Example

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/operations/550e8400-e29b-41d4-a716-446655440030"
```

---

## Error Codes & Handling

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### Full Error Code Reference

| Code | HTTP | Description | Action |
|------|------|-------------|--------|
| `UNAUTHENTICATED` | 401 | No valid JWT provided | Refresh token or sign in again |
| `ADMIN_REQUIRED` | 403 | Caller is not an admin | Use an admin account |
| `RATE_LIMIT_EXCEEDED` | 429 | >10 previews/minute per user | Wait 60 seconds; use exponential backoff |
| `GROUP_NOT_ACCESSIBLE` | 403 | Not a member or group archived | Verify group membership or unarchive |
| `PREVIEW_NOT_FOUND` | 404 | Preview ID not found or wrong owner | Verify preview_id |
| `PREVIEW_IMMUTABLE` | 422 | Attempted to mutate canonical preview | Previews are immutable after creation |
| `PREVIEW_CONSUMED` | 409 | Preview already used in a commit | Create a new preview |
| `PREVIEW_EXPIRED` | 422 | Preview TTL (10 min) elapsed | Create a new preview |
| `HASH_MISMATCH` | 422 | Submitted hash ≠ stored hash | Re-fetch preview or send correct hash |
| `CONFIRMATION_NOT_FOUND` | 404 | Confirmation ID not found or wrong owner | Verify confirmation_id |
| `CONFIRMATION_USED` | 409 | Confirmation token already consumed | Create a new confirmation |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key, different preview/confirmation | Use unique Idempotency-Key |
| `INVALID_VND_AMOUNT` | 422 | Amount ≤0 or >9,999,999,999 | Use positive integer ≤9.999B VND |
| `SPLIT_SUM_MISMATCH` | 422 | Sum of splits ≠ total_amount | Verify split allocation adds up |
| `DUPLICATE_PARTICIPANT` | 422 | Same member_id appears twice | Remove duplicate from participants |
| `PARTICIPANT_CHANGED` | 422 | Member no longer valid in group | Refresh group members list |
| `PAYER_CHANGED` | 422 | Payer member_id invalid | Verify payer is still a group member |
| `DUPLICATE_EXPENSE` | 409 | Near-identical expense created within 24h | Confirm duplicate or adjust description/amount |
| `INVALID_PREVIEW_CONTEXT` | 422 | actor_user_id/group_id/currency mismatch | Validate all inputs |
| `INVALID_STATUS` | 422 | Unknown status in admin RPC | Use valid status values |

#### Error Handling Best Practices

1. **Rate Limit (429):** Implement exponential backoff (e.g., retry after 2s, 4s, 8s).
2. **Expired Preview (410/422):** Catch `PREVIEW_EXPIRED` and `PREVIEW_CONSUMED`; create a new preview.
3. **Participant Changes (422):** If `PARTICIPANT_CHANGED` or `PAYER_CHANGED`, re-fetch group members and retry.
4. **Network Errors:** Use the `Idempotency-Key` header on commit (see endpoint 6) to safely retry.

---

## Operation Lifecycle

The agent expense workflow follows a strict state machine:

```
┌─────────────────────────────────────────────────────────┐
│                  OPERATION CREATED                       │
│                   status: pending                        │
└────────────────────────┬────────────────────────────────┘
                         │
                    POST /preview
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           PREVIEW CREATED & STORED                       │
│               status: previewed                          │
│  (Immutable hash-locked preview, 10 min TTL)            │
└────────────────────────┬────────────────────────────────┘
                         │
                    POST /confirm
                    (UI only)
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         USER CONFIRMED WITH 1-TIME TOKEN                │
│               status: confirmed                          │
│  (One-use confirmation created, 10 min TTL)             │
└────────────────────────┬────────────────────────────────┘
                         │
                   POST /commit
                    (UI only)
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           ATOMICALLY COMMITTED ✓                         │
│               status: committed                          │
│         (Expense + splits written to DB)                │
└─────────────────────────────────────────────────────────┘

      ┌──────────────────────────────────────────┐
      │   FAILED OR EXPIRED (terminal states)     │
      │  status: failed | expired                │
      │  • Preview expires after 10 min          │
      │  • Confirmation expires after 10 min     │
      │  • Server error → failed                 │
      └──────────────────────────────────────────┘
```

**Key Points:**

- **Previews expire in 10 minutes.** If the user does not confirm within this window, the preview is marked `expired` and a new preview must be created.
- **Confirmations are single-use.** Each confirmation can only be consumed once.
- **Commits are idempotent.** Retrying with the same `Idempotency-Key` returns the original response.
- **Terminal states** (`committed`, `failed`, `expired`) end the operation. No further transitions are possible.

---

## Split Methods

The API supports three expense allocation strategies:

### 1. `equal` — Split Amount Equally

Divide the total amount equally among all participants (including the payer).

**Example:**
- Total: 3,000,000 VND
- Participants: Alice, Bob, Carol (3 people)
- Split: 1,000,000 each

**Request:**
```json
{
  "amount": 3000000,
  "split_method": "equal",
  "participants": [
    {"member_id": "alice_member_id"},
    {"member_id": "bob_member_id"},
    {"member_id": "carol_member_id"}
  ]
}
```

**Response Splits:**
```json
{
  "splits": [
    {"member_id": "alice_member_id", "amount": 1000000},
    {"member_id": "bob_member_id", "amount": 1000000},
    {"member_id": "carol_member_id", "amount": 1000000}
  ]
}
```

### 2. `exact` — Specify Exact Amounts

Each participant's share is explicitly specified. Must sum to the total.

**Example:**
- Total: 3,000,000 VND
- Alice pays 1,500,000 (50%)
- Bob pays 1,000,000 (33%)
- Carol pays 500,000 (17%)

**Request:**
```json
{
  "amount": 3000000,
  "split_method": "exact",
  "participants": [
    {"member_id": "alice_member_id", "amount": 1500000},
    {"member_id": "bob_member_id", "amount": 1000000},
    {"member_id": "carol_member_id", "amount": 500000}
  ]
}
```

**Response Splits:**
```json
{
  "splits": [
    {"member_id": "alice_member_id", "amount": 1500000},
    {"member_id": "bob_member_id", "amount": 1000000},
    {"member_id": "carol_member_id", "amount": 500000}
  ]
}
```

**Validation:**
- Sum of all `amount` fields must equal the total `amount`.
- Error `SPLIT_SUM_MISMATCH` if sums do not match.

### 3. `fixed_then_equal_remainder` — Fixed Amounts + Equal Split

Some participants pay a fixed amount; the remainder is split equally among all participants.

**Example:**
- Total: 3,000,000 VND
- Alice (payer): Fixed 1,000,000
- Bob: Remainder split
- Carol: Remainder split
- Calculation:
  - Remainder: 3,000,000 − 1,000,000 = 2,000,000
  - Bob: 1,000,000 (half)
  - Carol: 1,000,000 (half)

**Request:**
```json
{
  "amount": 3000000,
  "split_method": "fixed_then_equal_remainder",
  "participants": [
    {"member_id": "alice_member_id", "fixed_amount": 1000000},
    {"member_id": "bob_member_id"},
    {"member_id": "carol_member_id"}
  ]
}
```

**Response Splits:**
```json
{
  "splits": [
    {"member_id": "alice_member_id", "amount": 1000000},
    {"member_id": "bob_member_id", "amount": 1000000},
    {"member_id": "carol_member_id", "amount": 1000000}
  ]
}
```

**Validation:**
- Sum of `fixed_amount` must be ≤ total `amount`.
- Remainder is split equally.
- If remainder is not evenly divisible, fractional VND is not supported — ensure the math works out to whole numbers.

---

## Complete Example Workflow

### Step 1: Get Authenticated User

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/me
```

Response: User profile with ID.

### Step 2: List Groups

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/groups
```

Response: Groups; pick one with ID `group_id`.

### Step 3: Get Group Members

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/groups/$group_id/members"
```

Response: List of members. Collect `member_id` values for payer and participants.

### Step 4: Check for Duplicates (Optional)

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "'$group_id'",
    "description": "Team lunch",
    "amount": 500000,
    "payer_member_id": "'$payer_member_id'",
    "expense_date": "2026-06-23",
    "window_hours": 24
  }' \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/expense-duplicate-checks
```

Response: List of potential duplicates (empty if none).

### Step 5: Create Preview

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "'$group_id'",
    "description": "Team lunch",
    "amount": 500000,
    "currency": "VND",
    "category": "Food & Drink",
    "expense_date": "2026-06-23",
    "payer_member_id": "'$payer_member_id'",
    "split_method": "equal",
    "participants": [
      {"member_id": "'$member1'"},
      {"member_id": "'$member2'"},
      {"member_id": "'$member3'"}
    ]
  }' \
  https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/expenses/preview
```

Response: `preview_id`, `preview_hash`, rendered splits, and any duplicate warnings.

### Step 6: Poll Operation (Optional)

```bash
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-project.supabase.co/functions/v1/fairpay-agent-api/v1/operations/$preview_id"
```

Response: Operation status (should be `previewed`).

---

## Notes & Constraints

- **VND only.** Multi-currency is not supported.
- **Registered members only.** Pending email members cannot be payer or participant.
- **Preview TTL is 10 minutes** and is not configurable.
- **No external write access.** OAuth, payments, settlements, and other write flows remain out of scope.
- All timestamps are UTC (ISO 8601 format).
- Request and response bodies use UTF-8 encoding.

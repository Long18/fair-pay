# FairPay Agent API — Internal Guide

> **Scope:** This document is for FairPay engineers only. It describes the
> current Phase 1A implementation of the internal Agent API Edge Function and
> its supporting database objects.
>
> Application: `https://long-pay.vercel.app/`. The OpenAPI contract is
> `docs/openapi-agent-api-v1.yaml`. Phase 4 remains internal-only; it is not an
> externally supported developer API.

---

## Overview

The Agent API is a Supabase Edge Function (`fairpay-agent-api`) that allows
AI-driven clients to create group expenses on behalf of authenticated users.
It implements a strict **preview → confirm → commit** flow with:

- Immutable server-side previews (signed with SHA-256 hash).
- Single-use confirmations.
- Idempotent commits (safe to retry on network failure).
- Admin-only observability RPCs (`admin_list_agent_operations`,
  `admin_get_agent_operation_metrics`).

All money is **integer VND**. No other currencies are accepted.

---

## Edge Function Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/v1/me` | `handlers/me.ts` | Authenticated user profile |
| GET | `/v1/groups` | `handlers/groups.ts` | Actor's non-archived groups |
| GET | `/v1/groups/:groupId/members` | `handlers/groups.ts` | Group members (registered only) |
| POST | `/v1/expense-duplicate-checks` | `handlers/duplicate-check.ts` | Near-duplicate detection |
| POST | `/v1/expenses/preview` | `handlers/preview.ts` | Create immutable preview |
| POST | `/v1/previews/:previewId/confirm` | `handlers/confirm.ts` | FairPay UI confirms preview |
| POST | `/v1/expenses/commit` | `handlers/commit.ts` | Atomically write expense + splits |
| GET | `/v1/operations/:previewId` | `handlers/operations.ts` | Poll operation status |

### Authentication

Every route requires a valid Supabase JWT in `Authorization: Bearer <token>`.
The actor identity is always read from the JWT — clients never supply a
`user_id` or `actor_user_id` in request bodies.

---

## Database Objects

### Tables

| Table | Purpose |
|-------|---------|
| `agent_operations` | One row per agent request; tracks lifecycle status |
| `agent_previews` | Immutable canonical preview; hash-locked |
| `agent_confirmations` | Single-use confirmation tokens |
| `agent_idempotency_keys` | Deduplication for commit retries |

**All four tables have RLS enabled and `FORCE ROW LEVEL SECURITY`.**
Users can only `SELECT` their own rows. No `INSERT`/`UPDATE`/`DELETE` via
the API layer — all writes go through SECURITY DEFINER functions.

### SECURITY DEFINER Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `create_agent_expense_preview(group_id, preview_data, preview_hash, metadata)` | `authenticated` | Validates actor membership, rate-limits (10/min), creates operation + preview rows |
| `confirm_agent_preview(preview_id, preview_hash)` | `authenticated` | Issues single-use confirmation |
| `commit_agent_expense(preview_id, preview_hash, confirmation_id, idempotency_key)` | `authenticated` | Atomically writes expense + splits, marks preview consumed |
| `mark_agent_operation_terminal(preview_id, status, error_code, error_message)` | `authenticated` | Marks operation failed or expired |
| `expire_agent_previews()` | `service_role` (cron only) | Bulk-expires stale previews |
| `admin_list_agent_operations(...)` | `authenticated` + `is_admin()` | Paginated admin list — safe fields only |
| `admin_get_agent_operation_metrics(...)` | `authenticated` + `is_admin()` | Aggregate metrics |

---

## Security Model

### Sensitive Fields — Never Expose

The following fields exist in the database but **must never** reach a client
response, admin UI, log line, or error message:

| Field | Table | Why |
|-------|-------|-----|
| `preview_hash` | `agent_previews`, `agent_confirmations`, `agent_idempotency_keys` | Integrity binding used by the confirmation flow |
| `confirmation_id` | `agent_confirmations` | Single-use token; exposure enables replay |
| `idempotency_key` | `agent_idempotency_keys` | Replay-protection secret |
| `response_body` | `agent_idempotency_keys` | May contain full commit response |
| `preview_data` (raw blob) | `agent_previews` | Contains actor context; expose only an explicit scalar allowlist |

The admin RPCs enforce this at the SQL level by selecting only whitelisted
scalar summary fields. The frontend `buildDetailViewModel` helper re-enforces
the allowlist on the client side.

### Rate Limits

`create_agent_expense_preview` enforces a per-user advisory lock and rejects
requests if the user has created ≥ 10 operations in the last 60 seconds
(`RATE_LIMIT_EXCEEDED`).

### Preview Immutability

`prevent_agent_preview_mutation` is a `BEFORE UPDATE` trigger on
`agent_previews` that raises `PREVIEW_IMMUTABLE` if any of the canonical
fields (`preview_data`, `preview_hash`, `user_id`, `group_id`, `operation_id`,
`expires_at`) are changed.

---

## Operation Lifecycle

```
[created] → pending
    ↓ create_agent_expense_preview succeeds
previewed
    ↓ confirm_agent_preview succeeds
confirmed
    ↓ commit_agent_expense succeeds
committed  ✓ terminal

previewed / confirmed
    ↓ preview expires (10 min) or mark_agent_operation_terminal called
expired    ✗ terminal

any non-terminal
    ↓ mark_agent_operation_terminal with status='failed'
failed     ✗ terminal
```

---

## Admin Observability

### `/admin/agent-operations` Page

Admin-only (reuses the existing `canViewAuditLogs` capability → role = `admin`).
Backed by two RPCs:

- **`admin_list_agent_operations`** — filterable by status, user, date range,
  search (name/email). Returns at most 100 rows per call. Pagination via
  `p_limit` / `p_offset`.
- **`admin_get_agent_operation_metrics`** — returns aggregate counts, ops
  today/7d/30d, unique users, and average time-to-commit.

Both RPCs check `is_admin()` first and raise `ADMIN_REQUIRED` (SQLSTATE
`42501`) for non-admins. The `authenticated` grant means the function is
callable, but the `is_admin()` guard is the actual security boundary.

### Whitelisted Result Fields

The admin list RPC returns only these fields per row:

```
operation_id, user_id, user_full_name, user_email,
status, preview_id, group_id, group_name,
description, total_amount, currency, category, expense_date, split_method,
splits_count, payer_user_id, payer_full_name, expense_id*,
error_code, error_message,
created_at, updated_at,
preview_expires_at, preview_is_consumed,
has_confirmation, confirmation_used
```

Fields marked `*` are only populated for `committed` operations.

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHENTICATED` | 401 | No valid JWT |
| `ADMIN_REQUIRED` | 403 | RPC caller is not an admin |
| `RATE_LIMIT_EXCEEDED` | 429 | > 10 previews/min per user |
| `GROUP_NOT_ACCESSIBLE` | 403 | Not a member or group archived |
| `PREVIEW_NOT_FOUND` | 404 | Preview ID not found or wrong owner |
| `PREVIEW_IMMUTABLE` | 422 | Attempt to mutate canonical preview fields |
| `PREVIEW_CONSUMED` | 409 | Preview already used in a commit |
| `PREVIEW_EXPIRED` | 422 | Preview TTL (10 min) elapsed |
| `HASH_MISMATCH` | 422 | Submitted hash does not match stored hash |
| `CONFIRMATION_NOT_FOUND` | 404 | Confirmation ID not found or wrong owner |
| `CONFIRMATION_USED` | 409 | Confirmation token already consumed |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key with different preview/confirmation |
| `INVALID_VND_AMOUNT` | 422 | Amount ≤ 0 or > 9,999,999,999 |
| `SPLIT_SUM_MISMATCH` | 422 | Sum of splits ≠ total_amount |
| `DUPLICATE_PARTICIPANT` | 422 | Same member_id appears twice in splits |
| `PARTICIPANT_CHANGED` | 422 | member_id/user_id pair no longer valid |
| `PAYER_CHANGED` | 422 | Payer member_id/user_id pair no longer valid |
| `DUPLICATE_EXPENSE` | 409 | Near-identical expense created within 24 h |
| `INVALID_PREVIEW_CONTEXT` | 422 | actor_user_id/group_id/currency mismatch |
| `INVALID_STATUS` | 422 | Unknown status value passed to admin RPC |

---

## Caveats & Known Constraints (Phase 1A)

- **VND only.** No multi-currency support.
- **Registered members only.** `pending_email` members are excluded from
  the members endpoint and cannot be payer or participant.
- Supported split methods are `equal`, `exact`, and
  `fixed_then_equal_remainder`.
- **Preview TTL is 10 minutes** and is not configurable.
- **`expire_agent_previews()` must be called by a cron job** (service_role)
  to clean up expired previews; the web app does not trigger it automatically.
- **Admin RPCs are admin-only** (not moderator). The page reuses
  `canViewAuditLogs`, which is disabled for moderators.
- **No external write access.** External OAuth, payment recording, received
  payment, and settlement flows remain out of scope. Agents never access
  Supabase tables directly.
- Edge Function base URL:
  `https://{project-ref}.supabase.co/functions/v1/fairpay-agent-api`.

---

## File Map

```
supabase/
  functions/fairpay-agent-api/
    index.ts                       # Router
    response.ts                    # okJson / errJson helpers
    handlers/
      me.ts
      groups.ts
      preview.ts
      confirm.ts
      commit.ts
      duplicate-check.ts
      operations.ts
  migrations/
    20260622094450_agent_api_phase1a.sql        # Tables + user-facing RPCs
    20260623081229_admin_agent_operations_rpcs.sql  # Admin observability RPCs

src/modules/admin/
  pages/AdminAgentOperations.tsx   # Admin UI page
  types.ts                         # AgentOperationRow, AgentOperationMetrics, …
  access.ts                        # existing canViewAuditLogs capability
  i18n.ts                          # EN + VI translations
  components/AdminLayout.tsx       # Nav item (ZapIcon)
  __tests__/
    admin-agent-operations-rls.test.ts
    admin-agent-operations-mapping.test.ts

docs/
  openapi-agent-api-v1.yaml        # Internal OpenAPI 3.1 contract
  agent-api-internal-guide.md      # This file
```

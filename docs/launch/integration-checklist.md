# Integration Checklist for Agent Developers

Use this checklist before going to production with your FairPay Agent API integration.

---

## Setup

- [ ] Have a Supabase project with FairPay deployed
- [ ] Can obtain valid user JWT via Supabase Auth (email/password or OAuth)
- [ ] Base URL confirmed: `https://{project_ref}.supabase.co/functions/v1/fairpay-agent-api`
- [ ] `GET /v1/me` returns your user profile (connection verified)

---

## Implementation

### Identity & Auth
- [ ] Using `Authorization: Bearer <token>` header on every request
- [ ] Token is a Supabase JWT for the user the agent represents
- [ ] **NOT** passing `user_id` or `actor_user_id` in request bodies (identity comes from JWT only)
- [ ] Token refresh mechanism in place for long-running agents

### Member IDs (most common mistake)
- [ ] Using `member_id` from `GET /v1/groups/{id}/members` for `payer_member_id` and `participants[].member_id`
- [ ] **NOT** using `user_id` (profiles.id) where `member_id` (group_members.id) is expected
- [ ] Fetching fresh member list before each preview (member_ids can change if someone leaves/rejoins)

### Amounts
- [ ] All monetary amounts are **integer VND** (no decimals, no floats)
- [ ] Example: ₫450,000 → `450000`, not `450000.0` or `"450000"`
- [ ] `total_amount` matches the sum of `participants[].amount` for `exact` splits

### Duplicate Detection
- [ ] Calling `POST /v1/expense-duplicate-checks` before creating a preview
- [ ] Handling `strong` and `likely` match types differently (block vs warn)
- [ ] Passing `window_hours` appropriate to your use case (default: 24h)

### Preview Creation
- [ ] Description is meaningful and under 200 characters
- [ ] `expense_date` is in `YYYY-MM-DD` format
- [ ] Handling `429 RATE_LIMIT_EXCEEDED` with backoff (limit: 10/min per user)
- [ ] Storing `preview_id` and `operation_id` from the response for polling

### Operation Polling
- [ ] Polling `GET /v1/operations/{preview_id}` after preview creation
- [ ] Using 5–10 second intervals (not faster — this is human-paced)
- [ ] Handling all terminal states: `committed` ✅, `failed` ❌, `expired` ❌
- [ ] Maximum poll duration: 15 minutes (preview TTL is 10 min)
- [ ] **NOT** attempting to call `/confirm` or `/commit` (UI-only endpoints)

### Error Handling
- [ ] Parsing `error.code` from error responses (not just HTTP status)
- [ ] Handling `PREVIEW_EXPIRED` gracefully (re-create preview if user wants to retry)
- [ ] Surfacing meaningful errors to users (e.g., "Duplicate expense detected")
- [ ] Logging errors for debugging (never log full JWT)

---

## User Experience

- [ ] Clearly communicating to the user: "Preview created — please confirm in FairPay app"
- [ ] Showing the preview details (amount, group, participants) before user confirms
- [ ] Notifying user when operation commits (polling complete)
- [ ] Handling expiry gracefully: "Preview expired — recreate?" prompt

---

## Testing

- [ ] Tested with a real group that has 2+ registered members
- [ ] Tested `equal` split: amount divides correctly across N members
- [ ] Tested `exact` split: participant amounts sum to `total_amount`
- [ ] Tested `fixed_then_equal_remainder`: fixed members + equal split for rest
- [ ] Tested duplicate detection: submitting same expense twice within 24h
- [ ] Tested rate limit: confirmed 429 handling with backoff
- [ ] Tested expired preview: waited 10+ min without confirming
- [ ] Tested invalid `member_id`: confirmed 422 with clear error code

---

## Production Readiness

- [ ] No hardcoded UUIDs, group IDs, or member IDs
- [ ] Environment variables for `FAIRPAY_BASE_URL` and token source
- [ ] Retry logic for network failures (GETs are safe to retry; POSTs are not idempotent except via duplicate check)
- [ ] Monitoring/alerting on error rate from your integration
- [ ] Dependency on `@fairpay/agent-sdk` pinned to exact version (`1.0.0`, not `^1.0.0`)
- [ ] Tested in staging environment before deploying to production

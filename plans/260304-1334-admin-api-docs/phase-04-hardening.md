# Phase 04 — Feature Flag + Hardening

**Status**: 🔲 Pending | **Priority**: Medium

## Context links
- Main plan: [plan.md](./plan.md)

## Implementation Steps

### Step 4.1 — Feature flag
Wrap page behind `import.meta.env.VITE_ENABLE_ADMIN_API_DOCS !== 'false'`.
Default: enabled (omitting the var = enabled).

### Step 4.2 — Timeout
Wrap all executions in 30s timeout via `AbortController`.

### Step 4.3 — Error normalization
Catch network errors, parse errors, timeout → uniform `ApiExecutionResult.error` string.

### Step 4.4 — Payload limit
Response viewer shows first 1MB, offers raw download link for larger.

### Step 4.5 — Audit logging
On proxy execution: insert into `audit_logs` table via supabase admin client with action_type `admin_api_console_execute`.

### Step 4.6 — Type check
Run `pnpm type-check` (tsc --noEmit) and fix all errors.

## Todo
- [ ] Add feature flag guard
- [ ] Add execution timeout
- [ ] Normalize errors
- [ ] Implement payload truncation
- [ ] Add audit log on proxy
- [ ] Run type-check, fix errors

# Phase 03 — Try It Out Engine + Proxy

**Status**: 🔲 Pending | **Priority**: High

## Context links
- Main plan: [plan.md](./plan.md)
- Vercel route pattern: `api/debt/all-users-summary.ts`
- Admin guard: `src/modules/admin/hooks/use-is-admin.ts`

## Execution modes
| Mode | Transport | When |
|------|-----------|------|
| `direct_http` | frontend fetch | Vercel routes `/api/*` |
| `direct_rpc` | supabaseClient.rpc | RPC + anon/authenticated |
| `proxy_admin` | POST /api/admin/api-console/execute | privileged / service_role |
| `disabled` | — | no grant path |

## Implementation Steps

### Step 3.1 — `api/admin/api-console/execute.ts`
Secure proxy endpoint:
1. Validate Supabase JWT from `Authorization` header
2. Call `is_admin()` RPC — reject if false
3. Validate `operation_id` against allowlist (catalog ids)
4. Validate target host (own domain / supabase project URL only)
5. Execute and return `{ success, status, duration_ms, data, error, request_echo }`
6. Redact secrets from echoed headers

### Step 3.2 — Execution engine hook `use-api-execution.ts`
```ts
function useApiExecution(): { execute, result, isLoading, history }
```
- `direct_http`: `fetch(target, { method, headers, body })`
- `direct_rpc`: `supabaseClient.rpc(function_name, rpc_args)`
- `proxy_admin`: `fetch('/api/admin/api-console/execute', { method: 'POST', body: JSON })`

### Step 3.3 — Mutation safety gate
Global `mutationModeEnabled` boolean (default: false).
For `risk: 'high' | 'critical'` entries: show confirmation Dialog with typed phrase `EXECUTE`.

### Step 3.4 — Request editor
- HTTP: query params KV editor + headers KV editor + body textarea (JSON)
- RPC: JSON args editor (textarea with parse validation)

### Step 3.5 — Response viewer
- Status code badge + duration chip
- JSON body with syntax highlight (pre/code block)
- Copy button
- Truncate at 1MB, offer "Show raw" link

### Step 3.6 — Execution history
Session-state array (max 20), shown in collapsible timeline.

## Security Considerations
- Never forward `service_role` key to frontend
- Allowlist enforcement on proxy (defense in depth)
- Host restriction: only `*.vercel.app`, `*.supabase.co`, and project domain

## Todo
- [ ] Create proxy endpoint
- [ ] Create use-api-execution hook
- [ ] Add mutation safety gate
- [ ] Build request editor UI
- [ ] Build response viewer
- [ ] Add execution history panel

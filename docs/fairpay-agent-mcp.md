# FairPay Agent MCP — Phase 2 / Phase 3

FairPay exposes a stateless Streamable HTTP MCP endpoint at:

```text
https://<project-ref>.supabase.co/functions/v1/fairpay-agent-mcp
```

Every request requires the current user's Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2025-11-25
```

The protocol-version header is omitted only from the initial `initialize` request.
The server does not create MCP sessions or SSE streams; `GET` and `DELETE` return HTTP 405.

## Transport hardening

| Control | Behavior |
|---------|----------|
| **Auth** | `Authorization: Bearer <user JWT>` required; forwarded to `fairpay-agent-api` (RLS-scoped). Uses `SUPABASE_ANON_KEY` as gateway `apikey` only — no service-role shortcut on this path. |
| **CORS** | Browser `Origin` must be production, localhost dev, or `APP_URL`. Requests with no `Origin` header (CLI / server clients) are allowed. |
| **Body size** | Requests larger than 64 KiB return HTTP 413. |
| **Accept** | Must include both `application/json` and `text/event-stream`. |
| **Protocol** | Non-`initialize` requests require `MCP-Protocol-Version` in the supported set (`2025-11-25`, `2025-06-18`). |
| **Audit** | Nested Agent API calls send `x-fairpay-agent-source: internal_mcp`. |

## Defense in depth (preview writes)

Preview gates are enforced in three places so in-app and raw MCP clients cannot bypass them:

1. **Edge executor** (`validatePreviewPreflight` in `tools.ts`) — blocks Agent API preview unless `actor_confirmed=true` and `transaction_type=group`; strips workflow fields before POST.
2. **In-app orchestrator** — mirrors the same gates, blocks duplicate previews while one is pending, and validates ambiguous `member_id` selections client-side.
3. **McpClient** — `FORBIDDEN_MCP_TOOLS` hard-blocks confirm/commit/settle/payment spellings before any HTTP call.

The `initialize` response includes server `instructions` reminding clients that tool output is untrusted data, not instructions.

## Consumers

| Consumer | Path | Notes |
|----------|------|--------|
| **In-app AI chat (Phase 3)** | `src/modules/ai-chat/orchestrator/McpClient` via `FairPayChatOrchestrator` | Primary product path. Uses the signed-in user’s JWT. Orchestrator + MCP both enforce preview preflight (`actor_confirmed`, `transaction_type=group`). Static architecture / REA: [ai-chat-rea-investigation.md](./ai-chat-rea-investigation.md). |
| **Raw MCP clients** | Direct HTTP to the Edge Function | Same JWT + Accept + protocol headers. Must not assume Cursor IDE MCP config. |
| **Cursor IDE MCP** | **Not supported** | FairPay MCP is session-JWT-bound. Project [`.mcp.json`](../.mcp.json) configures **AgentMemory only** (local agent memory tooling) — it is not the FairPay product MCP. |

## Tool boundary

Available tools:

- `fairpay_get_me`
- `fairpay_list_groups`
- `fairpay_list_group_members`
- `fairpay_resolve_expense_context`
- `fairpay_check_expense_duplicates`
- `fairpay_preview_expense`
- `fairpay_get_operation`

There are intentionally no tools for confirmation, commit, payment, received payment,
settlement, raw SQL, or table access. `fairpay_preview_expense` only creates an immutable
preview. A user must open FairPay and confirm the server-rendered preview before the REST
API can commit it.

In-app chat (WebLLM) also uses legacy read tools (`get_debt_summary`, `get_debt_details`,
`get_group_details`, `get_expenses`) via the `ai-chat` Edge Function. Settle and personal
expense creation are guided via UI deep-links only — never agent-executed.

The in-app client also hard-blocks forbidden names in `FORBIDDEN_MCP_TOOLS`
(`src/modules/ai-chat/orchestrator/mcp-client.ts`).

`fairpay_resolve_expense_context` is read-only. Use it before previewing to confirm the
actor, group-vs-personal scope, target group, payer, and participants. It never returns
`ready` without a resolved payer and at least one resolved participant list.
Personal/1-on-1 agent-created transactions remain unsupported in this tool set.

`fairpay_preview_expense` requires `actor_confirmed: true` and `transaction_type: "group"`.
Those workflow fields are stripped before the Agent API preview call.

`member_id` always means `group_members.id`, never `profiles.id`.

## Example initialization

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {},
    "clientInfo": { "name": "fairpay-internal-agent", "version": "1.0.0" }
  }
}
```

## Authentication scope

Phase 2 remains internal-agent only. It reuses the active Supabase session JWT and RLS
identity from Phase 1A. External OAuth clients and external financial writes remain out
of scope.

## Tests

```bash
pnpm test:mcp
```

Runs `tests/agent-mcp/` (protocol + tool executor) and `tests/ai-chat/mcp-client.test.ts`.

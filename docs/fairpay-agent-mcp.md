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
The server does not create MCP sessions or SSE streams; `GET` returns HTTP 405.

## Consumers

| Consumer | Path | Notes |
|----------|------|--------|
| **In-app AI chat (Phase 3)** | `src/modules/ai-chat/orchestrator/McpClient` via `FairPayChatOrchestrator` | Primary product path. Uses the signed-in user’s JWT. Orchestrator + MCP both enforce preview preflight (`actor_confirmed`, `transaction_type=group`). |
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

# FairPay Agent MCP — Phase 2

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

`fairpay_resolve_expense_context` is read-only. Use it before previewing to confirm the
actor, group-vs-personal scope, target group, payer, and participants. Personal/1-on-1
agent-created transactions remain unsupported in this tool set.

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

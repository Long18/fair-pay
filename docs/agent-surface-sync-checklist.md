# Agent surface sync checklist (M5 — Hybrid)

When changing FairPay agent tooling, keep these surfaces aligned.

**Default:** use this checklist in the PR description.  
**CI (later / path-scoped):** fail PRs that touch `supabase/functions/fairpay-agent-*`, OpenAPI under `docs/openapi*`, or in-app MCP tool defs without sync evidence.

## Surfaces

| Surface | Paths |
|---------|--------|
| Agent API | `supabase/functions/fairpay-agent-api/` |
| Agent MCP | `supabase/functions/fairpay-agent-mcp/` (+ `MCP_TOOLS`) |
| In-app MCP client | `src/modules/ai-chat/orchestrator/mcp-client.ts`, `tool-definitions.ts` |
| System prompt | `src/modules/ai-chat/orchestrator/system-prompt.ts` |
| External agent | `supabase/functions/fairpay-external-agent-api/`, `docs/openapi-external-agent-chatgpt.yaml` |
| Public OpenAPI copy | `pnpm openapi:sync` → `public/.well-known/openai.yaml` |

## Checklist (paste into PR)

- [ ] Tool / field rename updated in **all** relevant rows above
- [ ] `member_id` still means `group_members.id` (never `profiles.id`)
- [ ] No confirm / commit / settle / payment tools exposed to MCP or no-key external agents
- [ ] `pnpm test:mcp` and/or `pnpm test:agent` run for touched domain
- [ ] If OpenAPI YAML changed: `pnpm openapi:sync` (+ `pnpm openapi:lint` when schema structure changes)
- [ ] GPT instructions doc updated when ChatGPT Actions flow changes

## Owners

- MCP → `fairpay-agent-mcp` subagent
- In-app WebLLM → `fairpay-ai-chat`
- ChatGPT / no-key → `fairpay-external-agent`

# AGENTS.md — FairPay agent guide

Guidance for AI coding agents working in this repository.

## Stack

- React 19 + TypeScript, Refine v5, Vite
- Supabase (Postgres, Auth, Edge Functions, RLS)
- shadcn/ui + Tailwind
- Package manager: **pnpm** (not npm)

## Run the app

1. `pnpm install`
2. Copy env: prefer **`.env.local`** (Vite accepts `.env` too). Minimum: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. **Remote Supabase (recommended for agents):** point env at a hosted project; skip local Docker. This is the reliable cold-start path.
4. **Local Supabase (advanced):** requires Docker Desktop. Migrations alone are incomplete — core tables live in [`supabase/baseline.sql`](supabase/baseline.sql), which is **not** applied by `pnpm supabase:start`. After start/reset, apply baseline via the project sync helpers (see `supabase/scripts/sync/sync-full.sh`) or an equivalent `psql` apply, then re-run pending migrations / seed. Prefer remote env unless you need a full local DB.
5. `pnpm dev` → http://localhost:3000

Do **not** assume `pnpm supabase:start` alone yields a usable schema on a fresh machine.

## Scoped validation (preferred)

Do **not** default to `pnpm verify` or full `pnpm lint` during iteration — the full lint baseline is noisy.

For a small change:

```bash
# 1. Path-scoped tests (fast)
pnpm exec vitest run path/to/file.test.ts

# 2. Domain suites when touching those areas
pnpm test:agent          # Agent API
pnpm test:mcp            # FairPay Agent MCP + MCP client
pnpm type-check

# 3. Lint only touched files
pnpm exec eslint path/to/changed-file.ts
```

Reserve `pnpm verify` for pre-merge when explicitly requested.

## FairPay Agent MCP (product)

- Edge Function: `supabase/functions/fairpay-agent-mcp/`
- In-app client: `src/modules/ai-chat/orchestrator/mcp-client.ts`
- Docs: [docs/fairpay-agent-mcp.md](docs/fairpay-agent-mcp.md)
- Uses the **user’s Supabase JWT** (session-scoped). It is **not** configured as a Cursor IDE MCP server.
- Project [`.mcp.json`](.mcp.json) is **AgentMemory only** (local agent tooling), not the FairPay product MCP. See [`.mcp.README.md`](.mcp.README.md).
- Never expose confirm/commit/settle/payment tools to AI tool callers; confirmation stays in the FairPay UI.

## Cursor subagents

Project agents live in [`.cursor/agents/`](.cursor/agents/):

- `fairpay-agent-mcp` — MCP Edge Function, catalogs, security boundaries, MCP tests
- `fairpay-ai-chat` — In-app WebLLM chat (mlc-ai/web-llm): worker/cache, model catalog, compact/full prompts, orchestrator, preview→UI confirm
- `fairpay-external-agent` — ChatGPT Actions / no-key external agent API (not in-app WebLLM)
- `react-doctor` — React Doctor scans, `/doctor` triage, regression checks, rule explain/config

## SQL / migrations

When changing RPCs or schema, add a **new** migration under `supabase/migrations/`. Do not rewrite applied migration history in place.

## Git

Do not commit, push, amend, or skip hooks unless the user explicitly asks.

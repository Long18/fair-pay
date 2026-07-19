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
3. **Remote Supabase (default for agents):** point env at a hosted project; skip local Docker. This is the reliable cold-start path.
4. **Local Supabase (optional / advanced):** Docker Desktop required. Use one command:

   ```bash
   pnpm db:local:bootstrap
   ```

   That runs `db reset` (migrations + config.toml seeds), then applies [`supabase/baseline.sql`](supabase/baseline.sql) (core tables are **not** applied by `supabase start` / `db reset` alone). Do **not** manually re-seed afterward — seeds already ran via config. Prefer remote unless you need a full local DB.
5. `pnpm dev` → http://localhost:3000

Do **not** assume `pnpm supabase:start` or `pnpm db:reset` alone yields a usable schema.

## Do not touch without explicit approval

| Area | Why |
|------|-----|
| Production SQL / `db:push` to prod / rewriting applied migrations | Irreversible history |
| Auth RLS policies & session/JWT authorization model | Security boundary |
| Polar billing (checkout, webhooks, subscriptions) | Money / entitlements |
| Settle / payment / MoMo / confirm-commit RPCs exposed to AI tools | Confirm stays in FairPay UI |
| Rewriting `baseline.sql` as a substitute for new migrations | Reintroduces local-only DDL debt |
| Full-repo lint “cleanup” mega-PRs | Noisy baseline; prefer path-scoped |

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

# 4. After React UI changes
pnpm doctor -- --verbose --scope changed
# or: npx react-doctor@latest --verbose --scope changed
```

Reserve `pnpm verify` for pre-merge when explicitly requested.

Admin page splits target **≤800 LOC** per primary page entry file (hooks + section components).

## FairPay Agent MCP (product)

- Edge Function: `supabase/functions/fairpay-agent-mcp/`
- In-app client: `src/modules/ai-chat/orchestrator/mcp-client.ts`
- Docs: [docs/fairpay-agent-mcp.md](docs/fairpay-agent-mcp.md)
- Sync checklist: [docs/agent-surface-sync-checklist.md](docs/agent-surface-sync-checklist.md) (Hybrid: checklist by default; path-scoped CI for agent/OpenAPI later)
- Uses the **user’s Supabase JWT** (session-scoped). It is **not** configured as a Cursor IDE MCP server.
- Project [`.mcp.json`](.mcp.json) is **AgentMemory only** (local agent tooling), not the FairPay product MCP. See [`.mcp.README.md`](.mcp.README.md).
- Never expose confirm/commit/settle/payment tools to AI tool callers; confirmation stays in the FairPay UI.

## Cursor subagents

Project agents live in [`.cursor/agents/`](.cursor/agents/) (local; do not assume they are committed):

- `fairpay-agent-mcp` — MCP Edge Function, catalogs, security boundaries, MCP tests
- `fairpay-ai-chat` — In-app WebLLM chat (mlc-ai/web-llm): worker/cache, model catalog, compact/full prompts, orchestrator, preview→UI confirm
- `fairpay-external-agent` — ChatGPT Actions / no-key external agent API (not in-app WebLLM)
- `tech-debt-triage` — Readonly debt inventory / ranked backlog
- `debt-cleanup` — Scoped one-ticket cleanup executor
- `cleanup-verifier` — Skeptical post-cleanup verification
- `react-doctor` — React Doctor via skill [`.claude/skills/react-doctor/`](.claude/skills/react-doctor/) / [`.agents/skills/react-doctor/`](.agents/skills/react-doctor/) (not a `.cursor/agents` file)

## SQL / migrations

When changing RPCs or schema, add a **new** migration under `supabase/migrations/`. Do not rewrite applied migration history in place. Baseline vs migration guidance: [docs/baseline-drift-process.md](docs/baseline-drift-process.md).

Dangerous archive DB helpers are prefixed `db:archive:*` / `db:dangerous:*` in `package.json` — do not use them for normal agent workflows.

## Git

Do not commit, push, amend, or skip hooks unless the user explicitly asks.

Debt cleanup branches: `debt/<area>-<slug>`; prefer atomic scoped commits (avoid “ship full backlog” on `main`).

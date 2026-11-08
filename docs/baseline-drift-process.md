# Baseline vs migrations drift process (S4)

FairPay keeps **two** schema sources for local/advanced setups:

| Artifact | Role |
|----------|------|
| [`supabase/baseline.sql`](../supabase/baseline.sql) | Core tables/functions snapshot for cold local DBs (not applied by `supabase db reset` alone) |
| [`supabase/migrations/`](../supabase/migrations/) | Incremental, reviewable history — **source of truth for production** |

## Default agent path

Prefer **remote** Supabase (see root `AGENTS.md`). Use local only when needed:

```bash
pnpm db:local:bootstrap
```

Bootstrap script: [`scripts/local-db-bootstrap.sh`](../scripts/local-db-bootstrap.sh) (baseline → gap fill → migrations → seeds). Local-only gap SQL: [`supabase/scripts/local/ensure-baseline-gaps.sql`](../supabase/scripts/local/ensure-baseline-gaps.sql). For Cursor agents: hosted schema via Supabase MCP; local DB via CLI/`docker exec` — see [`.mcp.README.md`](../.mcp.README.md).

## When to add a migration

- Any RPC / table / RLS / grant change that must reach production
- Always: **new** file under `supabase/migrations/` — never rewrite applied history

## When to refresh `baseline.sql`

- Rare. Only after a deliberate local-parity exercise (e.g. sync tooling) when cold-start without baseline is still required
- Refresh must be reviewed like a large schema dump; prefer documenting “remote-only” over frequent baseline rewrites
- Never use baseline refresh as a substitute for a proper migration

## Never

- Put `CREATE FUNCTION` / DDL in `supabase/seed/*` (no enrich-seed DDL)
- Treat `pnpm db:reset` alone as app-ready
- Use `db:dangerous:*` / archive seed generators for normal workflows

## Related

- Seed policy: [`supabase/seed/README.md`](../supabase/seed/README.md)
- Agent sync: [`agent-surface-sync-checklist.md`](./agent-surface-sync-checklist.md)

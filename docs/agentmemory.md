# Agent Memory

FairPay is wired for [agentmemory](https://github.com/rohitg00/agentmemory), a local persistent memory service for coding agents. The setup is intentionally project-scoped and does not add a production dependency.

## What Is Configured

- `.codex/config.toml` registers the `agentmemory` MCP server for Codex-compatible sessions.
- `.mcp.json` exposes the same MCP server shape for clients that read workspace MCP config.
- `package.json` provides local helper scripts for starting and diagnosing the memory worker with slots, graph endpoints, consolidation endpoints, reflection, and context injection enabled.

The MCP shim connects to `http://localhost:3111` by default. Keep `AGENTMEMORY_SECRET` and remote URLs in user-global shell or agent config, not in this repository.
The start script runs the engine from `~/.agentmemory` so iii's `data/state_store.db` and `data/stream_store` files stay out of the FairPay worktree.

The local worker is configured for the full non-LLM surface:

- `AGENTMEMORY_SLOTS=true`
- `AGENTMEMORY_REFLECT=true`
- `GRAPH_EXTRACTION_ENABLED=true`
- `CONSOLIDATION_ENABLED=true`
- `AGENTMEMORY_INJECT_CONTEXT=true`

`AGENTMEMORY_AUTO_COMPRESS` is intentionally left off unless a real LLM provider is configured. With the default `noop` provider, Timeline, Graph, slots, semantic memory, procedures, actions, lessons, crystals, insights, routines, checkpoints, sentinels, facets, and relations can still store and serve data, but automatic graph extraction and high-quality consolidation need provider credentials.

## Commands

```bash
pnpm agentmemory:start   # foreground server; keep this running while using memory
pnpm agentmemory:status  # show health, counts, flags, and viewer URL
pnpm agentmemory:doctor  # dry-run diagnostics for missing providers/config
```

Verify the REST worker directly:

```bash
curl http://localhost:3111/agentmemory/health
curl http://localhost:3111/agentmemory/livez
```

The viewer normally opens at `http://localhost:3113`; the CLI may choose a fallback port if that port is busy.

Useful checks for the richer surfaces:

```bash
curl http://localhost:3111/agentmemory/config/flags
curl http://localhost:3111/agentmemory/sessions
curl http://localhost:3111/agentmemory/graph/stats
curl http://localhost:3111/agentmemory/semantic
curl http://localhost:3111/agentmemory/procedural
curl http://localhost:3111/agentmemory/crystals
curl http://localhost:3111/agentmemory/slots
```

## Codex Usage

The project config enables the MCP tools (`memory_save`, `memory_smart_search`, `memory_recall`, and governance/export helpers). For full automatic capture through lifecycle hooks, install the upstream Codex plugin in the agent host:

```bash
codex plugin marketplace add rohitg00/agentmemory
codex plugin install agentmemory
```

Restart the agent after changing MCP or plugin config. The upstream Codex plugin registers six hooks: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, and `Stop`.

## FairPay Memory Conventions

- Recall memory before broad changes: search for the feature area, changed files, and prior decisions.
- Save durable decisions after meaningful work: architecture choices, command caveats, recurring test failures, and repo conventions.
- Tag memories with specific concepts, for example `fairpay-supabase-rls`, `fairpay-refine`, or `agentmemory-setup`.
- Include affected file paths when saving memories so future searches rank them properly.

# FairPay AI agents — architecture vs Anthropic best practices

This doc maps [Claude Resources](https://claude.com/resources) guidance to **FairPay’s shipped design** (in-app WebLLM + single orchestrator loop + MCP tools). It is the product counterpart to [ai-chat-rea-investigation.md](./ai-chat-rea-investigation.md) and [fairpay-agent-mcp.md](./fairpay-agent-mcp.md).

**Cloud OpenAI orchestrator** is intentionally off (`PRODUCT_SHIPPED = false`); this doc does not require `OPENAI_API_KEY`.

## Single agent loop (not org-chart subagents)

Anthropic’s [Building agents: When to fold subagents into your main agent loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) recommends:

- One model, one context window, an **open-ended tool loop** with turn/cost budgets and write gates in the harness.
- **Progressive disclosure**: short tool descriptions; full schemas loaded when needed; domain procedure in skills/prompt tiers—not separate agents per team.
- **Tools grouped by user intent** (~30–50 max in prompt); preconditions enforced inside tools with plain refusals the model can read.

**FairPay alignment**

| Practice | FairPay implementation |
|----------|-------------------------|
| Single loop | `FairPayChatOrchestrator.processTurn` — up to `MAX_TOOL_ROUNDS` (10) |
| Planner without extra agents | `deterministic-planner.ts` answers reads/debt steps without LLM |
| One system prompt owner | `system-prompt.ts` — compact vs full tier by WebLLM model |
| Tools by intent | MCP: groups, resolve context, preview, reads; legacy read tools via `ai-chat` Edge |
| Write gate | No confirm/commit/settle in MCP; preview only; **UI confirms** |
| Untrusted tool data | `UNTRUSTED_DATA_MARKER` + orchestrator + MCP initialize instructions |
| Subagents for dev only | Cursor `fairpay-ai-chat` / `fairpay-agent-mcp` — **not** runtime architecture |

## Security and knowledge work

From enterprise agent patterns (Claude Resources — secure agents, financial/legal workflows):

- **Session-scoped JWT** for MCP; RLS on data path; no service-role in chat.
- **Fixed response contract**: JSON `tool_call` \| `final` (local models); normalized via `normalize-model-output.ts`.
- **Permission in tools**: preview requires `actor_confirmed` + `transaction_type=group` (Edge + orchestrator).
- **No autonomous money movement**: agent proposes; user confirms in FairPay UI.

## Latency and UX (on-device LLM)

- Default model **Hermes 3 · Llama 3.2 3B** for tool-style JSON; warn on **weak** models (`isWeakExpenseChatModel`).
- IndexedDB cache for WebLLM weights; compat fallback to TinyLlama on WebGPU limits.
- Localized errors, onboarding (WebGPU, privacy, first send), model picker badges.

## Evals and regression (what we run today)

```bash
# AI agent smoke (run before merge touching ai-chat / MCP)
pnpm exec vitest run src/lib/local-llm/__tests__/
pnpm exec vitest run src/modules/ai-chat/ tests/ai-chat/
pnpm test:mcp
pnpm type-check
```

**High-value tests added for harness budgets**

- `MAX_TOOL_ROUNDS` exhaustion → safe user message (no unbounded MCP spam).
- `chat-storage` v1 → v2 migration.
- Catalog ids ⊆ `prebuiltAppConfig` (`webllm-catalog-upstream.test.ts`).

**Backlog (next evals)**

- Golden Vietnamese expense phrases → expected first tool (`get_debt_summary` / `fairpay_list_groups`).
- Preview confirm path in `use-ai-chat` (no forbidden MCP tool names on confirm).
- Optional live Edge smoke for MCP `tools/list` + preview preflight rejections.

## When FairPay *would* add a runtime subagent

Keep separate loops only if:

1. Local WebLLM context is measurably degraded (unlikely with compact tier today), or
2. Parallel independent research with disposable context is required, or
3. Tool choice degrades with a single prompt (>50 tools — **not** our catalog size).

Until then, prefer **skills** (system prompt tiers), **tools** (MCP + legacy reads), and **deterministic planner** steps.

## Read intent registry (P0)

Declarative read queries live in [`read-intent-registry.ts`](../src/modules/ai-chat/orchestrator/read-intent-registry.ts). Each entry defines:

| Field | Purpose |
|-------|---------|
| `id` | Stable name for tests and docs |
| `priority` | When multiple patterns match, highest wins |
| `matches(text)` | Intent detection (regex + guards) |
| `toolName` / `toolArguments` | First planner round |
| `format` / `beforeFormat` | Second round after tool data |

`planReadIntentStep` is the single read planner entry; `FairPayChatOrchestrator` calls it before the expense-write `planDeterministicStep`.

**Add a new read intent:** append to `READ_INTENT_REGISTRY`, add a `matches` test in `orchestrator/__tests__/read-intent-registry.test.ts`, and extend `isPlannerOnlyUserMessage` coverage via `isReadIntentMessage`.

**Golden phrase eval:** regression table for real user / quick-action copy lives in [`read-intent-golden.test.ts`](../src/modules/ai-chat/orchestrator/__tests__/read-intent-golden.test.ts) (Vietnamese + English, i18n suggestions, negatives). After changing `matches` regex or priorities, run:

```bash
pnpm exec vitest run src/modules/ai-chat/orchestrator/__tests__/read-intent-golden.test.ts
```

**Hollow refusal recovery:** if the local model returns a generic “I don’t have information…” final JSON, `looksLikeHollowRefusal` + `guessReadIntentId` forces a read tool call instead of showing the refusal. Quick-action pill prompts in i18n are aligned to `matchReadIntent` so they stay planner-only (no WebLLM wait).

## Product coverage (honest scope)

| Area | In-app agent today |
|------|-------------------|
| Balances / who owes whom | Yes — `get_debt_summary` (planner fast path, **no WebLLM wait**) |
| Group list | Yes — `fairpay_list_groups` (planner fast path) |
| Group members, expense preview | Yes — MCP + confirm card in UI |
| Expense **comment** on new preview | Yes — `comment` field on `fairpay_preview_expense` |
| Read thread / recent expense comments | Yes — `get_expense_comments`, `get_recent_expense_comments` (legacy ai-chat, RLS) |
| Receipt **image** understanding | Yes — on-device Tesseract OCR (vie+eng) + filename fallback; not cloud vision |
| Settle / pay / Momo / settings | **No** — deep-links / manual UI only |
| Personal/loan expense create | **No** — guidance to Friends UI |

Local WebLLM does **not** expose native function-calling; the model must emit JSON `tool_call` text (Hermes 3B recommended). Planner-only questions avoid waiting on a full model download.

**Main-thread responsiveness:** WebLLM already runs in `web-llm.worker.ts`. Progress UI is throttled (~200ms); stream tokens batch per animation frame; receipt OCR uses `receipt-ocr.worker.ts`; model warm-up uses `requestIdleCallback` when available.

**Reply language:** each turn infers `vi` / `en` from the **user’s message text** (not the app UI locale), refreshes the system `LANGUAGE` block, and passes that code to deterministic formatters. UI chrome (buttons, errors) still follows i18n.

## References

- [Claude Resources — Articles](https://claude.com/resources/articles)
- [fairpay-agent-mcp.md](./fairpay-agent-mcp.md)
- [agent-surface-sync-checklist.md](./agent-surface-sync-checklist.md)
- `./scripts/rea-investigate-ai-chat.sh` / `pnpm run rea:ai-chat`

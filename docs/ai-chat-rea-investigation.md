# In-app AI chat — REA `investigate_feature` playbook

FairPay’s primary agent path is **browser WebLLM** + `FairPayChatOrchestrator` + JWT-scoped **FairPay Agent MCP**. Cloud OpenAI orchestrator remains **off** unless explicitly product-shipped (no change to `OPENAI_API_KEY` in normal work).

## Why `/rea/investigate_feature` fails in Cursor

The REA MCP prompt `investigate_feature` requires a string argument **`feature`**. The slash command often calls the prompt without it, which yields:

```text
feature: Invalid input: expected string, received undefined
```

**Fix in chat:** describe the feature in plain language in the same message, e.g.

```text
/rea/investigate_feature FairPay in-app AI: WebLLM worker, use-ai-chat, FairPayChatOrchestrator, fairpay-agent-mcp, deterministic-planner
```

If your client supports structured prompt args, pass:

```json
{ "feature": "FairPay in-app AI: WebLLM → orchestrator → MCP (group expense preview only)" }
```

## Feature map (static — verified in repo)

| Layer | Path | Role |
|-------|------|------|
| UI | `src/modules/ai-chat/` | Chat shell, model picker, preview cards |
| State | `src/modules/ai-chat/hooks/use-ai-chat.ts` | Session, storage, wires orchestrator |
| Orchestration | `src/modules/ai-chat/orchestrator/FairPayChatOrchestrator.ts` | Planner + tool rounds + JSON protocol |
| Deterministic | `src/modules/ai-chat/orchestrator/deterministic-planner.ts` | Debt/summary steps without LLM |
| MCP client | `src/modules/ai-chat/orchestrator/mcp-client.ts` | Streamable HTTP MCP, forbidden tools |
| Local LLM | `src/lib/local-llm/client.ts`, `web-llm.worker.ts` | `@mlc-ai/web-llm`, IndexedDB cache |
| Legacy reads | Edge `ai-chat` | Read tools only; writes disabled |
| MCP server | Edge `fairpay-agent-mcp` | See [fairpay-agent-mcp.md](./fairpay-agent-mcp.md) |

**Default on-device model:** `Hermes-3-Llama-3.2-3B-q4f16_1-MLC` (`src/lib/local-llm/types.ts`).  
**WebLLM package pin:** `WEB_LLM_PACKAGE_VERSION` in `webllm-app-config.ts` (must match `package.json`).

## REA tools (optional static trace)

1. **`analyze_javascript_application`** — `input_path`: repo root; **`source_paths`**: paths below; `detail`: `summary`.  
   Increase MCP client timeout if calls return `-32001 Request timed out`.

2. **`trace_application_feature`** — after (1), seed e.g. `FairPayChatOrchestrator` / `delegate_llm`.

3. **`trace_javascript_semantics`** — data-flow from the same application graph.

### Suggested `source_paths`

```text
src/modules/ai-chat/hooks/use-ai-chat.ts
src/modules/ai-chat/orchestrator/FairPayChatOrchestrator.ts
src/modules/ai-chat/orchestrator/deterministic-planner.ts
src/modules/ai-chat/orchestrator/mcp-client.ts
src/modules/ai-chat/orchestrator/system-prompt.ts
src/lib/local-llm/client.ts
src/lib/local-llm/web-llm.worker.ts
```

## Regression checks after WebLLM upgrades

```bash
pnpm exec vitest run src/lib/local-llm/__tests__/
pnpm exec vitest run tests/ai-chat/
pnpm test:mcp
```

`webllm-catalog-upstream.test.ts` asserts every picker model id exists in `prebuiltAppConfig`.

## Out of scope (unless product asks)

- `fairpay-agent-orchestrator` / `OPENAI_API_KEY` / `VITE_AI_CHAT_CLOUD_ORCHESTRATOR`
- Confirm, commit, settle, payment MCP tools

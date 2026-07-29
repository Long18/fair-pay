# Friend / loan agent preview — product track

## Current state (v1)

- In-app agent and MCP expose **group expense preview only** (`transaction_type: "group"`).
- Personal / 1-on-1 and **loan** (`is_loan` on Friends expenses) are created in the FairPay UI under **Friends**, not via `fairpay_preview_expense`.
- In-app chat now classifies `transaction_scope` (`group` | `personal` | `loan`) and routes personal/loan users to Friends with query prefill instead of forcing group MCP calls.

## Parity goal (requires approval)

To match external-agent clarity **and** in-app preview cards for loans:

1. Extend `fairpay-agent-api` with a **friend expense preview** endpoint (friendship-scoped, `is_loan` support, borrower owes 100%).
2. Add MCP tool e.g. `fairpay_preview_friend_expense` (read-preflight + preview only; confirm stays in UI).
3. Sync [docs/agent-surface-sync-checklist.md](./agent-surface-sync-checklist.md) and in-app `tool-definitions.ts`.

## Out of scope until approved

- Confirm/commit/settle/payment via agent tools (unchanged).
- Rewriting RLS or Polar billing.

## Decision log

| Date | Decision |
|------|----------|
| 2026-07-29 | Ship scope classification + Friends deep-link; defer friend/loan preview API to product approval. |

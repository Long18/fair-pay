# Debt OG Preview — Recent Activity Enrichment

**Date:** 2026-04-21
**Scope:** `api/og/debt.tsx`, `api/_lib/debt-og-data.ts`, direct-path cleanup

## Goal

When a user copies a debt link from inside FairPay (via `buildDebtShareUrl`, which always appends `viewer_id`), the OG preview should communicate the debt relationship at a glance:

- Both people (avatars + names)
- Net debt as the dominant number
- "You owe / Owes you" split as secondary context
- Up to 3 recent transactions (open first, settled fill remaining slots)

When someone pastes a raw `/debts/:id` URL (no `viewer_id`), the preview degrades to a minimal fallback with avatars only — no "View in FairPay" pill, no footer hint.

## Context

Two render paths exist in `api/og/debt.tsx`:

| Path | Trigger | Data available |
|------|---------|----------------|
| Full | `viewer_id` + `counterparty_id` | `fetchDebtOgData` → per-pair amounts + row-level transaction data |
| Direct | `counterparty_id` only | `fetchDebtOgCounterparty` → counterparty profile only |

`get_user_debt_details` (RPC) returns per-expense rows with `description`, `expense_date`, `remaining_amount`, `is_settled`, `i_owe_them`, `group_name`, `created_at` — already sorted `expense_date DESC, created_at DESC`. No schema change required.

## Design

### Full-path layout (1200×630)

Top → bottom:

1. **Header row** — BrandHeader + DebtStatusBadge (unchanged).
2. **Participants row** — two `PersonNode` avatars + `RelationshipIcon`, colored by `amountColor` (unchanged).
3. **Relationship label** — small uppercase caption (e.g. *"You owe Hoa"* / *"Hoa owes you"* / *"All settled"*) (unchanged copy, unchanged position).
4. **Net headline** (new consolidation) — single large signed amount, ~64px, colored red/green/teal. Replaces the current "Open between X and Y" headline + two-row `OpenDetailRow` + standalone net `SummaryStat`. One number, one sign, one color.
5. **Secondary split** (demoted) — one horizontal row with two tight stats: "You owe · {total_i_owe}" and "Owes you · {total_they_owe}". Muted labels, small amounts. Dropped entirely when `all_settled`.
6. **Recent activity** (new) — up to 3 rows, heading "Recent activity" in muted uppercase, each row:
   - Left: small direction dot (red if `i_owe_them`, green otherwise)
   - Center: description (truncated to ~32 chars) + `formatOgDate(expense_date)` + group name if present
   - Right: amount (`formatOgAmount(remaining_amount)` when open, `formatOgAmount(split_amount)` when settled)
   - Settled rows: entire row at `opacity: 0.5`, amount with strikethrough, direction dot switched to muted slate
7. **Footer meta** — existing `metaLine` ("N open items · last activity Apr 18") (unchanged).

### Recent-activity selection

```
let rows = debt.recent_transactions    // sorted desc by RPC
let openRows = rows.filter(r => !r.is_settled)
let settledRows = rows.filter(r => r.is_settled)
let selected = [...openRows.slice(0, 3)]
if (selected.length < 3) {
  selected.push(...settledRows.slice(0, 3 - selected.length))
}
```

Hide the entire "Recent activity" block when `selected.length === 0`.

### Data changes

Add to `DebtOgData`:

```ts
recent_transactions: Array<{
  expense_id: string
  description: string
  expense_date: string
  group_name: string | null
  remaining_amount: number     // used when !is_settled
  split_amount: number         // used when is_settled
  is_settled: boolean
  i_owe_them: boolean
}>
```

Populated inside `fetchDebtOgData` by mapping the first ~10 rows of the RPC result (cap for sanity) into this shape. No new query.

Extend `DebtDetailRow` type in `api/_lib/debt-og-data.ts` to include `group_name: string | null` and `split_amount: number | string | null` so TypeScript matches the RPC return.

Extend `sanitizeOgText` input in `api/og/debt.tsx` to include transaction descriptions and group names, so `buildFonts` subsets glyphs for them.

### Direct-path cleanup

In `api/og/debt.tsx` (lines 276–403, the `if (counterpartyId)` branch inside the `if (!viewerId || !counterpartyId)` block):

- Remove the `<SummaryStat label="Preview" value="View in FairPay" ... />` block.
- Remove the `"Share from inside FairPay to include exact open amounts"` footer div.
- Keep: BrandHeader, PillBadge, separator, PersonNode pair + RelationshipIcon, "Direct debt link" caption, "Open debt details with {name}" headline.
- Outcome: just brand + both avatars + headline. Truly minimal.

### What stays unchanged

- `api/share/debt.ts` (meta tags + redirect page)
- `middleware.ts` (bot HTML)
- `src/modules/debts/utils/share-url.ts`
- `buildDebtShareUrl` and its callers
- All existing `BrandHeader`, `PersonNode`, `RelationshipIcon`, `SummaryStat` primitives in `api/og/shared.tsx`

## Layout budget (sanity check)

Rough vertical math at 630px frame with ~48px inner padding each side:

| Block | Height |
|-------|--------|
| Header row | 56 |
| Separator + spacing | 40 |
| Participants | 120 |
| Relationship label | 28 |
| Net headline | 84 |
| Secondary split | 52 |
| Recent activity (header + 3 rows) | 28 + 3 × 40 = 148 |
| Separator + footer | 40 |
| **Total** | **568** |

Leaves ~62px margin. Tight but workable. If it overflows in practice, drop the bottom separator and tighten gaps; do not reduce to 2 recent rows — always attempt 3.

## Testing

- Visual: hit `/api/og/debt?viewer_id=X&counterparty_id=Y` locally via `vercel dev` with a known debt pair and verify:
  - 3-open case
  - 1-open-2-settled case
  - all-settled case (block hidden, amount teal)
  - counterparty with long name (truncation doesn't clip avatar)
  - description with Vietnamese diacritics (fonts subset correctly)
- Direct-path: `/api/og/debt?counterparty_id=Y` renders minimal card with no "View in FairPay" pill.
- Unit: existing `src/modules/debts/utils/__tests__/share-url.test.ts` stays green; no new tests required since this is presentational.

## Out of scope

- Internationalization of OG text (all English, consistent with `api/og/expense.tsx`).
- Showing per-transaction payer name (noise at this size).
- Changing the direct-path to fetch aggregate counterparty data across all pairs (semantically incorrect for a bilateral debt).
- Any changes to the in-app `/debts/:id` page UI.

## Open questions

None — all three clarifying questions resolved.

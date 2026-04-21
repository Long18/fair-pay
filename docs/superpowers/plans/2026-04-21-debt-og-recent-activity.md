# Debt OG Recent-Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the debt OG image (`/api/og/debt`) shared from inside FairPay with a dominant signed-net headline, a demoted you-owe/owes-you split, and a new "Recent activity" block showing up to 3 recent transactions (open first, then settled fill). Simplify the no-viewer direct-path to a minimal fallback.

**Architecture:** No schema changes. Reuse the existing `get_user_debt_details` RPC result (already sorted desc) to fill a new `recent_transactions` array on `DebtOgData`. A small pure helper (`selectRecentTransactions`) owns the open-first/settled-fill selection rule and is unit-tested with vitest. The renderer in `api/og/debt.tsx` is rebuilt around the new data and simplified on the direct path.

**Tech Stack:** `@vercel/og` (edge runtime JSX → PNG), `@supabase/supabase-js` (service-role RPC), vitest for unit tests, pnpm.

**Spec:** `docs/superpowers/specs/2026-04-21-debt-og-recent-activity-design.md`

---

## File Structure

- **Modify** `api/_lib/debt-og-data.ts`
  - Extend `DebtDetailRow` type with `split_amount` and `group_name`
  - Extend `DebtOgData` with `recent_transactions`
  - Populate `recent_transactions` inside `fetchDebtOgData`
  - Export new pure helper `selectRecentTransactions` and its row type
- **Create** `api/_lib/__tests__/debt-og-data.test.ts`
  - Unit tests for `selectRecentTransactions`
- **Modify** `api/og/debt.tsx`
  - Replace the full-path JSX body: new consolidated headline, demoted split row, new "Recent activity" block
  - Add local `RecentActivityRow` component
  - Strip "View in FairPay" pill and footer hint from direct-path JSX
  - Extend `sanitizeOgText` input to include recent-transaction descriptions and group names

No other files change. Do not touch `api/share/debt.ts`, `middleware.ts`, or anything under `src/`.

---

## Task 1: Add pure `selectRecentTransactions` helper with unit tests

Decoupling the selection rule keeps the renderer dumb and lets us test the "open-first then settled-fill, cap at 3" policy without spinning up @vercel/og.

**Files:**
- Modify: `api/_lib/debt-og-data.ts` (add exported type + helper near the bottom, before `buildDebtRelationshipLabel`)
- Create: `api/_lib/__tests__/debt-og-data.test.ts`

- [ ] **Step 1: Add the exported type and helper at the bottom of `api/_lib/debt-og-data.ts`** (insert just above `export function buildDebtRelationshipLabel`)

```ts
export interface DebtOgRecentTransaction {
  expense_id: string
  description: string
  expense_date: string
  group_name: string | null
  remaining_amount: number
  split_amount: number
  is_settled: boolean
  i_owe_them: boolean
}

export function selectRecentTransactions(
  candidates: DebtOgRecentTransaction[],
  limit = 3,
): DebtOgRecentTransaction[] {
  const open = candidates.filter((tx) => !tx.is_settled)
  const settled = candidates.filter((tx) => tx.is_settled)
  const selected = open.slice(0, limit)

  if (selected.length < limit) {
    selected.push(...settled.slice(0, limit - selected.length))
  }

  return selected
}
```

- [ ] **Step 2: Write the failing test**

Create `api/_lib/__tests__/debt-og-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  selectRecentTransactions,
  type DebtOgRecentTransaction,
} from '../debt-og-data'

function tx(overrides: Partial<DebtOgRecentTransaction>): DebtOgRecentTransaction {
  return {
    expense_id: overrides.expense_id ?? 'exp',
    description: overrides.description ?? 'Lunch',
    expense_date: overrides.expense_date ?? '2026-04-20',
    group_name: overrides.group_name ?? null,
    remaining_amount: overrides.remaining_amount ?? 0,
    split_amount: overrides.split_amount ?? 0,
    is_settled: overrides.is_settled ?? false,
    i_owe_them: overrides.i_owe_them ?? false,
  }
}

describe('selectRecentTransactions', () => {
  it('returns up to 3 open transactions, preserving order', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 'a', is_settled: false }),
      tx({ expense_id: 'b', is_settled: false }),
      tx({ expense_id: 'c', is_settled: false }),
      tx({ expense_id: 'd', is_settled: false }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual(['a', 'b', 'c'])
  })

  it('fills remaining slots with settled transactions when open count is low', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 'open-1', is_settled: false }),
      tx({ expense_id: 'settled-1', is_settled: true }),
      tx({ expense_id: 'settled-2', is_settled: true }),
      tx({ expense_id: 'settled-3', is_settled: true }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual([
      'open-1',
      'settled-1',
      'settled-2',
    ])
  })

  it('returns only settled transactions when no open items exist', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 's1', is_settled: true }),
      tx({ expense_id: 's2', is_settled: true }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual(['s1', 's2'])
  })

  it('returns empty array when no candidates', () => {
    expect(selectRecentTransactions([])).toEqual([])
  })

  it('honors custom limit', () => {
    const result = selectRecentTransactions(
      [
        tx({ expense_id: 'a', is_settled: false }),
        tx({ expense_id: 'b', is_settled: false }),
      ],
      1,
    )

    expect(result.map((t) => t.expense_id)).toEqual(['a'])
  })
})
```

- [ ] **Step 3: Run the test to confirm it passes**

Run: `pnpm exec vitest run api/_lib/__tests__/debt-og-data.test.ts`

Expected: 5 passing tests. If any fail, the helper added in Step 1 is wrong — fix it, not the test.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/debt-og-data.ts api/_lib/__tests__/debt-og-data.test.ts
git commit -m "feat(og): add selectRecentTransactions helper for debt OG"
```

---

## Task 2: Extend RPC row types and populate `recent_transactions` on `DebtOgData`

**Files:**
- Modify: `api/_lib/debt-og-data.ts` (`DebtDetailRow` type, `DebtOgData` interface, body of `fetchDebtOgData`)

- [ ] **Step 1: Extend `DebtDetailRow` to match RPC columns we now need**

In `api/_lib/debt-og-data.ts`, replace the `DebtDetailRow` type definition (currently lines 5–15) with:

```ts
type DebtDetailRow = {
  expense_id: string
  description: string
  expense_date: string
  currency: string
  settled_amount: number | string | null
  remaining_amount: number | string | null
  split_amount: number | string | null
  is_settled: boolean | null
  i_owe_them: boolean | null
  group_name: string | null
  created_at: string | null
}
```

The RPC (`supabase/migrations/20260304000000_add_get_user_debt_details.sql`) already returns `split_amount` and `group_name` — we were just ignoring them.

- [ ] **Step 2: Add `recent_transactions` to the `DebtOgData` interface**

Add the field at the bottom of the `DebtOgData` interface (after `all_settled`):

```ts
export interface DebtOgData {
  viewer_id: string
  viewer_name: string
  viewer_avatar_url: string | null
  counterparty_id: string
  counterparty_name: string
  counterparty_avatar_url: string | null
  total_i_owe: number
  total_they_owe: number
  net_amount: number
  i_owe_them: boolean
  currency: string
  transaction_count: number
  unpaid_count: number
  partial_count: number
  paid_count: number
  latest_activity_at: string | null
  all_settled: boolean
  recent_transactions: DebtOgRecentTransaction[]
}
```

- [ ] **Step 3: Populate `recent_transactions` inside `fetchDebtOgData`**

Inside the existing `for (const row of rows)` loop body in `fetchDebtOgData`, we are already aggregating counts and sums. After that loop, before the `return` statement, add:

```ts
const recentCandidates: DebtOgRecentTransaction[] = rows.slice(0, 10).map((row) => {
  const remainingAmount = toNumber(row.remaining_amount)
  const splitAmount = toNumber(row.split_amount)
  const isSettled = Boolean(row.is_settled) || remainingAmount <= 0

  return {
    expense_id: row.expense_id,
    description: row.description,
    expense_date: row.expense_date,
    group_name: row.group_name,
    remaining_amount: remainingAmount,
    split_amount: splitAmount || remainingAmount,
    is_settled: isSettled,
    i_owe_them: Boolean(row.i_owe_them),
  }
})

const recentTransactions = selectRecentTransactions(recentCandidates)
```

Then in the existing `return { ... }` object, add the final field:

```ts
      recent_transactions: recentTransactions,
```

The RPC already orders `expense_date DESC, created_at DESC`, so `slice(0, 10)` is "the 10 most recent rows" — we give `selectRecentTransactions` headroom even if the first handful are all settled.

- [ ] **Step 4: Sanity-check TypeScript compiles**

Run: `pnpm exec tsc --noEmit`

Expected: no errors in `api/_lib/debt-og-data.ts`. If `selectRecentTransactions` or `DebtOgRecentTransaction` can't be resolved, the import/export from Task 1 wasn't saved — revisit Task 1 Step 1.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/debt-og-data.ts
git commit -m "feat(og): carry recent transactions on DebtOgData"
```

---

## Task 3: Strip "View in FairPay" pill and footer hint from the direct-path OG

**Files:**
- Modify: `api/og/debt.tsx` (direct-path JSX, approximately lines 380–398)

- [ ] **Step 1: Remove the SummaryStat and footer hint from the direct-path render**

In `api/og/debt.tsx`, locate the direct-path JSX inside `if (counterpartyId) { const counterparty = await fetchDebtOgCounterparty(...); if (counterparty) { ... } }`. Delete these two blocks:

```tsx
                <div style={{ display: 'flex', marginBottom: 24 }}>
                  <SummaryStat
                    label="Preview"
                    value="View in FairPay"
                    valueColor={BRAND_TEAL}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: 1,
                  borderBottom: `2px dashed ${BORDER_SLATE}`,
                  marginBottom: 20,
                }} />

                <div style={{ display: 'flex', fontSize: 16, color: '#94a3b8' }}>
                  Share from inside FairPay to include exact open amounts
                </div>
```

What remains in the direct-path card body: BrandHeader + PillBadge, the top dashed separator, the PersonNode pair with RelationshipIcon, the "Direct debt link" caption, and the "Open debt details with {firstName}" headline. Nothing after the headline.

- [ ] **Step 2: Remove now-unused sanitizeOgText entries from the direct-path**

In the same direct-path branch, the `fallbackText` array currently includes `'View in FairPay'` indirectly via the rendered strings. The `sanitizeOgText([...])` call there uses `fallbackTitle`, `fallbackDescription`, `counterparty.counterparty_name`, `'Debt detail'`, `'You'`. Leave it as is — removing entries here doesn't break anything and keeping them ensures the font subset stays slightly broader.

- [ ] **Step 3: Verify the SummaryStat import is still used**

Run: `pnpm exec tsc --noEmit`

Expected: no unused-import error. `SummaryStat` is still imported at the top of `api/og/debt.tsx` (used in the full-path fallback on lines ~599–603); confirm it stays. If TypeScript reports it unused, something else is wrong — re-check the edits.

- [ ] **Step 4: Commit**

```bash
git add api/og/debt.tsx
git commit -m "feat(og): simplify direct-path debt OG fallback"
```

---

## Task 4: Add `RecentActivityRow` primitive to the renderer

**Files:**
- Modify: `api/og/debt.tsx` (add new local component near the top of the file, after `OpenDetailRow`)

- [ ] **Step 1: Add the component definition**

In `api/og/debt.tsx`, insert this component just after the closing brace of the existing `OpenDetailRow` function (around line 267):

```tsx
function RecentActivityRow({
  description,
  dateLabel,
  groupName,
  amountLabel,
  iOweThem,
  isSettled,
}: {
  description: string
  dateLabel: string
  groupName: string | null
  amountLabel: string
  iOweThem: boolean
  isSettled: boolean
}) {
  const baseDotColor = iOweThem ? NEGATIVE_RED : SETTLED_GREEN
  const dotColor = isSettled ? MUTED_SLATE : baseDotColor
  const amountColor = isSettled ? MUTED_SLATE : baseDotColor
  const rowOpacity = isSettled ? 0.55 : 1
  const metaLine = groupName ? `${dateLabel} · ${groupName}` : dateLabel
  const truncatedDescription = description.length > 32
    ? `${description.slice(0, 31)}…`
    : description

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      opacity: rowOpacity,
    }}>
      <div style={{
        display: 'flex',
        width: 10,
        height: 10,
        borderRadius: 5,
        background: dotColor,
        flexShrink: 0,
      }} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
        flex: 1,
      }}>
        <span style={{
          display: 'flex',
          fontSize: 15,
          fontWeight: 600,
          color: '#0f172a',
          lineHeight: 1.2,
        }}>
          {truncatedDescription}
        </span>
        <span style={{
          display: 'flex',
          fontSize: 12,
          fontWeight: 500,
          color: MUTED_SLATE,
          lineHeight: 1.2,
        }}>
          {metaLine}
        </span>
      </div>
      <span style={{
        display: 'flex',
        fontSize: 16,
        fontWeight: 700,
        color: amountColor,
        letterSpacing: -0.4,
        textDecoration: isSettled ? 'line-through' : 'none',
      }}>
        {amountLabel}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`

Expected: no errors. Component is not yet used — that's fine, we wire it up in Task 5.

- [ ] **Step 3: Commit**

```bash
git add api/og/debt.tsx
git commit -m "feat(og): add RecentActivityRow primitive"
```

---

## Task 5: Rebuild the full-path OG body with headline + demoted split + recent activity

**Files:**
- Modify: `api/og/debt.tsx` (full-path JSX starting at the `const relationshipLabel = buildDebtRelationshipLabel(debt)` block through the end of the main `ImageResponse` JSX)

- [ ] **Step 1: Update the pre-render computation block**

In `api/og/debt.tsx`, locate the block starting at `const relationshipLabel = buildDebtRelationshipLabel(debt)` (currently around line 448). Replace the entire block up to (but not including) `return withNoCacheHeaders(new ImageResponse(` with:

```tsx
    const relationshipLabel = buildDebtRelationshipLabel(debt)
    const highlightedAmount = debt.all_settled
      ? formatOgAmount(0, debt.currency)
      : formatOgAmount(debt.net_amount, debt.currency)
    const amountColor = debt.all_settled
      ? BRAND_TEAL
      : debt.i_owe_them
        ? NEGATIVE_RED
        : SETTLED_GREEN
    const openCount = debt.unpaid_count + debt.partial_count
    const viewerFirstName = getFirstName(debt.viewer_name)
    const counterpartyFirstName = getFirstName(debt.counterparty_name)
    const metaLine = buildMetaLine(openCount, debt.transaction_count, debt.latest_activity_at)
    const netSign = debt.all_settled
      ? ''
      : debt.i_owe_them
        ? '−'
        : '+'
    const signedHeadline = `${netSign}${highlightedAmount}`
    const headlineLabel = debt.all_settled
      ? `All settled with ${counterpartyFirstName}`
      : debt.i_owe_them
        ? `You owe ${counterpartyFirstName}`
        : `${counterpartyFirstName} owes you`
    const recentTransactions = debt.recent_transactions
    const allText = sanitizeOgText([
      'FairPay',
      buildDebtOgTitle(debt),
      relationshipLabel,
      debt.counterparty_name,
      signedHeadline,
      headlineLabel,
      formatOgAmount(debt.total_i_owe, debt.currency),
      formatOgAmount(debt.total_they_owe, debt.currency),
      metaLine,
      debt.viewer_name,
      'Recent activity',
      'You owe',
      'Owes you',
      ...recentTransactions.flatMap((tx) => [
        tx.description,
        formatOgDate(tx.expense_date),
        tx.group_name ?? '',
        formatOgAmount(tx.is_settled ? tx.split_amount : tx.remaining_amount, debt.currency),
      ]),
      debt.all_settled ? 'All settled' : 'Balance summary',
    ].join(' '))
    const fonts = await buildFonts(allText)
```

Notice: the `title` variable (currently `const title = debt.counterparty_name`) and the `openRows` array are deleted — the new layout doesn't use them.

- [ ] **Step 2: Replace the full-path JSX body**

Replace the JSX inside `return withNoCacheHeaders(new ImageResponse(` (the full-path render, currently the `<div style={{ width: '100%', ... }}>...</div>` through the `ImageResponse` closing arguments) with:

```tsx
    return withNoCacheHeaders(new ImageResponse(
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 40,
        fontFamily: 'Inter',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: 720,
          background: 'white',
          borderRadius: 20,
          padding: '40px 48px',
          border: `1px solid ${BORDER_SLATE}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          borderLeft: `6px solid ${amountColor}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <BrandHeader />
            <DebtStatusBadge allSettled={debt.all_settled} />
          </div>

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 18,
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 18,
          }}>
            <PersonNode
              name={debt.viewer_name}
              subtitle="You"
              avatarUrl={debt.viewer_avatar_url}
              colorIndex={1}
            />
            <RelationshipIcon color={amountColor} />
            <PersonNode
              name={debt.counterparty_name}
              subtitle="Counterparty"
              avatarUrl={debt.counterparty_avatar_url}
              colorIndex={0}
            />
          </div>

          <div style={{
            display: 'flex',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: MUTED_SLATE,
            marginBottom: 4,
          }}>
            {headlineLabel}
          </div>

          <div style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 800,
            color: amountColor,
            marginBottom: 18,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}>
            {signedHeadline}
          </div>

          {!debt.all_settled && (
            <div style={{
              display: 'flex',
              gap: 24,
              marginBottom: 18,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}>
                <span style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: MUTED_SLATE,
                }}>
                  You owe
                </span>
                <span style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: -0.4,
                }}>
                  {formatOgAmount(debt.total_i_owe, debt.currency)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                width: 1,
                background: BORDER_SLATE,
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}>
                <span style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: MUTED_SLATE,
                }}>
                  Owes you
                </span>
                <span style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: -0.4,
                }}>
                  {formatOgAmount(debt.total_they_owe, debt.currency)}
                </span>
              </div>
            </div>
          )}

          {recentTransactions.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 18,
            }}>
              <span style={{
                display: 'flex',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: MUTED_SLATE,
              }}>
                Recent activity
              </span>
              {recentTransactions.map((tx) => (
                <RecentActivityRow
                  key={tx.expense_id}
                  description={tx.description}
                  dateLabel={formatOgDate(tx.expense_date)}
                  groupName={tx.group_name}
                  amountLabel={formatOgAmount(
                    tx.is_settled ? tx.split_amount : tx.remaining_amount,
                    debt.currency,
                  )}
                  iOweThem={tx.i_owe_them}
                  isSettled={tx.is_settled}
                />
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 14,
          }} />

          <div style={{ display: 'flex', fontSize: 15, color: '#94a3b8' }}>
            {metaLine}
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
    ))
```

Card width grows from 680 → 720 because the recent-activity rows read more comfortably with a touch more horizontal room.

- [ ] **Step 3: Delete now-unused helpers**

The `OpenDetailRow` component and its prop type (currently around lines 186–267 in `api/og/debt.tsx`) are no longer referenced. Delete the entire `function OpenDetailRow({...}) { ... }` block. This also removes the "Open" label rows we no longer render.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`

Expected: zero errors. If `title` or `openRows` is reported as unused, you left dead code in Step 1 — remove it. If `OpenDetailRow` is reported as unused, Step 3 wasn't applied — delete it now.

- [ ] **Step 5: Re-run the unit test from Task 1 as a regression guard**

Run: `pnpm exec vitest run api/_lib/__tests__/debt-og-data.test.ts`

Expected: 5 passing tests. If any fail, the `selectRecentTransactions` helper or its types drifted — fix the renderer/helper mismatch, not the test.

- [ ] **Step 6: Commit**

```bash
git add api/og/debt.tsx
git commit -m "feat(og): rework debt OG with headline and recent activity"
```

---

## Task 6: Manual visual verification

Visual output is the actual deliverable for OG — static types are not enough.

**Files:** none modified.

- [ ] **Step 1: Start the local Vercel dev server**

Run (in a dedicated terminal): `pnpm exec vercel dev --listen 3001`

Wait for "Ready! Available at http://localhost:3001". If the port is busy, pick another and adjust the URLs below.

- [ ] **Step 2: Identify a known debt pair**

Query the local DB (or production read replica, if that's your working setup) for a viewer/counterparty pair that has:

- Case A: at least 3 unsettled expenses between them
- Case B: exactly 1 unsettled + 2+ settled expenses between them
- Case C: all settled (`all_settled = true`)

Record the `viewer_id` and `counterparty_id` UUIDs for each case.

- [ ] **Step 3: Render each case in a browser**

Open each URL in a browser that shows a 1200×630 PNG:

- `http://localhost:3001/api/og/debt?viewer_id=<A-viewer>&counterparty_id=<A-counterparty>`
- `http://localhost:3001/api/og/debt?viewer_id=<B-viewer>&counterparty_id=<B-counterparty>`
- `http://localhost:3001/api/og/debt?viewer_id=<C-viewer>&counterparty_id=<C-counterparty>`

For **Case A**, verify:
- Signed amount is the dominant number, colored red (if viewer owes) or green (if owed)
- "You owe" + "Owes you" split appears directly under the headline, muted
- "Recent activity" section shows 3 rows, each with description · date · (group name if any) and a colored amount
- No row has strikethrough
- Footer shows "N open items · <date>"

For **Case B**, verify:
- 1 open row at full opacity, remaining 2 rows at reduced opacity with strikethrough amounts and muted slate dots

For **Case C**, verify:
- Status badge reads "All settled"
- Headline has no sign, teal color
- "You owe / Owes you" split is hidden
- Recent activity (if any settled rows exist) renders muted/strikethrough

- [ ] **Step 4: Render the direct-path fallback**

Open: `http://localhost:3001/api/og/debt?counterparty_id=<any-counterparty>`

Verify:
- Card contains brand + "Debt detail" pill + two avatars + "Direct debt link" caption + "Open debt details with <name>" headline
- **No** "View in FairPay" element
- **No** "Share from inside FairPay..." footer
- Nothing below the headline

- [ ] **Step 5: Render with Vietnamese diacritics**

If any available test counterparty has a diacritic name (e.g. "Nguyễn") or a description with diacritics, confirm glyphs render — not tofu boxes. If all fonts render as blank rectangles, `buildFonts` subset is missing characters — re-check Task 5 Step 1 that `tx.description` is included in `sanitizeOgText`.

- [ ] **Step 6: Report results**

If all five cases above render correctly, this task is complete. If any issue is found, do **not** commit a "fix" blindly — re-read the relevant task step, locate the actual source of the defect, and patch it there.

No commit for this task — it is pure verification.

---

## Self-Review (performed during plan authoring)

**Spec coverage:**
- Full-path consolidated headline → Task 5 Step 2
- Demoted you-owe/owes-you split → Task 5 Step 2 (`!debt.all_settled && ...` block)
- Recent activity block with open-first/settled-fill → Tasks 1, 2, 4, 5
- Settled rows muted + strikethrough → Task 4
- Direct-path cleanup (no "View in FairPay", no footer hint) → Task 3
- No schema change → confirmed; RPC already returns required fields
- Vertical budget fits → verified by Task 6 visual check

**Placeholder scan:** No TBD/TODO; all code blocks contain complete implementations.

**Type consistency:** `DebtOgRecentTransaction` is defined in Task 1, imported by tests in Task 1, consumed in Task 2, and rendered in Tasks 4–5. `selectRecentTransactions` has one signature used consistently. `RecentActivityRow` props match the mapping in Task 5 Step 2 (`description`, `dateLabel`, `groupName`, `amountLabel`, `iOweThem`, `isSettled`).

**Cross-task references:** Task 2 imports `selectRecentTransactions` from the same file — adding `export` in Task 1 is already captured. Task 5 deletes `OpenDetailRow` (Step 3) which had been left in after Task 4 — consistent with the full replacement of the body.

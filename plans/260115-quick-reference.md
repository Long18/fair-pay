# Quick Reference: Who Owes Who UI Patterns
**For**: Developers implementing Phases 2-3
**Print This**: One page cheat sheet

---

## The 6 Core Patterns

### 1. CARD LAYOUT (Dashboard)
```
[Avatar] Name
Badge + Amount + Metadata
[Expand ↓]
```
**Why**: Clear hierarchy, scannable, mobile-friendly
**File**: `debt-row-expandable.tsx`

### 2. COLOR CODING
```
YOU OWE:     Red badge (#fee2e2), red text (#dc2626)
OWED TO YOU: Green badge (#dcfce7), green text (#16a34a)
PAID:        Gray badge (#e2e8f0), gray text (#475569)
PARTIAL:     Orange badge (#fed7aa), orange text (#ea580c)
```
**Why**: Colorblind-safe (badge + text, not color alone)
**File**: `src/lib/status-colors.ts`

### 3. STICKY SETTLEMENT PANEL
```
Pay Alice: $100.00
[✓✓✓] 3 selected
[SETTLE $100] ← Always visible
```
**Why**: Users see CTA while scrolling expenses
**Position**: Desktop sidebar, Mobile bottom sheet

### 4. CHECKBOX SELECTION
```
[✓] Dinner    12/25  -$50.00  [Unpaid]
[✓] Drinks    12/24  -$30.00  [Unpaid]
[☐] Dessert   12/23  -$20.00  [Paid]
   Total: -$80.00 (real-time)
```
**Why**: Users control exactly what they're settling
**Behavior**: Paid items disabled (opacity 0.5)

### 5. AMOUNT DISPLAY
```
BADGE: [YOU OWE]
COPY: "Pay Alice"
AMOUNT: "$45.50" (sign + value)
```
**Why**: Natural language (not mathematical)
**Pattern**: Always show 2 decimals ($X.XX)

### 6. GROUPING STRATEGY
```
YOU OWE THESE PEOPLE
├─ Alice: -$100
├─ Bob: -$50

THESE PEOPLE OWE YOU
├─ Carol: +$150
```
**Why**: Reduces cognitive load (scan one section for action)
**Alternative**: Tabs (Simplified/Full) for power users

---

## Size Specifications (Copy-Paste)

| Component | Height | Padding | Font |
|-----------|--------|---------|------|
| Debt Card | 96px | 16px | 16px/semi-bold |
| Expense Row | 48px | 12v/16h | 15px |
| Button (Primary) | 48px | 12v/24h | 16px/semi-bold |
| Button (Secondary) | 44px | 10v/16h | 14px/medium |
| Avatar | 64px | - | - |
| Checkbox | 20px | - | - |

---

## Color Palette (Hex)

```
YOU OWE (Red):
- Text: #dc2626
- Badge BG: #fee2e2
- Badge Text: #991b1b

OWED (Green):
- Text: #16a34a
- Badge BG: #dcfce7
- Badge Text: #15803d

PAID (Slate):
- Text: #475569
- Badge BG: #e2e8f0
- Badge Text: #1e293b

PARTIAL (Orange):
- Text: #ea580c
- Badge BG: #fed7aa
- Badge Text: #7c2d12
```

---

## Component Props at a Glance

### DebtRowExpandable
```typescript
counterparty_id: string
counterparty_name: string
counterparty_avatar_url?: string
amount: number
currency: string
i_owe_them: boolean        // KEY: determines color
transaction_count?: number
last_transaction_date?: string
```

### WhatToPayNowPanel
```typescript
counterpartyName: string
selectedExpenseIds: string[]
expenses: Array<{
  id: string
  split_id: string          // For settlement API
  my_share: number
  status: 'paid' | 'unpaid' | 'partial'
}>
currency: string
onSelectionChange: (ids: string[]) => void
onSettle: (ids: string[]) => Promise<boolean>
```

### ExpenseBreakdownItemSelectable
```typescript
id: string
description: string
expense_date: string
my_share: number
total_amount: number
currency: string
status: 'paid' | 'unpaid' | 'partial'
selected: boolean
onToggle: (id: string) => void
```

---

## Responsive Breakpoints

| Device | Width | Layout | Settlement |
|--------|-------|--------|-----------|
| Mobile | <768px | 1 col | Bottom sheet |
| Tablet | 768-1024px | 1 col | Sidebar (optional) |
| Desktop | >1024px | 3 col (66/33) | Sticky sidebar |

---

## Accessibility Musts

- [ ] Color contrast 4.5:1+ (use WebAIM checker)
- [ ] Touch targets 44x44px+ (measure in Chrome DevTools)
- [ ] Keyboard nav: Tab, Enter, Space work
- [ ] Screen reader: all text announced correctly
- [ ] Dark mode: colors adjusted (Tailwind dark: prefix)

---

## Translation Keys

```json
{
  "dashboard.youOwe": "You Owe",
  "dashboard.userOwesYou": "Owes You",
  "debts.whatToPayNow": "What to Pay Now",
  "debts.settleSelected": "Settle Selected",
  "debts.settling": "Settling...",
  "paymentState.paid": "Paid",
  "paymentState.unpaid": "Unpaid",
  "paymentState.partial": "Partial"
}
```

---

## Animation Timings

| Action | Duration | Easing |
|--------|----------|--------|
| Expand/Collapse | 200ms | ease-out |
| Checkbox Toggle | 150ms | ease-out |
| Button Hover | 150ms | ease-out |
| Button Click | 100ms | ease-out |

---

## Common Gotchas

❌ **Color alone** (colorblind inaccessible)
✓ Badge + color + text

❌ **"You owe" vs. "You are owed"** (confusing)
✓ Badge: [YOU OWE] | Copy: "Pay Alice"

❌ **Small touch targets** (<44px)
✓ Make entire row 48px+ height

❌ **Hidden settlement CTA** (users miss it)
✓ Sticky or prominent panel

❌ **No real-time calculation**
✓ Update total as checkboxes toggle

❌ **Settled and unsettled items mixed**
✓ Disable paid items, sort unpaid first

---

## Files to Create/Modify

**New Components**:
- [ ] `src/components/debts/debt-breakdown-header.tsx`
- [ ] `src/components/debts/what-to-pay-now-panel.tsx`
- [ ] `src/components/debts/expense-breakdown-item-selectable.tsx`
- [ ] `src/pages/person-debt-breakdown.tsx` (route: /debts/:userId)

**Existing to Update**:
- [ ] `src/components/dashboard/debt-row-expandable.tsx` (colors, metadata)
- [ ] `src/lib/status-colors.ts` (add color palette)
- [ ] `src/App.tsx` (add /debts/:userId route)
- [ ] `public/locales/en/translation.json` (add keys)

**Optional Enhancements**:
- [ ] `src/hooks/use-settle-splits.ts` (settlement logic)
- [ ] `src/hooks/use-debt-summary.ts` (summary data)
- [ ] Dark mode: test Tailwind dark: prefix

---

## Test Checklist

### Unit Tests
- [ ] Amount shows correct sign (+/-)
- [ ] Badge displays correct label
- [ ] Checkbox toggles select state
- [ ] Total updates in real-time
- [ ] Paid items cannot be selected

### E2E Tests
- [ ] User can expand/collapse debt row
- [ ] User can select/deselect expenses
- [ ] Settlement button disabled until selection
- [ ] Click settle → marks splits settled → refetch data
- [ ] Mobile bottom sheet appears on settlement

### Manual Testing
- [ ] Color contrast checked (WebAIM)
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Mobile: all touch targets 44x44px+
- [ ] Screen reader: announces all info
- [ ] Dark mode: colors render correctly
- [ ] With 100 expenses: no lag/janky animation

---

## Performance Tips

1. **Memoize** debt rows (prevent cascade re-renders)
2. **Lazy load** expenses on expand (not all at once)
3. **Virtualize** if >50 items (react-window)
4. **Debounce** calculation (if 100+ items)

---

## Related Documents

📄 **Detailed Research**: `260115-who-owes-who-ui-research.md`
📋 **Implementation Guide**: `260115-who-owes-who-implementation-guide.md`
📐 **Visual Specs**: `260115-who-owes-who-visual-specs.md`
📑 **Summary**: `260115-RESEARCH-SUMMARY.md`

---

**Print or bookmark this page. Reference while coding!**

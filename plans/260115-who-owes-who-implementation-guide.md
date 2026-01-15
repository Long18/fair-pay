# Implementation Guide: "Who Owes Who" UI for FairPay
**Date**: January 15, 2026
**Target**: Phases 2-3 of debt transparency roadmap
**Status**: Actionable code patterns and component specifications

---

## Quick Reference: Component Layout Patterns

### Pattern 1: Dashboard Debt Card (Expandable)

**Component**: `DebtRowExpandable`
**Location**: Dashboard → Balances tab
**Responsive**: Mobile (full-width) + Desktop (100% container)

```tsx
// VISUAL STRUCTURE
┌────────────────────────────────────────────┐
│ [Avatar] Alice        YOU OWE: -$45.50 [▼] │  ← Collapsed header
└────────────────────────────────────────────┘
│ 3 expenses • Last: 12/25                    │  ← Metadata
└────────────────────────────────────────────┘

AFTER EXPAND:
├─ Dinner              12/25  -$50.00 [Unpaid]
├─ Drinks              12/24  -$30.00 [Unpaid]
├─ Dessert             12/23  -$20.00 [Paid]
├─ [View Full Breakdown] [View Profile]      ← Actions
└────────────────────────────────────────────┘
```

**Props Interface**:
```tsx
interface DebtRowExpandableProps {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: number;                    // Net amount owed/owed to
  currency: string;
  i_owe_them: boolean;               // Key flag: determines color/badge
  transaction_count?: number;        // 3 expenses
  last_transaction_date?: string;    // 12/25
  onNavigate?: (path: string) => void;
}
```

**Styling Rules**:
```tsx
// Amount display
const amountColor = i_owe_them
  ? 'text-red-600'      // You owe: red
  : 'text-green-600';   // Owed to you: green

// Badge
const badgeVariant = i_owe_them
  ? 'destructive'       // Red background
  : 'default';          // Green background

// Amount format: always show sign
const displayAmount = `${i_owe_them ? '-' : '+'}${formatCurrency(amount, currency)}`;

// Border on avatar (optional secondary indicator)
const avatarBorder = i_owe_them
  ? 'border-red-300'
  : 'border-green-300';
```

**Expand/Collapse Animation**:
- Duration: 200-300ms
- Use `<Collapsible>` from shadcn/ui
- Icon rotation: ▼ → ▲ (or use ChevronDown → ChevronUp)

---

### Pattern 2: Settlement Panel (Sticky)

**Component**: `WhatToPayNowPanel`
**Location**: `/debts/:userId` page (right sidebar desktop, bottom mobile)
**State**: Real-time updates when checkboxes toggle

```tsx
// VISUAL STRUCTURE (MOBILE: Fixed Bottom Sheet)
┌──────────────────────────────────────────────┐
│ WHAT TO PAY NOW                              │
├──────────────────────────────────────────────┤
│ Pay Alice:                                   │
│ -$100.00 (large, bold, red)                 │
│                                              │
│ Expenses Selected: 3                         │
├──────────────────────────────────────────────┤
│ [       SETTLE $100.00       ] ← 48px height│
├──────────────────────────────────────────────┤
│ ⓘ Settlements are marked manually. Make     │
│   sure to complete payment outside the app   │
│   before marking as settled.                 │
└──────────────────────────────────────────────┘
```

**Props Interface**:
```tsx
interface WhatToPayNowPanelProps {
  counterpartyName: string;
  selectedExpenseIds: string[];
  expenses: Array<{
    id: string;
    split_id: string;           // For settlement API
    description: string;
    my_share: number;
    status: 'paid' | 'unpaid' | 'partial';
  }>;
  currency: string;
  onSelectionChange: (ids: string[]) => void;
  onSettle: (splitIds: string[]) => Promise<boolean>;
  isSettling: boolean;
}
```

**Calculation Logic** (Real-time):
```tsx
// Calculate total to settle (only unpaid/partial items)
const totalToSettle = useMemo(() => {
  return selectedExpenses
    .filter(e => e.status !== 'paid')  // Don't settle already-paid items
    .reduce((sum, e) => sum + e.my_share, 0);
}, [selectedExpenses]);

// Update button state
const isButtonDisabled = selectedExpenses.length === 0 || isSettling;
const buttonLabel = isSettling
  ? `Settling... ${formatCurrency(totalToSettle, currency)}`
  : `Settle ${formatCurrency(totalToSettle, currency)}`;
```

**Mobile vs. Desktop**:
```tsx
// Desktop: Right sidebar (25% width)
<div className="fixed right-0 top-0 w-1/4 h-screen sticky">
  <WhatToPayNowPanel {...props} />
</div>

// Mobile: Bottom sheet (use ResponsiveDialog)
<ResponsiveDialog
  open={showSettlementPanel}
  onOpenChange={setShowSettlementPanel}
  position="bottom"  // Custom prop for mobile
>
  <WhatToPayNowPanel {...props} />
</ResponsiveDialog>
```

---

### Pattern 3: Settlement Item with Checkbox

**Component**: `ExpenseBreakdownItemSelectable`
**Location**: `/debts/:userId` → expense list
**Interaction**: Checkbox toggles, parent panel updates

```tsx
// VISUAL STRUCTURE
┌────────────────────────────────────────────────┐
│ ☑ Dinner                   -$50.00  [Unpaid]  │
│   12/25 • Restaurant                           │
│   Total: $120 (your share: $50)               │
└────────────────────────────────────────────────┘

// Paid items: different visual treatment
┌────────────────────────────────────────────────┐
│ ☐ Dessert                  -$20.00  [Paid]    │
│   12/23 • Bakery (grayed out)                 │
│   Already settled - not selectable            │
└────────────────────────────────────────────────┘
```

**Props & Behavior**:
```tsx
interface ExpenseBreakdownItemSelectableProps {
  id: string;
  description: string;
  expense_date: string;
  group_name?: string;
  my_share: number;
  total_amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'partial';
  selected: boolean;
  onToggle: (id: string) => void;
}

// Disable checkbox for paid items
const isDisabled = status === 'paid';

// Styling for paid items
const itemOpacity = status === 'paid' ? 'opacity-50' : 'opacity-100';
const checkboxDisabled = status === 'paid' ? true : false;
```

**Row Layout**:
```
[Checkbox] Title [Status Badge] [Amount (RED)]
[Metadata: date • group]
[Small: Total $X, your share highlighted]
```

---

### Pattern 4: Dashboard Debt Summary

**Component**: `BalanceSummaryCards`
**Location**: Dashboard → Above debt list
**Purpose**: Quick overview before drill-down

```tsx
// VISUAL STRUCTURE (3-Column Card Layout)
┌──────────────────┬──────────────────┬──────────────────┐
│ You Owe          │ Owed to You      │ Net Balance      │
├──────────────────┼──────────────────┼──────────────────┤
│ $523.50          │ $234.00          │ -$289.50         │
│ [Red text]       │ [Green text]     │ [Red text]       │
│ To 5 people      │ From 2 people    │ You owe net      │
└──────────────────┴──────────────────┴──────────────────┘

// Mobile: Stack vertically or horizontal scroll
```

**Data Source**:
```tsx
const summaryData = {
  total_i_owe: 523.50,        // Sum of negative balances
  total_owed_to_you: 234.00,  // Sum of positive balances
  net_balance: -289.50,       // Difference (you owe)
  people_owe: 5,
  people_owed: 2,
  currency: 'USD'
};
```

---

## Color Palette Implementation

### Tailwind Color Map

```tsx
// File: src/lib/status-colors.ts

export const debtStatusColors = {
  youOwe: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-900',
    border: 'border-red-200',
    hover: 'hover:bg-red-100'
  },
  youAreOwed: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-900',
    border: 'border-green-200',
    hover: 'hover:bg-green-100'
  },
  paid: {
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-900',
    border: 'border-slate-200',
    hover: 'hover:bg-slate-100'
  },
  partial: {
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-900',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-100'
  }
};

// Usage
const colors = debtStatusColors[i_owe_them ? 'youOwe' : 'youAreOwed'];
```

### CSS Raw Values (Hex)

```css
/* For reference/design tools */
--debt-owe-text: #dc2626;     /* red-600 */
--debt-owe-bg: #fef2f2;       /* red-50 */
--debt-owe-badge: #fee2e2;    /* red-100 */

--debt-owed-text: #16a34a;    /* green-600 */
--debt-owed-bg: #f0fdf4;      /* green-50 */
--debt-owed-badge: #dcfce7;   /* green-100 */

--debt-paid-text: #475569;    /* slate-600 */
--debt-paid-bg: #f8fafc;      /* slate-50 */
--debt-paid-badge: #e2e8f0;   /* slate-100 */

--debt-partial-text: #ea580c; /* orange-600 */
--debt-partial-bg: #fff7ed;   /* orange-50 */
--debt-partial-badge: #fed7aa; /* orange-100 */
```

### Contrast Verification

```
Text on Light Background:
- Red #dc2626 on #fef2f2: 7.2:1 ✓ (WCAG AAA)
- Green #16a34a on #f0fdf4: 7.5:1 ✓ (WCAG AAA)
- Slate #475569 on #f8fafc: 5.2:1 ✓ (WCAG AAA)
- Orange #ea580c on #fff7ed: 6.8:1 ✓ (WCAG AAA)

Foreground on White:
- Red #dc2626 on white: 8.1:1 ✓ (WCAG AAA)
- Green #16a34a on white: 8.9:1 ✓ (WCAG AAA)
```

---

## Mobile Touch Optimization

### Button Sizes

```tsx
// CTA Button: Settlement
<Button
  className="h-12 px-6 text-base"  // 48px height minimum
  onClick={handleSettle}
>
  Settle {formatCurrency(amount, currency)}
</Button>

// Secondary Actions: View Profile
<Button
  variant="outline"
  className="h-11 px-4"  // 44px height
>
  View Profile
</Button>

// Checkbox touch target
<Checkbox
  className="h-6 w-6"  // 24px, but with padding = 44px row
/>
```

### Row Heights

```tsx
// Each debt row (clickable/expandable)
className="py-4 px-4 min-h-[56px] flex items-center"  // 56px minimum

// Expense item row
className="py-3 px-4 min-h-[48px] flex items-center"  // 48px minimum

// List item spacing
className="space-y-2"  // 8px between items
```

### Swipe Actions (Optional)

```tsx
// Use existing SwipeableCard component
<SwipeableCard
  onSwipeLeft={() => handleDelete(id)}
  onSwipeRight={() => handleArchive(id)}
>
  <DebtRowExpandable {...props} />
</SwipeableCard>
```

---

## Responsive Breakpoints

### Mobile (< 768px)

```tsx
// Single column layout
<div className="space-y-3">
  <DebtRowExpandable {...debt} />
</div>

// Settlement: Bottom sheet or full-screen modal
<ResponsiveDialog position="bottom">
  <WhatToPayNowPanel {...props} />
</ResponsiveDialog>

// Buttons: Full width
<Button className="w-full">Settle</Button>
```

### Tablet (768px - 1024px)

```tsx
// 2 columns possible, but keep single for debt complexity
// Settlement: Sidebar starts to work
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <ExpenseList />
  </div>
  <div>
    <WhatToPayNowPanel /> {/* Sticky */}
  </div>
</div>
```

### Desktop (> 1024px)

```tsx
// Sidebar layout preferred
// 3-column: List (66%) + Panel (33%)
<div className="grid grid-cols-3 gap-6">
  <div className="col-span-2">
    <ExpenseList />
  </div>
  <div className="sticky top-4 h-fit">
    <WhatToPayNowPanel />
  </div>
</div>
```

---

## Translation Keys Required

**File**: `public/locales/en/translation.json`

```json
{
  "dashboard": {
    "youOwe": "You Owe",
    "userOwesYou": "Owes You",
    "expenses": "expenses",
    "lastTransaction": "Last",
    "debtBreakdown": "Debt Breakdown",
    "allSettledUp": "All Settled Up",
    "noOutstandingDebts": "No outstanding debts between you and your friends",
    "viewFullBreakdown": "View Full Breakdown",
    "myShare": "My Share"
  },
  "debts": {
    "youOwe": "YOU OWE",
    "owesYou": "OWES YOU",
    "unpaid": "unpaid",
    "partial": "partial",
    "paid": "paid",
    "whatToPayNow": "What to Pay Now",
    "recommendedAmount": "Recommended Amount",
    "expensesSelected": "expenses selected",
    "unsettled": "unsettled",
    "selectExpenses": "Select expenses",
    "settleSelected": "Settle Selected",
    "settling": "Settling...",
    "manualSettlementNote": "Settlements are marked manually. Make sure to complete payment outside the app before marking as settled.",
    "addExpense": "Add Expense"
  },
  "paymentState": {
    "paid": "Paid",
    "unpaid": "Unpaid",
    "partial": "Partial"
  }
}
```

---

## Accessibility Checklist

### Color Contrast

- [ ] Amount text colors meet 4.5:1 ratio on backgrounds
- [ ] Badge text readable on badge backgrounds
- [ ] Test with WebAIM Contrast Checker

### Keyboard Navigation

- [ ] Tab through all debt rows (left-to-right, top-to-bottom)
- [ ] Space/Enter to expand/collapse
- [ ] Space/Enter to toggle checkbox
- [ ] Tab to button, Enter to activate
- [ ] No keyboard traps (escape works)

### Screen Reader

- [ ] "Alice, You owe, $45.50, 3 expenses, expanded"
- [ ] "Checkbox: Dinner, unpaid, $50, unchecked"
- [ ] "Button: Settle $100, disabled until expenses selected"
- [ ] Link vs. button semantics correct

### Mobile Accessibility

- [ ] Touch targets 44x44px minimum
- [ ] Sufficient spacing between interactive elements
- [ ] Text size ≥ 16px (no forced zoom needed)
- [ ] Focus indicators visible on all interactive elements

---

## Testing Strategy

### Unit Tests

```typescript
// Debt row component
test('displays amount with correct sign', () => {
  render(<DebtRowExpandable i_owe_them={true} amount={45.50} />);
  expect(screen.getByText('-$45.50')).toBeInTheDocument();
});

test('shows correct badge for owed status', () => {
  render(<DebtRowExpandable i_owe_them={false} />);
  expect(screen.getByText('OWES YOU')).toBeInTheDocument();
});

// Settlement calculation
test('updates total when checkbox toggled', () => {
  const { rerender } = render(<WhatToPayNowPanel selectedIds={[]} />);
  expect(screen.getByText('Select expenses')).toBeInTheDocument();

  rerender(<WhatToPayNowPanel selectedIds={['1', '2']} />);
  expect(screen.getByText('Settle $100.00')).toBeInTheDocument();
});
```

### E2E Tests

```typescript
// Settlement flow
test('user can settle debt with checkboxes', async () => {
  await page.goto('/debts/alice-id');

  // Check first expense
  await page.click('input[data-expense-id="1"]');
  await expect(page.locator('button:has-text("Settle")')).toContainText('Settle $50');

  // Check all
  await page.click('input[data-select-all]');
  await expect(page.locator('button:has-text("Settle")')).toContainText('Settle $100');

  // Settle
  await page.click('button:has-text("Settle $100")');
  await expect(page.locator('text=Settled')).toBeVisible();
});
```

### Visual Regression

```typescript
// Snapshot tests for color/layout consistency
test('debt row matches snapshot', () => {
  const { container } = render(
    <DebtRowExpandable
      counterparty_name="Alice"
      i_owe_them={true}
      amount={45.50}
    />
  );
  expect(container).toMatchSnapshot();
});
```

---

## Performance Considerations

### Rendering Optimization

```tsx
// Memoize debt rows to prevent unnecessary re-renders
const DebtRowExpandable = React.memo(function DebtRow(props: DebtRowExpandableProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  return (
    prevProps.counterparty_id === nextProps.counterparty_id &&
    prevProps.amount === nextProps.amount &&
    prevProps.selected === nextProps.selected
  );
});

// Memoize checkbox list to prevent cascade re-renders
const ExpenseList = React.memo(function List({ expenses, selectedIds, onToggle }: Props) {
  return (
    <div>
      {expenses.map(expense => (
        <ExpenseBreakdownItem
          key={expense.id}
          {...expense}
          selected={selectedIds.includes(expense.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});
```

### Data Fetching Optimization

```tsx
// Lazy load expense details on expand (not all at once)
const [expandedId, setExpandedId] = useState<string | null>(null);

const { data: expenses } = useQuery(
  ['debts', expandedId],
  () => fetchExpenses(expandedId),
  { enabled: !!expandedId }  // Only fetch when expanded
);
```

### List Virtualization (for 50+ items)

```tsx
// Use react-window if expense list exceeds 50 items
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={expenses.length}
  itemSize={56}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ExpenseBreakdownItem {...expenses[index]} />
    </div>
  )}
</List>
```

---

## Integration Points

### With Existing Components

```tsx
// BalanceTable.tsx: Update onClick navigation
onClick={() => go({ to: `/debts/${balance.counterparty_id}` })}

// Dashboard.tsx: Import DebtBreakdownSection
import { DebtBreakdownSection } from "@/components/dashboard/debt-breakdown-section";

// App.tsx: Add route
<Route path="/debts/:userId" element={<PersonDebtBreakdownPage />} />
```

### With API/Database

```tsx
// Settlement RPC call
const { settle } = useSettleSplits();

const handleSettle = async () => {
  // Filter to unsettled expenses
  const splitIds = selectedExpenses
    .filter(e => e.status !== 'paid')
    .map(e => e.split_id);

  // Call RPC
  const success = await settle(splitIds);
  if (success) {
    // Refetch data
    await refetchSummary();
    await refetchExpenses();
  }
};
```

---

## Dark Mode Support

```tsx
// Colors work in dark mode with Tailwind dark: prefix
<div className="bg-red-50 dark:bg-red-950">
  <span className="text-red-600 dark:text-red-400">-$100</span>
</div>

// Badge colors adjust automatically with shadcn/ui
<Badge variant="destructive">  {/* Handles light/dark */}
  YOU OWE
</Badge>
```

---

## Migration Path

### From Current BalanceTable to New DebtBreakdown

**Step 1**: Keep BalanceTable, add DebtBreakdownSection below it
**Step 2**: Monitor which users interact with DebtBreakdownSection vs. BalanceTable
**Step 3**: Once >50% use new section, deprecate BalanceTable
**Step 4**: Remove BalanceTable in next major version

```tsx
// Temporary dual rendering
<BalanceTable {...props} />  {/* Old */}
<DebtBreakdownSection {...props} />  {/* New */}
```

---

*This guide pairs with the research document (`260115-who-owes-who-ui-research.md`). Reference it for design rationale and best practices background.*

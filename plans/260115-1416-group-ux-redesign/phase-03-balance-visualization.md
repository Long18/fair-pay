# Phase 3: Balance Visualization Enhancement

**Status:** Pending
**Priority:** Medium (Enhanced Understanding)
**Estimated Time:** 12-16 hours
**Dependencies:** Phase 1 (Design System), Phase 2 (Group Detail Redesign)

---

## Overview

Add visual insights to help users understand debt composition, expense breakdowns, and settlement priorities.

---

## Problem Statement

Current balance display shows only final numbers. Users ask:
- "Why do I owe this amount?"
- "Which expenses contributed to this debt?"
- "Who should I pay first?"
- "How did we get to this balance?"

---

## Solution Components

### 1. Debt Breakdown in Expandable Cards

**Location:** Inside BalanceCard expansion (Phase 2)

**Show:**
- Individual expenses contributing to debt
- Expense dates, amounts, categories
- Running total
- Settlement history

```tsx
// Inside BalanceCard children (expanded state)
<div className="space-y-4">
  {/* Expense Breakdown */}
  <div>
    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
      <ReceiptIcon className="h-4 w-4" />
      Expense Breakdown
    </h4>
    <div className="space-y-2">
      {expensesWithUser.map(expense => (
        <div
          key={expense.id}
          className="flex justify-between items-center p-2 rounded bg-muted/50"
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(expense.expense_date)} • {expense.category}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {formatNumber(expense.your_share)} ₫
            </p>
            <p className="text-xs text-muted-foreground">
              of {formatNumber(expense.amount)} ₫
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Running Total */}
  <div className="pt-2 border-t flex justify-between items-center">
    <span className="text-sm font-medium">Total:</span>
    <span className="text-lg font-bold">
      {formatNumber(totalAmount)} ₫
    </span>
  </div>

  {/* Settlement History */}
  {settlements.length > 0 && (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <HistoryIcon className="h-4 w-4" />
        Recent Settlements
      </h4>
      <div className="space-y-1">
        {settlements.map(settlement => (
          <div
            key={settlement.id}
            className="flex justify-between items-center text-sm p-2 rounded bg-green-50"
          >
            <span className="text-muted-foreground">
              {formatDate(settlement.payment_date)}
            </span>
            <span className="font-medium text-green-700">
              -{formatNumber(settlement.amount)} ₫
            </span>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Quick Settle Button */}
  <SettlementButton
    amount={totalAmount}
    currency="VND"
    recipientName={userName}
    onClick={() => handleSettleUp(userId, totalAmount)}
  />
</div>
```

---

### 2. Category-Based Debt Breakdown

**Location:** Below hero balance section (optional collapsible)

**Show:** Debt grouped by expense category

```tsx
{/* Category Breakdown Card */}
<ExpandableCard
  title="Debt by Category"
  subtitle="See where your money goes"
  badge={<Badge variant="outline">Insights</Badge>}
  expanded={false}
>
  <div className="space-y-3">
    {categoryBreakdown.map(category => (
      <div
        key={category.name}
        className="flex items-center justify-between p-3 rounded-lg border"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            getCategoryColor(category.name)
          )}>
            {getCategoryIcon(category.name)}
          </div>
          <div>
            <p className="font-medium">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {category.expense_count} expense(s)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">
            {formatNumber(category.total_amount)} ₫
          </p>
          <p className="text-xs text-muted-foreground">
            {((category.total_amount / totalDebt) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    ))}
  </div>
</ExpandableCard>
```

**Data Structure:**
```tsx
interface CategoryBreakdown {
  name: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

const categoryBreakdown = useMemo(() => {
  // Group expenses by category
  const grouped = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    if (!acc[category]) {
      acc[category] = { name: category, total_amount: 0, expense_count: 0 };
    }
    acc[category].total_amount += expense.your_share;
    acc[category].expense_count += 1;
    return acc;
  }, {} as Record<string, CategoryBreakdown>);

  return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
}, [expenses]);
```

---

### 3. Timeline Visualization

**Location:** Optional expandable section

**Show:** Debt evolution over time

```tsx
{/* Debt Timeline */}
<ExpandableCard
  title="Balance Timeline"
  subtitle="How your balance changed over time"
  badge={<Badge variant="outline">History</Badge>}
  expanded={false}
>
  <div className="space-y-4">
    {/* Simple Timeline */}
    <div className="relative pl-8">
      {timelineEvents.map((event, index) => (
        <div key={index} className="relative pb-8 last:pb-0">
          {/* Timeline Line */}
          {index < timelineEvents.length - 1 && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-muted" />
          )}

          {/* Timeline Dot */}
          <div className={cn(
            "absolute left-0 top-0 h-4 w-4 rounded-full border-2 bg-background",
            event.type === 'expense' && 'border-red-500',
            event.type === 'payment' && 'border-green-500'
          )} />

          {/* Event Content */}
          <div className="ml-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.date)}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-semibold",
                  event.type === 'expense' && 'text-red-600',
                  event.type === 'payment' && 'text-green-600'
                )}>
                  {event.type === 'expense' ? '+' : '-'}
                  {formatNumber(event.amount)} ₫
                </p>
                <p className="text-xs text-muted-foreground">
                  Balance: {formatNumber(event.balance_after)} ₫
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</ExpandableCard>
```

**Data Structure:**
```tsx
interface TimelineEvent {
  date: string;
  type: 'expense' | 'payment';
  description: string;
  amount: number;
  balance_after: number;
}

const timelineEvents = useMemo(() => {
  // Combine expenses and payments, sort by date
  const events: TimelineEvent[] = [];

  let runningBalance = 0;

  // Add expenses
  userExpenses.forEach(expense => {
    runningBalance += expense.your_share;
    events.push({
      date: expense.expense_date,
      type: 'expense',
      description: expense.description,
      amount: expense.your_share,
      balance_after: runningBalance,
    });
  });

  // Add payments
  userPayments.forEach(payment => {
    runningBalance -= payment.amount;
    events.push({
      date: payment.payment_date,
      type: 'payment',
      description: `Payment to ${payment.recipient_name}`,
      amount: payment.amount,
      balance_after: runningBalance,
    });
  });

  return events.sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}, [userExpenses, userPayments]);
```

---

### 4. Settlement Priority Indicator

**Location:** Debt cards ("You Owe" section)

**Show:** Visual indicator of which debts to prioritize

```tsx
// Add to BalanceCard
interface BalanceCardProps {
  // ... existing props
  priority?: 'high' | 'medium' | 'low';
  lastActivity?: string;
}

{/* Priority Badge in BalanceCard */}
{priority && (
  <Badge
    variant="outline"
    className={cn(
      "text-xs",
      priority === 'high' && 'border-red-500 text-red-700',
      priority === 'medium' && 'border-yellow-500 text-yellow-700',
      priority === 'low' && 'border-gray-500 text-gray-700'
    )}
  >
    {priority === 'high' && '🔥 Priority'}
    {priority === 'medium' && '⚠️ Settle Soon'}
    {priority === 'low' && '✓ Can Wait'}
  </Badge>
)}

{lastActivity && (
  <p className="text-xs text-muted-foreground">
    Last activity: {formatDate(lastActivity, { relative: true })}
  </p>
)}
```

**Priority Calculation:**
```tsx
const calculatePriority = (
  amount: number,
  lastExpenseDate: string,
  expenseCount: number
): 'high' | 'medium' | 'low' => {
  const daysSinceLastExpense = differenceInDays(
    new Date(),
    new Date(lastExpenseDate)
  );

  // High priority: Large amount OR recent activity
  if (amount > 500000 || daysSinceLastExpense < 7) {
    return 'high';
  }

  // Medium priority: Moderate amount OR multiple expenses
  if (amount > 200000 || expenseCount > 5) {
    return 'medium';
  }

  // Low priority: Small amount AND old
  return 'low';
};
```

---

### 5. Simplified Debts Visualization

**Location:** When debt simplification enabled

**Show:** Before/after comparison

```tsx
{useServerSimplification && (
  <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
    <CardHeader>
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Debt Simplification</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Before/After Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Original</p>
            <p className="text-3xl font-bold text-red-600">
              {originalTransactionCount}
            </p>
            <p className="text-xs text-muted-foreground">transactions</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Optimized</p>
            <p className="text-3xl font-bold text-green-600">
              {simplifiedCount}
            </p>
            <p className="text-xs text-muted-foreground">transactions</p>
          </div>
        </div>

        {/* Savings */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                Reduced by {originalTransactionCount - simplifiedCount} transaction(s)
              </span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {Math.round(((originalTransactionCount - simplifiedCount) / originalTransactionCount) * 100)}% fewer
            </Badge>
          </div>
        </div>

        {/* Algorithm Info */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            How does this work?
          </summary>
          <p className="mt-2 leading-relaxed">
            We use the Min-Cost Max-Flow algorithm to optimize your group's debts.
            This reduces the number of transactions needed while preserving the exact
            same final balances for everyone.
          </p>
        </details>
      </div>
    </CardContent>
  </Card>
)}
```

---

### 6. Empty State Improvements

**Show contextual empty states with actionable suggestions**

```tsx
{/* No Debts - Encourage Activity */}
{balances.every(b => b.balance === 0) && expenses.length === 0 && (
  <Card className="border-2 border-dashed">
    <CardContent className="py-16 text-center">
      <div className="space-y-4">
        <div className="text-6xl mb-2">🎉</div>
        <div>
          <p className="font-semibold text-xl">Ready to track expenses!</p>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Add your first group expense to start splitting costs with members.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add First Expense
        </Button>
      </div>
    </CardContent>
  </Card>
)}

{/* All Settled - Celebrate */}
{balances.every(b => b.balance === 0) && expenses.length > 0 && (
  <Card className="border-2 bg-gradient-to-br from-green-50 to-emerald-50">
    <CardContent className="py-16 text-center">
      <div className="space-y-4">
        <div className="text-6xl mb-2">✅</div>
        <div>
          <p className="font-semibold text-xl text-green-900">
            All settled up!
          </p>
          <p className="text-green-700 mt-2">
            {expenses.length} expense(s) tracked, all balances cleared.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => go({ to: `/groups/${group.id}/expenses` })}
          >
            <HistoryIcon className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button
            onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Another
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## New Hooks Required

### `/src/hooks/use-expense-breakdown.ts`

```tsx
import { useMemo } from 'react';

interface ExpenseBreakdownParams {
  expenses: any[];
  currentUserId: string;
  otherUserId: string;
}

export function useExpenseBreakdown({
  expenses,
  currentUserId,
  otherUserId,
}: ExpenseBreakdownParams) {
  return useMemo(() => {
    // Filter expenses where both users are involved
    const sharedExpenses = expenses.filter(expense => {
      const splits = expense.expense_splits || [];
      return splits.some((s: any) =>
        s.user_id === currentUserId || s.user_id === otherUserId
      );
    });

    // Calculate user's share of each expense
    const breakdown = sharedExpenses.map(expense => {
      const userSplit = expense.expense_splits?.find(
        (s: any) => s.user_id === currentUserId
      );

      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        your_share: userSplit?.computed_amount || 0,
        expense_date: expense.expense_date,
        category: expense.category,
        paid_by_user_id: expense.paid_by_user_id,
      };
    });

    const total = breakdown.reduce((sum, e) => sum + e.your_share, 0);

    return { breakdown, total };
  }, [expenses, currentUserId, otherUserId]);
}
```

---

### `/src/hooks/use-category-breakdown.ts`

```tsx
import { useMemo } from 'react';

interface CategoryBreakdown {
  name: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

export function useCategoryBreakdown(expenses: any[], currentUserId: string) {
  return useMemo(() => {
    const grouped: Record<string, Omit<CategoryBreakdown, 'percentage'>> = {};
    let totalAmount = 0;

    expenses.forEach(expense => {
      const userSplit = expense.expense_splits?.find(
        (s: any) => s.user_id === currentUserId
      );

      if (!userSplit) return;

      const category = expense.category || 'Other';
      const amount = userSplit.computed_amount;

      if (!grouped[category]) {
        grouped[category] = {
          name: category,
          total_amount: 0,
          expense_count: 0,
        };
      }

      grouped[category].total_amount += amount;
      grouped[category].expense_count += 1;
      totalAmount += amount;
    });

    // Add percentage and sort
    const breakdown = Object.values(grouped)
      .map(cat => ({
        ...cat,
        percentage: (cat.total_amount / totalAmount) * 100,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return { breakdown, totalAmount };
  }, [expenses, currentUserId]);
}
```

---

## File Changes

### New Files

1. `/src/hooks/use-expense-breakdown.ts` - Expense breakdown logic
2. `/src/hooks/use-category-breakdown.ts` - Category grouping logic
3. `/src/lib/priority-calculator.ts` - Settlement priority logic

### Modified Files

1. `/src/modules/groups/pages/show.tsx` - Add visualization sections
2. `/src/components/groups/balance-card.tsx` - Add breakdown children
3. `/src/components/ui/expandable-card.tsx` - Ensure robust expansion

---

## Success Criteria

- [ ] Debt breakdown shows individual expenses in BalanceCard
- [ ] Category breakdown displays top spending categories
- [ ] Timeline visualization shows balance evolution
- [ ] Settlement priority badges visible on debt cards
- [ ] Simplified debts show before/after comparison
- [ ] Empty states provide actionable next steps
- [ ] All calculations accurate (breakdown totals match balances)
- [ ] Expandable sections collapse/expand smoothly
- [ ] Mobile layout responsive (no horizontal scroll)
- [ ] Performance: No lag with 100+ expenses

---

## Testing Checklist

1. **Expense Breakdown:** Verify totals match balance
2. **Category Grouping:** Test with mixed categories
3. **Timeline:** Verify chronological order, running balance accurate
4. **Priority:** Test with various amounts and dates
5. **Simplification:** Compare original vs simplified counts
6. **Empty States:** Test new group, settled group, active group
7. **Performance:** Test with 100+ expenses (should remain fast)
8. **Expansion:** Click all expandable sections, verify content

---

## Dependencies

**From Phase 1:**
- ExpandableCard component
- BalanceCard component (extend with priority prop)

**From Phase 2:**
- Debt cards section structure
- Balance calculation hooks

**New:**
- useExpenseBreakdown hook
- useCategoryBreakdown hook
- Priority calculator utility

---

## Next Phase

Phase 4: Member Management Simplification (streamline member operations)

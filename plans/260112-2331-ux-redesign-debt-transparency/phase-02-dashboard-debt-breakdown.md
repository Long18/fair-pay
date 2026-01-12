# Phase 2: Dashboard Debt Breakdown Section

**Status:** Not Started
**Priority:** High
**Effort:** 8-12 hours
**Dependencies:** Phase 1 (Typography system)

## Context

User feedback: "I can't understand what the total debt includes" - need to show breakdown of which expenses contribute to each person's balance.

## Overview

Add expandable "Debt Breakdown" section to dashboard showing list of people with amounts, expandable to view contributing expenses per person.

## Key Insights

- Users need to see "3 expenses with Alice" without clicking through
- Each person row should expand to show expense list
- Latest transaction date provides context
- Keep existing summary cards, add breakdown below

## Requirements

### Functional
- Show list of people user owes (or who owe user) with net amounts
- Each row expandable/collapsible to show contributing expenses
- Display expense count (e.g., "3 expenses")
- Show latest transaction date per person
- Clicking person row navigates to NEW debt breakdown page (Phase 3)
- "View Profile" as secondary action button

### Non-Functional
- Smooth expand/collapse animations
- Mobile-optimized touch targets (44x44px)
- Performant with 50+ people
- Accessible (keyboard navigation, screen reader support)

## Architecture

### Component Structure
```
Dashboard
└── Debt Breakdown Section
    ├── Section Header ("Your Debts" / "People Who Owe You")
    ├── Debt Summary Cards (You Owe / Owed to You / Net)
    └── Expandable Debt List
        └── Debt Row (per person)
            ├── Avatar + Name
            ├── Amount + Badge (I owe / Owes me)
            ├── Metadata (3 expenses • Last: 12/25)
            ├── Expand Icon
            └── Expanded View (Collapsible)
                ├── Contributing Expenses List
                │   └── Expense Item
                │       ├── Title + Date
                │       ├── Group (if any)
                │       ├── My Share (prominent)
                │       ├── Total (small)
                │       └── Status Badge
                └── Actions
                    ├── "View Full Breakdown" → /debts/:userId
                    └── "View Profile" (secondary)
```

### Data Flow
```
Dashboard
  ↓ useAggregatedDebts()
  ↓
DebtBreakdownSection
  ↓ (per person) fetchContributingExpenses(userId)
  ↓
ExpenseBreakdownList
  ↓ map(expense => ExpenseBreakdownItem)
  ↓
ExpenseBreakdownItem (shows my_share, status)
```

## Related Code Files

**Files to Modify:**
- `src/pages/dashboard.tsx` - Add DebtBreakdownSection below tabs
- `src/components/dashboard/BalanceTable.tsx` - Update navigation logic

**Files to Create:**
- `src/components/dashboard/debt-breakdown-section.tsx` - New section component
- `src/components/dashboard/debt-row-expandable.tsx` - Expandable person row
- `src/components/dashboard/contributing-expenses-list.tsx` - Expense breakdown list
- `src/components/dashboard/contributing-expense-item.tsx` - Individual expense item
- `src/hooks/use-contributing-expenses.ts` - Hook to fetch expenses per person

## Implementation Steps

### Step 1: Create Hook for Contributing Expenses
**File:** `src/hooks/use-contributing-expenses.ts`
```tsx
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';

interface ContributingExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_id?: string;
  group_name?: string;
  my_share: number;
  status: 'paid' | 'unpaid' | 'partial';
  is_settled: boolean;
}

export function useContributingExpenses(counterpartyId: string) {
  const { data: identity } = useGetIdentity<Profile>();
  const [expenses, setExpenses] = useState<ContributingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity?.id || !counterpartyId) return;

    async function fetchExpenses() {
      setIsLoading(true);
      setError(null);

      try {
        // Query expense_splits to find all expenses between current user and counterparty
        const { data: splits, error: splitsError } = await supabaseClient
          .from('expense_splits')
          .select(\`
            id,
            computed_amount,
            is_settled,
            settled_amount,
            expenses (
              id,
              description,
              amount,
              currency,
              expense_date,
              group_id,
              groups (name),
              expense_splits!inner (
                user_id,
                computed_amount,
                is_settled
              )
            )
          \`)
          .eq('user_id', identity.id)
          .eq('expenses.expense_splits.user_id', counterpartyId)
          .order('expenses(expense_date)', { ascending: false });

        if (splitsError) throw splitsError;

        // Transform data
        const transformedExpenses: ContributingExpense[] = (splits || []).map(split => ({
          id: split.expenses.id,
          description: split.expenses.description,
          amount: split.expenses.amount,
          currency: split.expenses.currency,
          expense_date: split.expenses.expense_date,
          group_id: split.expenses.group_id,
          group_name: split.expenses.groups?.name,
          my_share: split.computed_amount,
          status: split.is_settled
            ? 'paid'
            : split.settled_amount > 0
            ? 'partial'
            : 'unpaid',
          is_settled: split.is_settled,
        }));

        setExpenses(transformedExpenses);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExpenses();
  }, [identity?.id, counterpartyId]);

  return { expenses, isLoading, error };
}
```

### Step 2: Create Contributing Expense Item Component
**File:** `src/components/dashboard/contributing-expense-item.tsx`
```tsx
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPaymentStateColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

interface ContributingExpenseItemProps {
  id: string;
  description: string;
  expense_date: string;
  group_name?: string;
  my_share: number;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'partial';
}

export function ContributingExpenseItem({
  id,
  description,
  expense_date,
  group_name,
  my_share,
  amount,
  currency,
  status,
}: ContributingExpenseItemProps) {
  const go = useGo();
  const { t } = useTranslation();
  const statusColors = getPaymentStateColors(status);

  return (
    <div
      className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
      onClick={() => go({ to: \`/expenses/show/\${id}\` })}
    >
      {/* Left side: Expense info */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="typography-row-title truncate">{description}</h4>
          <Badge variant="outline" className={cn("text-xs", statusColors.bg, statusColors.text)}>
            {t(\`paymentState.\${status}\`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 typography-metadata">
          <span>{formatDateShort(expense_date)}</span>
          {group_name && (
            <>
              <span>•</span>
              <span>{group_name}</span>
            </>
          )}
          <span>•</span>
          <span className="text-muted-foreground/70">
            {t('expense.total')}: {formatCurrency(amount, currency)}
          </span>
        </div>
      </div>

      {/* Right side: My share (prominent) */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">
            {t('expense.myShare')}
          </p>
          <p className="typography-amount-prominent">
            {formatCurrency(my_share, currency)}
          </p>
        </div>
        <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
```

### Step 3: Create Contributing Expenses List Component
**File:** `src/components/dashboard/contributing-expenses-list.tsx`
```tsx
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { ContributingExpenseItem } from "./contributing-expense-item";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { AlertCircleIcon } from "@/components/ui/icons";

interface ContributingExpensesListProps {
  counterpartyId: string;
}

export function ContributingExpensesList({ counterpartyId }: ContributingExpensesListProps) {
  const { t } = useTranslation();
  const { expenses, isLoading, error } = useContributingExpenses(counterpartyId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 px-4 text-destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <span className="text-sm">{t('errors.loadingExpenses')}</span>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="py-4 px-4 text-center text-sm text-muted-foreground">
        {t('dashboard.noContributingExpenses')}
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2">
      {expenses.map(expense => (
        <ContributingExpenseItem key={expense.id} {...expense} />
      ))}
    </div>
  );
}
```

### Step 4: Create Expandable Debt Row Component
**File:** `src/components/dashboard/debt-row-expandable.tsx`
```tsx
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronRightIcon, UserIcon } from "@/components/ui/icons";
import { ContributingExpensesList } from "./contributing-expenses-list";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

interface DebtRowExpandableProps {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: number;
  currency: string;
  i_owe_them: boolean;
  transaction_count?: number;
  last_transaction_date?: string;
}

export function DebtRowExpandable({
  counterparty_id,
  counterparty_name,
  counterparty_avatar_url,
  amount,
  currency,
  i_owe_them,
  transaction_count = 0,
  last_transaction_date,
}: DebtRowExpandableProps) {
  const go = useGo();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColors = getOweStatusColors(i_owe_them ? 'owe' : 'owed');

  const initials = counterparty_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg overflow-hidden">
        {/* Main Row - Always Visible */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            {/* Left: Avatar + Name + Metadata */}
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
              <Avatar className="h-10 w-10 border-2 border-border">
                <AvatarImage src={counterparty_avatar_url || undefined} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h4 className="typography-row-title truncate">{counterparty_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={i_owe_them ? "default" : "secondary"} className="text-xs">
                    {i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
                  </Badge>
                  <span className="typography-metadata">
                    {transaction_count} {t('dashboard.expenses')}
                  </span>
                  {last_transaction_date && (
                    <>
                      <span className="typography-metadata">•</span>
                      <span className="typography-metadata">
                        {t('dashboard.lastTransaction', 'Last')}: {formatDateShort(last_transaction_date)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Amount + Expand Icon */}
            <div className="flex items-center gap-3">
              <span className={cn("typography-amount-prominent", statusColors.text)}>
                {i_owe_them ? '-' : '+'}
                {formatCurrency(amount, currency)}
              </span>
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5 text-muted-foreground transition-transform" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground transition-transform" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content - Contributing Expenses */}
        <CollapsibleContent>
          <div className="border-t bg-muted/20 px-2">
            <ContributingExpensesList counterpartyId={counterparty_id} />

            {/* Actions */}
            <div className="flex items-center gap-2 py-3 px-4 border-t">
              <Button
                onClick={() => go({ to: \`/debts/\${counterparty_id}\` })}
                className="flex-1"
              >
                {t('dashboard.viewFullBreakdown')}
              </Button>
              <Button
                variant="outline"
                onClick={() => go({ to: \`/profile/\${counterparty_id}\` })}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                {t('profile.viewProfile')}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
```

### Step 5: Create Debt Breakdown Section Component
**File:** `src/components/dashboard/debt-breakdown-section.tsx`
```tsx
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { DebtRowExpandable } from "./debt-row-expandable";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { ScaleIcon } from "@/components/ui/icons";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

interface DebtBreakdownSectionProps {
  showHistory?: boolean;
}

export function DebtBreakdownSection({ showHistory = false }: DebtBreakdownSectionProps) {
  const { t } = useTranslation();
  const { data: debts = [], isLoading } = useAggregatedDebts({ includeHistory: showHistory });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScaleIcon className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>{t('dashboard.allSettledUp')}</EmptyTitle>
          <EmptyDescription>
            {t('dashboard.noOutstandingDebts')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="typography-section-title">
        {t('dashboard.debtBreakdown')}
      </h2>
      <div className="space-y-3">
        {debts.map(debt => (
          <DebtRowExpandable
            key={debt.counterparty_id}
            counterparty_id={debt.counterparty_id}
            counterparty_name={debt.counterparty_name}
            counterparty_avatar_url={debt.counterparty_avatar_url}
            amount={Number(debt.remaining_amount ?? debt.amount)}
            currency={debt.currency}
            i_owe_them={debt.i_owe_them}
            transaction_count={debt.transaction_count}
            last_transaction_date={debt.last_transaction_date}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 6: Update Dashboard to Include Debt Breakdown
**File:** `src/pages/dashboard.tsx`

Add below BalanceTable (around line 184):
```tsx
<TabsContent value="balances" className="space-y-4 mt-6">
  {/* Show History Toggle */}
  {isAuthenticated && (
    <div className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
      {/* ... existing toggle code ... */}
    </div>
  )}

  {/* Error Display */}
  {debtsError && (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
      {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
    </div>
  )}

  {/* NEW: Debt Breakdown Section */}
  <div className="bg-card border rounded-lg shadow-sm overflow-hidden p-6">
    <DebtBreakdownSection showHistory={showHistory} />
  </div>

  {/* Legacy BalanceTable (can be removed later or kept for compatibility) */}
  <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
    <BalanceTable balances={balances} disabled={!isAuthenticated} showHistory={showHistory} />
  </div>
</TabsContent>
```

Add import:
```tsx
import { DebtBreakdownSection } from "@/components/dashboard/debt-breakdown-section";
```

### Step 7: Update BalanceTable Navigation
**File:** `src/components/dashboard/BalanceTable.tsx`

Update onClick handlers (line 141, 242) to navigate to debt breakdown page:
```tsx
// Mobile card onClick (line 141)
onClick={() => !disabled && go({ to: `/debts/${balance.counterparty_id}` })}

// Desktop table row onClick (line 242)
onClick={() => !disabled && go({ to: `/debts/${balance.counterparty_id}` })}
```

## Todo List

- [ ] Create use-contributing-expenses.ts hook
- [ ] Create contributing-expense-item.tsx component
- [ ] Create contributing-expenses-list.tsx component
- [ ] Create debt-row-expandable.tsx component
- [ ] Create debt-breakdown-section.tsx component
- [ ] Update dashboard.tsx to include debt breakdown section
- [ ] Update BalanceTable.tsx navigation to /debts/:userId
- [ ] Add translations for new keys (debtBreakdown, myShare, viewFullBreakdown, etc.)
- [ ] Test expand/collapse animations
- [ ] Test with 50+ people (performance)
- [ ] Test mobile touch targets (44x44px minimum)
- [ ] Verify keyboard navigation works
- [ ] Test screen reader accessibility

## Success Criteria

- [ ] User can see list of people they owe with amounts
- [ ] Each person row expandable to show contributing expenses
- [ ] "My share" prominently displayed for each expense
- [ ] Expense count and last transaction date visible
- [ ] Clicking "View Full Breakdown" navigates to /debts/:userId
- [ ] "View Profile" available as secondary action
- [ ] Smooth expand/collapse animations (<300ms)
- [ ] Works well with 50+ people (no performance issues)
- [ ] Touch targets meet 44x44px minimum
- [ ] Keyboard accessible (Tab, Enter, Space)

## Risk Assessment

**Medium Risk:**
- New RPC query for contributing expenses (need to test edge cases)
- Expand/collapse state management with many rows

**Mitigation:**
- Add comprehensive error handling in hook
- Lazy-load expense data on expand (not all at once)
- Add loading states for better UX
- Test with large datasets

## Security Considerations

- Ensure RPC function respects RLS policies
- Only show expenses user has permission to view
- Validate counterparty_id before fetching data

## Next Steps

After completion:
1. Test debt breakdown section with real data
2. Gather user feedback on expand/collapse UX
3. Proceed to Phase 3 (Person Debt Breakdown Page)

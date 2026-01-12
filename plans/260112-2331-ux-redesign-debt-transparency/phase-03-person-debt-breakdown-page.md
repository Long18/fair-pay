# Phase 3: Person Debt Breakdown Page (NEW VIEW)

**Status:** Not Started
**Priority:** High
**Effort:** 12-16 hours
**Dependencies:** Phase 2 (Debt breakdown UI patterns)

## Context

User expectation: "When I click a person, show what I owe them, broken down by expense."
Current behavior: Clicking person navigates to profile page (wrong expectation).

## Overview

Create NEW route `/debts/:userId` showing comprehensive breakdown of debts with specific person, emphasizing user-centric data ("my share"), providing settle actions, and listing contributing expenses.

## Key Insights

- Profile page shows general user info; debt breakdown is financial-focused
- User needs to answer: "What do I owe this person? Which expenses? What should I pay?"
- Settlement should be prominent CTA, not buried in UI
- Profile remains accessible via secondary action

## Requirements

### Functional
- Header: Person name + avatar + net position (I owe X / They owe me Y)
- Main content: "Expenses contributing to this balance"
  - Per expense: title, date, group, total (small), MY SHARE (prominent), status badge
  - Optional "Details" expand for full split breakdown
- "What to pay now" panel:
  - Recommended amount (default: full outstanding)
  - Select specific expenses (checkboxes) for partial settlement
  - Primary CTA: "Settle selected" or "Settle full amount"
  - Payment note: "Settlements marked manually for now"
- Secondary actions:
  - "View Profile" button
  - "Add Expense" button (quick action)

### Non-Functional
- Fast load (<500ms for 50 expenses)
- Mobile-optimized layout
- Accessible keyboard navigation
- Export functionality (CSV/PDF)

## Architecture

### Route & Component Structure
```
/debts/:userId
└── PersonDebtBreakdownPage
    ├── DebtBreakdownHeader
    │   ├── Avatar + Name
    │   ├── Net Position Display (prominent)
    │   ├── Actions: Add Expense | View Profile
    │   └── Back Button
    ├── WhatToPayNowPanel
    │   ├── Recommended Amount
    │   ├── Checkbox: Select all/partial
    │   ├── Primary CTA: Settle
    │   └── Payment Note
    ├── ContributingExpensesSection
    │   ├── Section Title
    │   ├── Filter/Sort Controls (Status, Date)
    │   └── ExpenseBreakdownList
    │       └── ExpenseBreakdownItem
    │           ├── Checkbox (for settlement)
    │           ├── Title + Date + Group
    │           ├── MY SHARE (prominent)
    │           ├── Total Amount (small)
    │           ├── Status Badge
    │           └── Expand Details (optional)
    └── EmptyState (if no expenses)
```

### Data Flow
```
PersonDebtBreakdownPage
  ↓ useParams().userId
  ↓ useDebtSummary(userId) → net position
  ↓ useContributingExpenses(userId) → expense list
  ↓
WhatToPayNowPanel
  ↓ selected expenses → calculate total
  ↓ onSettle → mark splits as settled
  ↓ refetch data
```

## Related Code Files

**Files to Create:**
- `src/pages/person-debt-breakdown.tsx` - New page component
- `src/components/debts/debt-breakdown-header.tsx` - Header with person info
- `src/components/debts/what-to-pay-now-panel.tsx` - Settlement panel
- `src/components/debts/contributing-expenses-section.tsx` - Expenses list with actions
- `src/components/debts/expense-breakdown-item-selectable.tsx` - Selectable expense row
- `src/hooks/use-debt-summary.ts` - Hook for net position data
- `src/hooks/use-settle-splits.ts` - Hook for settlement logic

**Files to Modify:**
- `src/App.tsx` - Add new route /debts/:userId

## Implementation Steps

### Step 1: Create Debt Summary Hook
**File:** `src/hooks/use-debt-summary.ts`
```tsx
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  total_i_owe: number;
  total_they_owe: number;
  net_amount: number;
  i_owe_them: boolean;
  currency: string;
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
}

export function useDebtSummary(counterpartyId: string) {
  const { data: identity } = useGetIdentity<Profile>();
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity?.id || !counterpartyId) return;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);

      try {
        // Use RPC function to calculate net debt position
        const { data, error: rpcError } = await supabaseClient.rpc(
          'get_debt_summary_between_users',
          {
            p_user_id: identity.id,
            p_counterparty_id: counterpartyId
          }
        );

        if (rpcError) throw rpcError;

        setSummary(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSummary();
  }, [identity?.id, counterpartyId]);

  const refetch = () => {
    // Trigger re-fetch
    setSummary(null);
    setIsLoading(true);
  };

  return { summary, isLoading, error, refetch };
}
```

### Step 2: Create Settle Splits Hook
**File:** `src/hooks/use-settle-splits.ts`
```tsx
import { useState } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useSettleSplits() {
  const { t } = useTranslation();
  const [isSettling, setIsSettling] = useState(false);

  const settle = async (splitIds: string[]) => {
    setIsSettling(true);

    try {
      // Update splits as settled
      const { error } = await supabaseClient
        .from('expense_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settled_amount: supabaseClient.raw('computed_amount'), // Set settled amount to computed amount
        })
        .in('id', splitIds);

      if (error) throw error;

      toast.success(t('debts.settleSuccess', 'Splits marked as settled'));
      return true;
    } catch (error) {
      console.error('Error settling splits:', error);
      toast.error(t('debts.settleError', 'Failed to mark splits as settled'));
      return false;
    } finally {
      setIsSettling(false);
    }
  };

  return { settle, isSettling };
}
```

### Step 3: Create Debt Breakdown Header Component
**File:** `src/components/debts/debt-breakdown-header.tsx`
```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, UserIcon, PlusCircleIcon } from "@/components/ui/icons";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

interface DebtBreakdownHeaderProps {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  net_amount: number;
  i_owe_them: boolean;
  currency: string;
  unpaid_count: number;
  partial_count: number;
}

export function DebtBreakdownHeader({
  counterparty_id,
  counterparty_name,
  counterparty_avatar_url,
  net_amount,
  i_owe_them,
  currency,
  unpaid_count,
  partial_count,
}: DebtBreakdownHeaderProps) {
  const go = useGo();
  const { t } = useTranslation();
  const statusColors = getOweStatusColors(i_owe_them ? 'owe' : 'owed');

  const initials = counterparty_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-b pb-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => go({ to: '/' })}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => go({ to: `/expenses/create?friend=${counterparty_id}` })}>
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            {t('debts.addExpense')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => go({ to: `/profile/${counterparty_id}` })}>
            <UserIcon className="h-4 w-4 mr-2" />
            {t('profile.viewProfile')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-border">
          <AvatarImage src={counterparty_avatar_url || undefined} />
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="typography-page-title mb-2">{counterparty_name}</h1>
          <div className="flex items-center gap-3">
            <Badge variant={i_owe_them ? "destructive" : "default"} className="text-sm">
              {i_owe_them ? t('debts.youOwe') : t('debts.owesYou')}
            </Badge>
            <span className={cn("typography-amount-prominent", statusColors.text)}>
              {formatCurrency(net_amount, currency)}
            </span>
            {(unpaid_count > 0 || partial_count > 0) && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="typography-metadata">
                  {unpaid_count} {t('debts.unpaid')}, {partial_count} {t('debts.partial')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Create "What to Pay Now" Panel Component
**File:** `src/components/debts/what-to-pay-now-panel.tsx`
```tsx
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { BanknoteIcon, InfoIcon } from "@/components/ui/icons";
import { useSettleSplits } from "@/hooks/use-settle-splits";

interface WhatToPayNowPanelProps {
  selectedExpenseIds: string[];
  expenses: Array<{
    id: string;
    split_id: string;
    my_share: number;
    status: 'paid' | 'unpaid' | 'partial';
  }>;
  currency: string;
  onSettleComplete: () => void;
}

export function WhatToPayNowPanel({
  selectedExpenseIds,
  expenses,
  currency,
  onSettleComplete,
}: WhatToPayNowPanelProps) {
  const { t } = useTranslation();
  const { settle, isSettling } = useSettleSplits();

  const selectedExpenses = useMemo(() => {
    return expenses.filter(e => selectedExpenseIds.includes(e.id));
  }, [expenses, selectedExpenseIds]);

  const totalToSettle = useMemo(() => {
    return selectedExpenses
      .filter(e => e.status !== 'paid')
      .reduce((sum, e) => sum + e.my_share, 0);
  }, [selectedExpenses]);

  const handleSettle = async () => {
    const splitIds = selectedExpenses
      .filter(e => e.status !== 'paid')
      .map(e => e.split_id);

    if (splitIds.length === 0) return;

    const success = await settle(splitIds);
    if (success) {
      onSettleComplete();
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BanknoteIcon className="h-5 w-5" />
          {t('debts.whatToPayNow')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {t('debts.recommendedAmount')}
            </p>
            <p className="typography-amount-prominent text-2xl">
              {formatCurrency(totalToSettle, currency)}
            </p>
            {selectedExpenses.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedExpenses.length} {t('debts.expensesSelected')}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-sm">
            {selectedExpenses.filter(e => e.status !== 'paid').length} {t('debts.unsettled')}
          </Badge>
        </div>

        <Button
          onClick={handleSettle}
          disabled={selectedExpenses.length === 0 || isSettling}
          className="w-full"
          size="lg"
        >
          {isSettling
            ? t('debts.settling')
            : selectedExpenses.length === 0
            ? t('debts.selectExpenses')
            : t('debts.settleSelected')}
        </Button>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <InfoIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t('debts.manualSettlementNote', 'Settlements are marked manually. Make sure to complete payment outside the app before marking as settled.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 5: Create Person Debt Breakdown Page
**File:** `src/pages/person-debt-breakdown.tsx`
```tsx
import { useState, useMemo } from "react";
import { useParams } from "react-router";
import { useDebtSummary } from "@/hooks/use-debt-summary";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { DebtBreakdownHeader } from "@/components/debts/debt-breakdown-header";
import { WhatToPayNowPanel } from "@/components/debts/what-to-pay-now-panel";
import { ContributingExpensesSection } from "@/components/debts/contributing-expenses-section";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { AlertCircleIcon } from "@/components/ui/icons";

export const PersonDebtBreakdownPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  const { summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useDebtSummary(userId!);
  const { expenses, isLoading: isExpensesLoading, error: expensesError, refetch: refetchExpenses } = useContributingExpenses(userId!);

  const handleToggleExpense = (expenseId: string) => {
    setSelectedExpenseIds(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExpenseIds.length === expenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(expenses.map(e => e.id));
    }
  };

  const handleSettleComplete = () => {
    setSelectedExpenseIds([]);
    refetchSummary();
    refetchExpenses();
  };

  if (isSummaryLoading || isExpensesLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (summaryError || expensesError) {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <span>{t('errors.loadingDebtData')}</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <DebtBreakdownHeader
        counterparty_id={summary.counterparty_id}
        counterparty_name={summary.counterparty_name}
        counterparty_avatar_url={summary.counterparty_avatar_url}
        net_amount={summary.net_amount}
        i_owe_them={summary.i_owe_them}
        currency={summary.currency}
        unpaid_count={summary.unpaid_count}
        partial_count={summary.partial_count}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <ContributingExpensesSection
            expenses={expenses}
            selectedExpenseIds={selectedExpenseIds}
            onToggleExpense={handleToggleExpense}
            onSelectAll={handleSelectAll}
          />
        </div>

        <div className="order-1 lg:order-2">
          <WhatToPayNowPanel
            selectedExpenseIds={selectedExpenseIds}
            expenses={expenses}
            currency={summary.currency}
            onSettleComplete={handleSettleComplete}
          />
        </div>
      </div>
    </div>
  );
};
```

### Step 6: Add Route to App
**File:** `src/App.tsx`

Add route in authenticated section (around line 433):
```tsx
<Route path="/debts/:userId" element={
  <Suspense fallback={<PageLoader />}>
    <ErrorBoundary context="Person Debt Breakdown">
      <PersonDebtBreakdownPage />
    </ErrorBoundary>
  </Suspense>
} />
```

Add lazy import at top:
```tsx
const PersonDebtBreakdownPage = lazy(() => import("./pages/person-debt-breakdown").then(m => ({ default: m.PersonDebtBreakdownPage })));
```

### Step 7: Create RPC Function for Debt Summary
**Database Migration:** Create RPC function `get_debt_summary_between_users`:

```sql
CREATE OR REPLACE FUNCTION get_debt_summary_between_users(
  p_user_id UUID,
  p_counterparty_id UUID
)
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_avatar_url TEXT,
  total_i_owe NUMERIC,
  total_they_owe NUMERIC,
  net_amount NUMERIC,
  i_owe_them BOOLEAN,
  currency TEXT,
  unpaid_count INTEGER,
  partial_count INTEGER,
  paid_count INTEGER
) AS $$
BEGIN
  -- Calculate debt summary between two users
  -- Implementation details omitted for brevity
  -- Returns aggregated data from expense_splits
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Todo List

- [ ] Create use-debt-summary.ts hook
- [ ] Create use-settle-splits.ts hook
- [ ] Create debt-breakdown-header.tsx component
- [ ] Create what-to-pay-now-panel.tsx component
- [ ] Create contributing-expenses-section.tsx component (reuse from Phase 2 with selection)
- [ ] Create person-debt-breakdown.tsx page
- [ ] Add /debts/:userId route to App.tsx
- [ ] Create RPC function get_debt_summary_between_users
- [ ] Test migration and RPC function
- [ ] Add translations for new keys
- [ ] Test settlement flow end-to-end
- [ ] Test with 100+ expenses (performance)
- [ ] Test mobile layout (320px-768px)
- [ ] Test accessibility (keyboard, screen reader)

## Success Criteria

- [ ] User sees person name, avatar, net position
- [ ] "What to pay now" panel shows recommended amount
- [ ] User can select individual expenses for partial settlement
- [ ] "Settle selected" marks splits as settled
- [ ] Contributing expenses show "my share" prominently
- [ ] Status badges clear (Paid/Unpaid/Partial)
- [ ] "View Profile" available as secondary action
- [ ] Page loads <500ms with 50 expenses
- [ ] Mobile-optimized layout
- [ ] Keyboard accessible

## Risk Assessment

**Medium Risk:**
- New RPC function for debt summary (needs thorough testing)
- Settlement logic affecting database state

**Mitigation:**
- Add comprehensive tests for RPC function
- Validate settlement permissions (only user can mark own splits as settled)
- Add optimistic UI updates for better UX
- Include rollback logic for failed settlements

## Security Considerations

- Ensure RPC function respects RLS policies
- Validate user can only settle their own splits
- Prevent unauthorized access to debt breakdown page
- Log settlement actions for audit trail

## Next Steps

After completion:
1. Test settlement flow with real payments
2. Gather user feedback on "What to pay now" panel
3. Proceed to Phase 4 (Expense Detail User-Centric View)

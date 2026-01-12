# Phase 4: Expense Detail User-Centric View

**Status:** Not Started
**Priority:** Medium
**Effort:** 6-8 hours
**Dependencies:** Phase 1 (Typography system)

## Context

User feedback: "Transaction detail is cluttered and not user-centric - I can't see how much I owe per expense."

## Overview

Redesign expense detail page to prominently show "Your position" at top, emphasize user's row in participants table, and provide clear "Settle" section with actionable CTA.

## Key Insights

- Current expense detail shows all participants equally - user's share not prominent
- Need to answer immediately: "How much do I owe?" not "What's the total expense?"
- Settlement action should be obvious, not hidden
- Participants table should visually emphasize current user's row

## Requirements

### Functional
- **Your Position Section** (top of page):
  - "You owe: X"
  - "You are owed: Y" (if user paid more than share)
  - "Net for this expense: Z"
- **Participants Table**:
  - Columns: Person | Role (Paid/Participant) | Share | Paid Status | Action
  - User's row visually emphasized (bold font, border, background tint - NOT color change)
  - Clear role indicators (icons for payer vs participant)
- **Settle Section** (prominent):
  - Statement: "You owe [Person] [Amount] for this expense"
  - Primary CTA: "Mark as paid" (manual settlement)
  - Future: "Pay via..." for integrated payments

### Non-Functional
- Maintain existing functionality (edit, delete, attachments)
- Keep color theme unchanged
- Mobile-responsive layout
- Accessible to screen readers

## Architecture

### Component Structure
```
ExpenseShow
├── ExpenseHeader (existing, update breadcrumbs)
├── YOUR POSITION SECTION (NEW)
│   ├── Your Status Card
│   │   ├── You Owe: X (if owe)
│   │   ├── You Are Owed: Y (if owed)
│   │   └── Net: Z
│   └── Quick Actions
│       └── "Settle Your Share" button
├── Expense Details (existing)
│   ├── Amount Display
│   ├── Date, Category, Group
│   └── Description
├── PARTICIPANTS TABLE (REDESIGNED)
│   ├── Table Header
│   └── Participant Rows
│       └── User Row (emphasized with border + bold)
│           ├── Avatar + Name
│           ├── Role Badge (Paid/Participant)
│           ├── Share Amount (prominent)
│           ├── Status Badge
│           └── Action Button
├── SETTLE SECTION (NEW, below table)
│   ├── Settlement Statement
│   ├── Primary CTA: "Mark as Paid"
│   └── Secondary: "Request Payment" (if owed)
└── Attachments Section (existing)
```

### Data Calculation
```tsx
// Calculate user position
const myShare = splits.find(s => s.user_id === identity.id)?.computed_amount || 0;
const iPaid = expense.paid_by_user_id === identity.id ? expense.amount : 0;
const iOwe = myShare - iPaid;
const iAmOwed = iPaid > myShare ? iPaid - myShare : 0;
const netPosition = iAmOwed - iOwe;
```

## Related Code Files

**Files to Modify:**
- `src/modules/expenses/pages/show.tsx` - Main expense detail page
- `src/modules/expenses/components/expense-split-card.tsx` - Participant row styling
- `src/modules/expenses/components/settle-split-dialog.tsx` - Settlement dialog

**Files to Create:**
- `src/components/expenses/your-position-card.tsx` - User position summary
- `src/components/expenses/settle-expense-section.tsx` - Settlement CTA section
- `src/components/expenses/participants-table-enhanced.tsx` - Redesigned participants table

## Implementation Steps

### Step 1: Create "Your Position" Card Component
**File:** `src/components/expenses/your-position-card.tsx`
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { UserIcon } from "@/components/ui/icons";

interface YourPositionCardProps {
  iOwe: number;
  iAmOwed: number;
  netPosition: number;
  currency: string;
  isSettled: boolean;
}

export function YourPositionCard({
  iOwe,
  iAmOwed,
  netPosition,
  currency,
  isSettled,
}: YourPositionCardProps) {
  const { t } = useTranslation();
  const hasDebt = iOwe > 0;
  const hasCredit = iAmOwed > 0;
  const statusColors = getOweStatusColors(hasDebt ? 'owe' : hasCredit ? 'owed' : 'settled');

  return (
    <Card className={cn("border-2", isSettled && "bg-muted/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserIcon className="h-5 w-5" />
          {t('expense.yourPosition')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasDebt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('expense.youOwe')}</span>
            <span className={cn("typography-amount-prominent", getOweStatusColors('owe').text)}>
              {formatCurrency(iOwe, currency)}
            </span>
          </div>
        )}
        {hasCredit && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('expense.youAreOwed')}</span>
            <span className={cn("typography-amount-prominent", getOweStatusColors('owed').text)}>
              {formatCurrency(iAmOwed, currency)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-medium">{t('expense.netForThisExpense')}</span>
          <div className="flex items-center gap-2">
            {isSettled && (
              <Badge variant="outline" className="text-xs">
                {t('status.settled')}
              </Badge>
            )}
            <span className={cn("typography-amount-prominent text-lg", statusColors.text)}>
              {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition, currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Create Settle Expense Section Component
**File:** `src/components/expenses/settle-expense-section.tsx`
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { BanknoteIcon, CheckCircle2Icon } from "@/components/ui/icons";

interface SettleExpenseSectionProps {
  payerName: string;
  amountOwed: number;
  currency: string;
  isSettled: boolean;
  onSettle: () => void;
  isSettling: boolean;
}

export function SettleExpenseSection({
  payerName,
  amountOwed,
  currency,
  isSettled,
  onSettle,
  isSettling,
}: SettleExpenseSectionProps) {
  const { t } = useTranslation();

  if (isSettled) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <CheckCircle2Icon className="h-5 w-5 text-success" />
          <span className="font-medium text-success">{t('expense.alreadySettled')}</span>
        </CardContent>
      </Card>
    );
  }

  if (amountOwed <= 0) {
    return null; // User doesn't owe anything
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BanknoteIcon className="h-5 w-5" />
          {t('expense.settleYourShare')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('expense.youOweStatement', { name: payerName, amount: formatCurrency(amountOwed, currency) })}
        </p>
        <Button
          onClick={onSettle}
          disabled={isSettling}
          className="w-full"
          size="lg"
        >
          {isSettling ? t('expense.settling') : t('expense.markAsPaid')}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t('expense.manualSettlementNote')}
        </p>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Update Expense Show Page
**File:** `src/modules/expenses/pages/show.tsx`

Add after ExpenseHeader (around line 200):
```tsx
{/* YOUR POSITION SECTION (NEW) */}
{identity?.id && (
  <div className="mb-6">
    <YourPositionCard
      iOwe={userIOwes}
      iAmOwed={userIsOwed}
      netPosition={netPosition}
      currency={expense.currency}
      isSettled={userSplit?.is_settled || false}
    />
  </div>
)}

{/* Expense Details Card (existing) */}
<Card className="mb-6">
  {/* ... existing expense details ... */}
</Card>

{/* PARTICIPANTS SECTION (REDESIGNED) */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle>{t('expense.participants')}</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('expense.person')}</TableHead>
          <TableHead>{t('expense.role')}</TableHead>
          <TableHead className="text-right">{t('expense.share')}</TableHead>
          <TableHead>{t('expense.status')}</TableHead>
          <TableHead className="text-right">{t('expense.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {splits.map((split) => {
          const isCurrentUser = split.user_id === identity?.id;
          return (
            <TableRow
              key={split.id}
              className={cn(
                isCurrentUser && "border-2 border-primary/30 bg-primary/5 font-medium"
              )}
            >
              {/* Person */}
              <TableCell className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={split.profiles?.avatar_url} />
                  <AvatarFallback>{split.profiles?.full_name[0]}</AvatarFallback>
                </Avatar>
                <span className={cn(isCurrentUser && "font-semibold")}>
                  {split.profiles?.full_name}
                  {isCurrentUser && ` (${t('common.you')})`}
                </span>
              </TableCell>

              {/* Role */}
              <TableCell>
                <Badge variant={split.user_id === expense.paid_by_user_id ? "default" : "secondary"}>
                  {split.user_id === expense.paid_by_user_id ? t('expense.paid') : t('expense.participant')}
                </Badge>
              </TableCell>

              {/* Share - Emphasize for current user */}
              <TableCell className="text-right">
                <span className={cn(
                  "typography-amount",
                  isCurrentUser && "typography-amount-prominent text-lg"
                )}>
                  {formatCurrency(split.computed_amount, expense.currency)}
                </span>
              </TableCell>

              {/* Status */}
              <TableCell>
                <PaymentStateBadge state={split.is_settled ? 'paid' : split.settled_amount > 0 ? 'partial' : 'unpaid'} />
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                {isCurrentUser && !split.is_settled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSettleDialog(split)}
                  >
                    {t('expense.settle')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </CardContent>
</Card>

{/* SETTLE SECTION (NEW) */}
{identity?.id && userSplit && !userSplit.is_settled && userIOwes > 0 && (
  <div className="mb-6">
    <SettleExpenseSection
      payerName={payerName}
      amountOwed={userIOwes}
      currency={expense.currency}
      isSettled={userSplit.is_settled}
      onSettle={handleSettleUserSplit}
      isSettling={isSettling}
    />
  </div>
)}

{/* Attachments (existing) */}
{attachments.length > 0 && (
  <Card>
    {/* ... existing attachments ... */}
  </Card>
)}
```

Add calculations at top of component:
```tsx
// Calculate user position
const userSplit = splits.find(s => s.user_id === identity?.id);
const myShare = userSplit?.computed_amount || 0;
const iPaid = expense.paid_by_user_id === identity?.id ? expense.amount : 0;
const userIOwes = myShare > iPaid ? myShare - iPaid : 0;
const userIsOwed = iPaid > myShare ? iPaid - myShare : 0;
const netPosition = userIsOwed - userIOwes;
const payerName = splits.find(s => s.user_id === expense.paid_by_user_id)?.profiles?.full_name || t('common.unknown');

const handleSettleUserSplit = async () => {
  if (!userSplit) return;
  setIsSettling(true);
  // Call settle API
  const { error } = await supabaseClient
    .from('expense_splits')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('id', userSplit.id);

  if (error) {
    toast.error(t('expense.settleError'));
  } else {
    toast.success(t('expense.settleSuccess'));
    refetchExpense();
  }
  setIsSettling(false);
};
```

## Todo List

- [ ] Create your-position-card.tsx component
- [ ] Create settle-expense-section.tsx component
- [ ] Update expense show.tsx with new sections
- [ ] Add user position calculations
- [ ] Emphasize current user row in participants table (border + bold)
- [ ] Add settlement handler for user's own split
- [ ] Add translations for new keys
- [ ] Test "Your Position" card with various scenarios (owe, owed, settled)
- [ ] Test participants table emphasis (visible but not garish)
- [ ] Test settlement flow
- [ ] Test mobile layout
- [ ] Test accessibility

## Success Criteria

- [ ] "Your Position" section at top shows: You owe X, You are owed Y, Net Z
- [ ] Current user's row in participants table visually emphasized
- [ ] "Settle" section prominently displayed (if user owes money)
- [ ] "Mark as Paid" CTA works and updates split status
- [ ] Mobile layout stacks sections appropriately
- [ ] Screen readers announce user's position correctly
- [ ] Visual emphasis clear but not overwhelming

## Risk Assessment

**Low Risk:**
- UI-only changes, no data model modifications
- Reusing existing settlement logic

**Mitigation:**
- Test with various expense scenarios (paid, owed, settled, group, 1-on-1)
- Ensure visual emphasis doesn't break on light/dark themes

## Security Considerations

- Validate user can only settle their own split
- Ensure position calculations match database constraints

## Next Steps

After completion:
1. Test with real expenses across different scenarios
2. Gather feedback on "Your Position" clarity
3. Proceed to Phase 5 (Filters Stabilization)

# Phase 5: Settlement Flow Enhancement

**Status:** Pending
**Priority:** High (Core User Action)
**Estimated Time:** 10-12 hours
**Dependencies:** Phase 2 (Group Detail Redesign), Phase 3 (Balance Visualization)

---

## Overview

Streamline debt settlement process with prominent buttons, quick actions, and clear confirmation flow.

---

## Current Issues

**Problems:**
- Settlement requires navigation to payment creation page
- No quick "Pay Now" action from balance view
- Unclear what happens after creating payment
- No settlement suggestions (optimal amounts)
- Missing payment methods guidance

---

## Solution Components

### 1. Prominent Settlement Buttons

**Location:** Inside debt cards (Phase 2), hero section (Phase 2)

**Already Specified in Phase 1:** SettlementButton component
**Now:** Integrate throughout UI

```tsx
{/* Primary Settlement - Debt Card */}
<BalanceCard status="owe" ...>
  <SettlementButton
    amount={debtAmount}
    currency="VND"
    recipientName={userName}
    onClick={() => handleQuickSettle(userId, debtAmount)}
  />
</BalanceCard>

{/* Secondary Settlement - Hero Section */}
{totalIOwe > 0 && (
  <Button
    variant="default"
    size="lg"
    className="w-full sm:w-auto"
    onClick={() => handleSettleAllDialog()}
  >
    <CheckCircle2Icon className="h-4 w-4 mr-2" />
    Settle All Debts ({formatNumber(totalIOwe)} ₫)
  </Button>
)}
```

---

### 2. Quick Settlement Dialog

**Replace navigation with in-page dialog for faster flow**

```tsx
{/* Quick Settlement Dialog */}
<Dialog open={quickSettleDialogOpen} onOpenChange={setQuickSettleDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <BanknoteIcon className="h-5 w-5 text-primary" />
        Settle Debt with {selectedUser?.name}
      </DialogTitle>
      <DialogDescription>
        Record a payment to settle your debt.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Amount Display */}
      <div className="p-4 rounded-lg bg-accent">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount to Pay</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatNumber(settlementAmount)} ₫
            </p>
            <p className="text-xs text-muted-foreground">
              Full balance
            </p>
          </div>
        </div>
      </div>

      {/* Partial Payment Option */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="partial"
            checked={isPartialPayment}
            onCheckedChange={setIsPartialPayment}
          />
          <label htmlFor="partial" className="text-sm font-medium">
            Pay partial amount
          </label>
        </div>
        {isPartialPayment && (
          <div className="ml-6">
            <Input
              type="number"
              placeholder="Enter amount"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              min="1"
              max={settlementAmount}
            />
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Method</label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">💵 Cash</SelectItem>
            <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
            <SelectItem value="momo">📱 MoMo</SelectItem>
            <SelectItem value="zalopay">🔵 ZaloPay</SelectItem>
            <SelectItem value="other">📋 Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Date</label>
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Notes (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes (optional)</label>
        <Textarea
          placeholder="Add any notes about this payment..."
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          rows={3}
        />
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setQuickSettleDialogOpen(false)}
      >
        Cancel
      </Button>
      <Button
        onClick={handleConfirmSettlement}
        disabled={isCreatingPayment}
      >
        {isCreatingPayment ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Recording...
          </>
        ) : (
          <>
            <CheckCircle2Icon className="h-4 w-4 mr-2" />
            Record Payment
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 3. Settlement Suggestions

**Show optimal settlement amounts**

```tsx
{/* Settlement Suggestions */}
{debtAmount > 100000 && (
  <div className="space-y-2 mt-4">
    <p className="text-sm font-medium">Quick Amounts:</p>
    <div className="flex gap-2 flex-wrap">
      {/* Round Numbers */}
      {[50000, 100000, 200000, 500000]
        .filter(amt => amt <= debtAmount)
        .map(amt => (
          <Badge
            key={amt}
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => {
              setIsPartialPayment(true);
              setPartialAmount(amt.toString());
            }}
          >
            {formatNumber(amt)} ₫
          </Badge>
        ))
      }
      {/* Half Balance */}
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-accent"
        onClick={() => {
          setIsPartialPayment(true);
          setPartialAmount(Math.round(debtAmount / 2).toString());
        }}
      >
        Half ({formatNumber(Math.round(debtAmount / 2))} ₫)
      </Badge>
    </div>
  </div>
)}
```

---

### 4. Settlement Confirmation Success

**Clear success feedback with next actions**

```tsx
{/* Success Toast Enhancement */}
const handleConfirmSettlement = async () => {
  try {
    setIsCreatingPayment(true);

    const amount = isPartialPayment ? parseFloat(partialAmount) : settlementAmount;

    await createPayment({
      from_user_id: identity?.id,
      to_user_id: selectedUser.id,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes: paymentNotes,
      group_id: group.id,
    });

    // Success feedback
    toast.success(
      <div className="space-y-1">
        <p className="font-semibold">Payment recorded successfully!</p>
        <p className="text-sm text-muted-foreground">
          {formatNumber(amount)} ₫ paid to {selectedUser.name}
        </p>
      </div>,
      {
        action: {
          label: 'View',
          onClick: () => go({ to: `/groups/${group.id}#payments` }),
        },
      }
    );

    // Close dialog
    setQuickSettleDialogOpen(false);

    // Refresh balances
    expensesQuery.refetch();
    paymentsQuery.refetch();

    // Show remaining balance if partial
    if (isPartialPayment && amount < settlementAmount) {
      const remaining = settlementAmount - amount;
      setTimeout(() => {
        toast.info(
          `Remaining balance: ${formatNumber(remaining)} ₫`,
          {
            action: {
              label: 'Pay More',
              onClick: () => {
                setSettlementAmount(remaining);
                setQuickSettleDialogOpen(true);
              },
            },
          }
        );
      }, 1500);
    }

  } catch (error) {
    toast.error(`Failed to record payment: ${error.message}`);
  } finally {
    setIsCreatingPayment(false);
  }
};
```

---

### 5. Settle All Dialog Enhancement

**Already exists, enhance with payment method selection**

```tsx
{/* Enhanced Settle All Dialog */}
<Dialog open={settleAllDialogOpen} onOpenChange={setSettleAllDialogOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Settle All Group Debts</DialogTitle>
      <DialogDescription>
        This will mark all unsettled expenses as paid. This action cannot be undone.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-accent">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Debts</span>
              <span className="font-semibold">
                {formatNumber(unsettledTotal)} ₫
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Unsettled Splits</span>
              <span className="font-semibold">{unsettledCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method for All */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Default Payment Method</label>
        <Select value={bulkPaymentMethod} onValueChange={setBulkPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">💵 Cash</SelectItem>
            <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
            <SelectItem value="momo">📱 MoMo</SelectItem>
            <SelectItem value="other">📋 Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Warning */}
      <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
        <AlertTriangleIcon className="h-5 w-5 text-yellow-600 shrink-0" />
        <div className="text-sm text-yellow-900">
          <p className="font-medium mb-1">This will settle all debts at once</p>
          <p className="text-yellow-700">
            All {unsettledCount} unsettled splits will be marked as paid.
            Make sure everyone has actually been paid first.
          </p>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setSettleAllDialogOpen(false)}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSettleAll}
        disabled={settleAllMutation.isPending}
      >
        {settleAllMutation.isPending ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Settling...
          </>
        ) : (
          <>
            <CheckCircle2Icon className="h-4 w-4 mr-2" />
            Settle All
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 6. Payment History Enhancement

**Better visualization in PaymentList component**

```tsx
{/* Payment History with Context */}
<div className="space-y-3">
  {payments.map(payment => (
    <Card key={payment.id} className="border">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          {/* From/To */}
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={payment.from_user_avatar} />
              <AvatarFallback>{getInitials(payment.from_user_name)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="font-medium">{payment.from_user_name}</span>
              <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
              <Avatar className="h-10 w-10">
                <AvatarImage src={payment.to_user_avatar} />
                <AvatarFallback>{getInitials(payment.to_user_name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{payment.to_user_name}</span>
            </div>
          </div>

          {/* Amount + Method */}
          <div className="text-right">
            <p className="text-lg font-bold text-green-600">
              {formatNumber(payment.amount)} ₫
            </p>
            <div className="flex items-center gap-1 justify-end mt-1">
              <Badge variant="outline" className="text-xs">
                {payment.payment_method || 'Cash'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Date + Notes */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>{formatDate(payment.payment_date)}</span>
            {payment.notes && (
              <span className="italic truncate max-w-xs">
                "{payment.notes}"
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

### 7. Payment Method Icons

**Visual payment method indicators**

```tsx
// /src/lib/payment-methods.ts
export const PAYMENT_METHODS = {
  cash: { icon: '💵', label: 'Cash', color: 'text-green-600' },
  bank_transfer: { icon: '🏦', label: 'Bank Transfer', color: 'text-blue-600' },
  momo: { icon: '📱', label: 'MoMo', color: 'text-pink-600' },
  zalopay: { icon: '🔵', label: 'ZaloPay', color: 'text-blue-500' },
  other: { icon: '📋', label: 'Other', color: 'text-gray-600' },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export function getPaymentMethodIcon(method: PaymentMethod | null) {
  return PAYMENT_METHODS[method || 'cash'];
}
```

---

## File Changes

### Modified Files

1. **`/src/modules/groups/pages/show.tsx`**
   - Add quick settlement dialog state
   - Add handleQuickSettle function
   - Enhance handleSettleAll with payment method

2. **`/src/modules/payments/components/payment-list.tsx`**
   - Enhance payment card layout
   - Add payment method icons
   - Show notes if present

3. **`/src/components/bulk-operations/settle-all-dialog.tsx`**
   - Add payment method selector
   - Enhance warning message
   - Better summary display

### New Files

1. **`/src/components/payments/quick-settlement-dialog.tsx`**
   - Quick settlement dialog component
   - Partial payment support
   - Payment method selection
   - Settlement suggestions

2. **`/src/lib/payment-methods.ts`**
   - Payment method constants
   - Icon/color mappings

---

## New Hooks Required

### `/src/hooks/use-create-payment.ts`

```tsx
import { useCreate } from '@refinedev/core';
import { toast } from 'sonner';

interface CreatePaymentParams {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
  group_id?: string;
  friendship_id?: string;
}

export function useCreatePayment() {
  const { mutateAsync: create, isPending } = useCreate();

  const createPayment = async (params: CreatePaymentParams) => {
    return create({
      resource: 'payments',
      values: {
        ...params,
        created_by: params.from_user_id,
      },
    });
  };

  return { createPayment, isPending };
}
```

---

## Success Criteria

- [ ] Quick settlement dialog opens from debt cards
- [ ] Partial payment option works
- [ ] Payment method selection functional
- [ ] Settlement suggestions displayed
- [ ] Success feedback shows remaining balance (if partial)
- [ ] Payment history shows method icons
- [ ] Settle All dialog enhanced with payment method
- [ ] Toast notifications actionable ("View" button)
- [ ] Mobile: Dialog responsive, touch-friendly

---

## Testing Checklist

1. **Full Settlement:** Pay exact debt amount, verify balance clears
2. **Partial Settlement:** Pay half, verify remaining balance correct
3. **Payment Method:** Select different methods, verify saved
4. **Date Selection:** Past dates allowed, future dates blocked
5. **Settlement Suggestions:** Click quick amounts, verify populated
6. **Settle All:** Bulk settle, verify all splits marked paid
7. **Payment History:** View past payments, methods displayed
8. **Success Feedback:** Toast shows, "View" button works
9. **Mobile:** Dialog fits screen, inputs accessible

---

## Dependencies

**From Phase 1:**
- SettlementButton component

**From Phase 2:**
- Debt cards structure
- Hero balance section

**From Phase 3:**
- Expense breakdown for context

**New:**
- useCreatePayment hook
- Payment method constants
- QuickSettlementDialog component

---

## Next Phase

Phase 6: Group List Enhancement (improve groups overview page)

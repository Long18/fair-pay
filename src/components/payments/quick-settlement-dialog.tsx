import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2Icon, Loader2Icon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/payment-methods';
import { useHaptics } from '@/hooks/use-haptics';

interface QuickSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientId?: string;
  amount: number;
  currency?: string;
  onConfirm: (data: {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    notes: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function QuickSettlementDialog({
  open,
  onOpenChange,
  recipientName,
  amount,
  currency = '₫',
  onConfirm,
  isLoading = false,
}: QuickSettlementDialogProps) {
  const { tap, success } = useHaptics();
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const effectiveAmount = isPartialPayment
    ? parseFloat(partialAmount) || 0
    : amount;

  const handleConfirm = async () => {
    await onConfirm({
      amount: effectiveAmount,
      paymentMethod,
      paymentDate,
      notes,
    });

    // Reset form
    setIsPartialPayment(false);
    setPartialAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    success();
  };

  const handleQuickAmount = (amt: number) => {
    tap();
    setIsPartialPayment(true);
    setPartialAmount(amt.toString());
  };

  // Generate quick amount suggestions
  const quickAmounts = [50000, 100000, 200000, 500000, 1000000].filter(
    (amt) => amt < amount
  );

  const isValidAmount =
    effectiveAmount > 0 && effectiveAmount <= amount;

  const footerButtons = (
    <div className="flex gap-2 w-full">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isLoading}
        className="flex-1 min-h-[44px]"
      >
        Cancel
      </Button>
      <Button
        onClick={handleConfirm}
        disabled={isLoading || !isValidAmount}
        className="flex-1 min-h-[44px]"
      >
        {isLoading ? (
          <>
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            Recording...
          </>
        ) : (
          <>
            <CheckCircle2Icon className="h-4 w-4 mr-2" />
            Record Payment
          </>
        )}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Settle with ${recipientName}`}
      description="Record a payment to settle your debt."
      footer={footerButtons}
    >
      <div className="space-y-4">
        {/* Amount Display */}
        <div className="p-4 rounded-lg bg-accent">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount to Pay</span>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {formatNumber(isPartialPayment ? effectiveAmount : amount)}{' '}
                {currency}
              </p>
              {!isPartialPayment && (
                <p className="text-xs text-muted-foreground">Full balance</p>
              )}
              {isPartialPayment && effectiveAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatNumber(amount - effectiveAmount)} {currency} remaining
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Partial Payment Option */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[44px]">
            <Checkbox
              id="partial"
              checked={isPartialPayment}
              onCheckedChange={(checked) => {
                tap();
                setIsPartialPayment(checked === true);
                if (!checked) setPartialAmount('');
              }}
              className="h-5 w-5"
            />
            <label htmlFor="partial" className="text-sm font-medium cursor-pointer flex-1">
              Pay partial amount
            </label>
          </div>
          {isPartialPayment && (
            <div className="ml-7 space-y-3">
              <Input
                type="number"
                placeholder="Enter amount"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                min="1"
                max={amount}
                className="text-base min-h-[44px]"
              />
              {/* Quick Amounts */}
              {quickAmounts.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map((amt) => (
                    <Badge
                      key={amt}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors min-h-[36px] px-3 py-2"
                      onClick={() => handleQuickAmount(amt)}
                    >
                      {formatNumber(amt)} {currency}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors min-h-[36px] px-3 py-2"
                    onClick={() => handleQuickAmount(Math.round(amount / 2))}
                  >
                    Half ({formatNumber(Math.round(amount / 2))} {currency})
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              tap();
              setPaymentMethod(v as PaymentMethod);
            }}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHODS).map(([value, config]) => (
                <SelectItem key={value} value={value} className="min-h-[44px]">
                  {config.icon} {config.label}
                </SelectItem>
              ))}
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
            className="text-base min-h-[44px]"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes (optional)</label>
          <Textarea
            placeholder="Add any notes about this payment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-base"
          />
        </div>
      </div>
    </BottomSheet>
  );
}

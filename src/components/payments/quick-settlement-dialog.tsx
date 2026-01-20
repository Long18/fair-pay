import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { BanknoteIcon, CheckCircle2Icon, Loader2Icon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/payment-methods';

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
  };

  const handleQuickAmount = (amt: number) => {
    setIsPartialPayment(true);
    setPartialAmount(amt.toString());
  };

  // Generate quick amount suggestions
  const quickAmounts = [50000, 100000, 200000, 500000, 1000000].filter(
    (amt) => amt < amount
  );

  const isValidAmount =
    effectiveAmount > 0 && effectiveAmount <= amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BanknoteIcon className="h-5 w-5 text-primary" />
            Settle with {recipientName}
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="partial"
                checked={isPartialPayment}
                onCheckedChange={(checked) => {
                  setIsPartialPayment(checked === true);
                  if (!checked) setPartialAmount('');
                }}
              />
              <label htmlFor="partial" className="text-sm font-medium cursor-pointer">
                Pay partial amount
              </label>
            </div>
            {isPartialPayment && (
              <div className="ml-6 space-y-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  min="1"
                  max={amount}
                />
                {/* Quick Amounts */}
                {quickAmounts.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amt) => (
                      <Badge
                        key={amt}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleQuickAmount(amt)}
                      >
                        {formatNumber(amt)} {currency}
                      </Badge>
                    ))}
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
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
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHODS).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
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
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValidAmount}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { CheckCircle2Icon } from "@/components/ui/icons";

interface SettleSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  computedAmount: number;
  currency: string;
  onConfirm: (amount: number) => void;
  isSettling: boolean;
}

export const SettleSplitDialog = ({
  open,
  onOpenChange,
  userName,
  computedAmount,
  currency,
  onConfirm,
  isSettling,
}: SettleSplitDialogProps) => {
  const { t } = useTranslation();
  const [customAmount, setCustomAmount] = useState<string>(computedAmount.toString());
  const [error, setError] = useState<string>("");

  const handleAmountChange = (value: string) => {
    setCustomAmount(value);
    setError("");

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError(t('expenses.invalidAmount', 'Invalid amount'));
    } else if (numValue > computedAmount) {
      setError(t('expenses.amountExceedsTotal', 'Amount exceeds total'));
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0 || amount > computedAmount) {
      setError(t('expenses.invalidAmount', 'Invalid amount'));
      return;
    }
    onConfirm(amount);
  };

  const isPartialSettlement = parseFloat(customAmount) < computedAmount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('expenses.settleSplit', 'Settle Payment')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('expenses.settleSplitDescription', {
              userName,
              amount: formatNumber(computedAmount),
              currency,
              defaultValue: `Mark payment from ${userName} as received. Full amount: ${formatNumber(computedAmount)} ${currency}`,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="settle-amount">
              {t('expenses.settlementAmount', 'Settlement Amount')} ({currency})
            </Label>
            <Input
              id="settle-amount"
              type="number"
              step="0.01"
              min="0"
              max={computedAmount}
              value={customAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={isSettling}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {isPartialSettlement && !error && (
              <p className="text-sm text-amber-600">
                {t('expenses.partialSettlement', 'This is a partial settlement')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('expenses.fullAmount', 'Full Amount')}:
            </span>
            <span className="font-semibold">
              {formatNumber(computedAmount)} {currency}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSettling}>
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSettling || !!error}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSettling ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t('expenses.settling', 'Settling...')}
              </>
            ) : (
              <>
                <CheckCircle2Icon className="h-4 w-4 mr-2" />
                {t('expenses.confirmSettle', 'Confirm Settlement')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


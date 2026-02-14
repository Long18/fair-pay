import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, UserIcon, PlusIcon, CreditCardIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { useState } from "react";
import { usePayeeSepaySettings } from "@/hooks/use-sepay-settings";
import { SepayPaymentDialog } from "@/modules/payments/components/sepay-payment-dialog";
import { triggerHaptic } from "@/lib/haptics";

interface DebtBreakdownHeaderProps {
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  netAmount: number;
  iOweThem: boolean;
  currency: string;
  totalIOwe: number;
  totalTheyOwe: number;
  unpaidCount?: number;
  partialCount?: number;
  paidCount?: number;
  counterpartyId: string;
  onPaymentComplete?: () => void;
}

export function DebtBreakdownHeader({
  counterpartyName,
  counterpartyAvatarUrl,
  netAmount,
  iOweThem,
  currency,
  totalIOwe,
  totalTheyOwe,
  unpaidCount = 0,
  partialCount = 0,
  paidCount: _paidCount = 0,
  counterpartyId,
  onPaymentComplete,
}: DebtBreakdownHeaderProps) {
  const { t } = useTranslation();
  const go = useGo();
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);

  const { isConfigured: isSepayConfigured } = usePayeeSepaySettings(counterpartyId);

  const statusColors = iOweThem ? getOweStatusColors('owe') : getOweStatusColors('owed');
  const statusText = iOweThem
    ? t('debts.youOwe', 'You owe')
    : t('debts.owesYou', 'Owes you');

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      {/* Back Button */}
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go({ to: "/" })}
          className="rounded-lg"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t('common.back', 'Back to Dashboard')}
        </Button>
      </div>

      {/* Main Header Content */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={counterpartyAvatarUrl || undefined} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {counterpartyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="typography-page-title mb-1">{counterpartyName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={iOweThem ? "default" : "secondary"}>
                {statusText}
              </Badge>
              {unpaidCount > 0 && (
                <>
                  <span className="typography-metadata">•</span>
                  <span className="typography-metadata">
                    {unpaidCount} {t('debts.unpaid', 'unpaid')}
                  </span>
                </>
              )}
              {partialCount > 0 && (
                <>
                  <span className="typography-metadata">•</span>
                  <span className="typography-metadata">
                    {partialCount} {t('debts.partial', 'partial')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Net Position Display */}
        <div className={cn("p-4 rounded-lg border-2", statusColors.bg, statusColors.border)}>
          <p className="typography-metadata mb-1">
            {t('debts.netBalance', 'Net Balance')}
          </p>
          <p className={cn("text-3xl font-bold tabular-nums", statusColors.text)}>
            {iOweThem ? '-' : '+'}
            {formatCurrency(netAmount, currency)}
          </p>
        </div>

        {/* Balance Breakdown */}
        {(totalIOwe > 0 || totalTheyOwe > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400 mb-0.5">
                {t('debts.youOweTotal', 'You owe {{name}}', { name: counterpartyName })}
              </p>
              <p className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-300">
                {formatCurrency(totalIOwe, currency)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">
                {t('debts.theyOweTotal', '{{name}} owes you', { name: counterpartyName })}
              </p>
              <p className="text-lg font-semibold tabular-nums text-green-700 dark:text-green-300">
                {formatCurrency(totalTheyOwe, currency)}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {iOweThem && isSepayConfigured && netAmount > 0 && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              onClick={() => {
                triggerHaptic('medium');
                setSepayDialogOpen(true);
              }}
            >
              <CreditCardIcon className="h-4 w-4 mr-2" />
              {t('payments.payViaSePay', 'Pay via SePay')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/expenses/create?with=${counterpartyId}` })}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('debts.addExpense', 'Add Expense')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/profile/${counterpartyId}` })}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            {t('debts.viewProfile', 'View Profile')}
          </Button>
        </div>
      </div>

      {/* SePay Payment Dialog */}
      {isSepayConfigured && (
        <SepayPaymentDialog
          open={sepayDialogOpen}
          onOpenChange={setSepayDialogOpen}
          payeeId={counterpartyId}
          payeeName={counterpartyName}
          amount={netAmount}
          currency={currency}
          sourceType="DEBT"
          sourceId={counterpartyId}
          description={`FairPay debt: ${counterpartyName}`}
          onPaymentComplete={() => {
            setSepayDialogOpen(false);
            onPaymentComplete?.();
          }}
        />
      )}
    </div>
  );
}

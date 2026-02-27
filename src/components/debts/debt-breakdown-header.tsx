import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, ArrowDownIcon, ArrowUpIcon, UserIcon, PlusIcon, CreditCardIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { useState } from "react";
import { usePayeeSepaySettings } from "@/hooks/payment/use-sepay-settings";
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

  const initials = counterpartyName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const total = totalIOwe + totalTheyOwe;
  const owePct = total > 0 ? (totalIOwe / total) * 100 : 0;

  const metaParts = [
    unpaidCount > 0 && `${unpaidCount} ${t("debts.unpaid", "unpaid")}`,
    partialCount > 0 && `${partialCount} ${t("debts.partial", "partial")}`,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      {/* Back Button */}
      <div className="px-4 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go({ to: "/" })}
          className="rounded-lg -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
          {t("common.back", "Back to Dashboard")}
        </Button>
      </div>

      {/* Hero: Avatar + Name + Status */}
      <div className="flex items-center gap-3.5 px-5 pt-3 pb-4">
        <Avatar className="h-14 w-14 border-2 border-border shrink-0">
          <AvatarImage src={counterpartyAvatarUrl || undefined} />
          <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-xl font-bold leading-tight mb-1.5">{counterpartyName}</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5",
                iOweThem
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                  : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
              )}
            >
              {iOweThem ? t("debts.youOwe", "You owe") : t("debts.owesYou", "Owes you")}
            </Badge>
            {metaParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span className="text-xs text-muted-foreground">{part}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Big Balance — color + sign encode direction, no label needed */}
        <div
          className={cn(
            "px-4 py-3.5 rounded-xl border-2",
            iOweThem
              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
          )}
        >
          <p
            className={cn(
              "text-[32px] leading-none font-extrabold tabular-nums tracking-tight",
              iOweThem
                ? "text-red-700 dark:text-red-300"
                : "text-green-700 dark:text-green-300"
            )}
          >
            {iOweThem ? "−" : "+"}
            {formatCurrency(netAmount, currency)}
          </p>
        </div>

        {/* Settlement Flow Bar — ↓ owe  ░░░░░░░░░  ↑ owed, no text labels */}
        {(totalIOwe > 0 || totalTheyOwe > 0) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <ArrowDownIcon className="h-3 w-3" />
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(totalIOwe, currency)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(totalTheyOwe, currency)}
                </span>
                <ArrowUpIcon className="h-3 w-3" />
              </div>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-[width] duration-700 ease-out"
                style={{ width: `${owePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          {iOweThem && isSepayConfigured && netAmount > 0 && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              onClick={() => {
                triggerHaptic("medium");
                setSepayDialogOpen(true);
              }}
            >
              <CreditCardIcon className="h-4 w-4 mr-2" />
              {t("payments.payViaSePay", "Pay via SePay")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/expenses/create?with=${counterpartyId}` })}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t("debts.addExpense", "Add Expense")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/profile/${counterpartyId}` })}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            {t("debts.viewProfile", "View Profile")}
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

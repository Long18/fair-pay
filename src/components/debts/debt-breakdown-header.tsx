import { useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { usePayeeSepaySettings } from "@/hooks/payment/use-sepay-settings";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { SepayPaymentDialog } from "@/modules/payments/components/sepay-payment-dialog";

interface DebtBreakdownHeaderProps {
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  netAmount: number;
  iOweThem: boolean;
  currency: string;
  totalIOwe: number;
  totalTheyOwe: number;
  counterpartyId: string;
  onPaymentComplete?: () => void;
  onSettleAll?: () => void;
}

function formatSignedCurrency(amount: number, currency: string) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function DebtBreakdownHeader({
  counterpartyName,
  netAmount,
  iOweThem,
  currency,
  totalIOwe,
  totalTheyOwe,
  counterpartyId,
  onPaymentComplete,
  onSettleAll,
}: DebtBreakdownHeaderProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);
  const { isConfigured: isSepayConfigured } = usePayeeSepaySettings(counterpartyId);

  const firstName = getFirstName(counterpartyName);
  const relationshipLabel = iOweThem
    ? t("debts.heroYouOwe", "You owe {{name}}", { name: firstName })
    : t("debts.heroTheyOwe", "{{name}} owes you", { name: firstName });

  const canPayViaSePay = iOweThem && isSepayConfigured && netAmount > 0;
  const canSettle = totalTheyOwe > 0 && !!onSettleAll;

  return (
    <>
      <section className="border-b border-border/60 pb-8 pt-2 md:pb-10 md:pt-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="text-base font-semibold tracking-tight text-foreground">
            {counterpartyName}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {relationshipLabel}
          </p>

          <p
            className={cn(
              "mt-4 text-5xl font-extrabold tracking-[-0.05em] text-foreground sm:text-6xl",
              iOweThem ? "text-semantic-negative" : "text-semantic-positive"
            )}
          >
            {formatSignedCurrency(iOweThem ? -netAmount : netAmount, currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("debts.netBalance", "Net balance")}
          </p>

          <div className="mt-6 flex items-center gap-4 text-sm sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("debts.youOweShort", "You owe")}
              </span>
              <span className="mt-1 font-semibold text-semantic-negative tabular-nums">
                {formatCurrency(totalIOwe, currency)}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("debts.owesYouShort", "Owes you")}
              </span>
              <span className="mt-1 font-semibold text-semantic-positive tabular-nums">
                {formatCurrency(totalTheyOwe, currency)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            {canPayViaSePay && (
              <Button
                size="lg"
                className="h-12 flex-1 rounded-xl"
                onClick={() => {
                  tap();
                  setSepayDialogOpen(true);
                }}
              >
                <CreditCardIcon className="h-4 w-4" />
                {t("payments.payViaSePay", "Pay via SePay")}
              </Button>
            )}

            {!canPayViaSePay && canSettle && (
              <Button
                size="lg"
                className="h-12 flex-1 rounded-xl"
                onClick={() => {
                  tap();
                  onSettleAll?.();
                }}
              >
                <CheckCircle2Icon className="h-4 w-4" />
                {t("debts.settleUp", "Settle up")}
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className={cn(
                "h-12 rounded-xl",
                canPayViaSePay || canSettle ? "flex-1" : "w-full"
              )}
              onClick={() => {
                tap();
                go({ to: `/expenses/create?with=${counterpartyId}` });
              }}
            >
              <PlusIcon className="h-4 w-4" />
              {t("debts.addExpense", "Add expense")}
            </Button>
          </div>
        </div>
      </section>

      {canPayViaSePay && (
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
    </>
  );
}

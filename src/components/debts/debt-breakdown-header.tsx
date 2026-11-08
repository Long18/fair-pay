import { useMemo } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  PlusIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import type { ExpenseSplit } from "@/modules/expenses/types";
import { usePayeeOnlinePaymentMethods } from "@/hooks/payment/use-payee-online-payment-methods";
import { PaymentMethodDropdown } from "@/modules/payments/components/payment-method-dropdown";
import { buildDebtShareUrl } from "@/modules/debts/utils/share-url";
import { Profile } from "@/modules/profile/types";
import { SharePlatformPicker } from "@/components/share/share-platform-picker";

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
  isSettlingAll?: boolean;
  onRecordPayment?: () => void;
  shareVersionSource?: string | null;
  /** Payout recipient for online pay (defaults to counterparty). */
  paymentPayeeId?: string;
  paymentPayeeName?: string;
  allowSepay?: boolean;
}

function formatSignedCurrency(amount: number, currency: string) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DebtBreakdownHeader({
  counterpartyName,
  counterpartyAvatarUrl,
  netAmount,
  iOweThem,
  currency,
  totalIOwe,
  totalTheyOwe,
  counterpartyId,
  onPaymentComplete,
  onSettleAll,
  isSettlingAll = false,
  onRecordPayment,
  shareVersionSource,
  paymentPayeeId,
  paymentPayeeName,
  allowSepay = true,
}: DebtBreakdownHeaderProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const firstName = getFirstName(counterpartyName);
  const relationshipLabel = iOweThem
    ? t("debts.heroYouOwe", "You owe {{name}}", { name: firstName })
    : t("debts.heroTheyOwe", "{{name}} owes you", { name: firstName });

  const payeeId = paymentPayeeId ?? counterpartyId;
  const payeeName = paymentPayeeName ?? counterpartyName;
  const { isLoading: isPaymentMethodsLoading, hasOnlineMethods } =
    usePayeeOnlinePaymentMethods(payeeId, allowSepay);

  const canPayOnline =
    iOweThem &&
    totalIOwe > 0 &&
    !isPaymentMethodsLoading &&
    hasOnlineMethods;
  /** Manual record (QuickSettlement) — same as pre-SePay header: hidden when online Pay is available. */
  const canRecordPayment =
    iOweThem &&
    totalIOwe > 0 &&
    !!onRecordPayment &&
    !isPaymentMethodsLoading &&
    !hasOnlineMethods;
  const canSettle = totalTheyOwe > 0 && !!onSettleAll;

  const debtPaymentSplit = useMemo((): ExpenseSplit & {
    profiles: { id: string; full_name: string };
  } => ({
    id: counterpartyId,
    expense_id: counterpartyId,
    user_id: null,
    split_method: "equal",
    split_value: null,
    computed_amount: netAmount,
    is_settled: false,
    settled_amount: 0,
    created_at: "",
    profiles: { id: counterpartyId, full_name: counterpartyName },
  }), [counterpartyId, counterpartyName, netAmount]);

  const getShareUrl = () => buildDebtShareUrl(
    {
      viewerId: identity?.id,
      counterpartyId,
      latestActivityAt: shareVersionSource,
    },
    window.location.href,
  );
  const getDestinationUrl = () => `${window.location.origin}/debts/${counterpartyId}`;
  const shareTitle = t("debts.debtsSummary", "Debts Summary");
  const shareText = t(
    "debts.shareSummaryText",
    "Check out the balance summary with {{name}} on FairPay",
    { name: counterpartyName },
  );

  const primaryActionClass =
    "h-10 min-h-10 min-w-0 flex-1 rounded-md px-3 text-sm sm:px-4";
  const secondaryActionClass =
    "h-10 min-h-10 shrink-0 rounded-md px-2.5 text-sm sm:px-3";

  return (
    <>
      <section className="border-b border-border/60 px-3 pb-6 pt-4 sm:px-4 sm:pb-8 sm:pt-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <Avatar className="size-12 shrink-0 ring-2 ring-border/40">
            <AvatarImage src={counterpartyAvatarUrl ?? undefined} alt={counterpartyName} />
            <AvatarFallback className="bg-muted text-sm font-semibold">
              {getInitials(counterpartyName)}
            </AvatarFallback>
          </Avatar>

          <p className="mt-3 text-base font-semibold tracking-tight text-foreground">
            {counterpartyName}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {relationshipLabel}
          </p>

          <p
            className={cn(
              "mt-4 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
              iOweThem ? "text-semantic-negative" : "text-semantic-positive",
            )}
          >
            {formatSignedCurrency(iOweThem ? -netAmount : netAmount, currency)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("debts.netBalance", "Net balance")}
          </p>

          {(totalIOwe > 0 || totalTheyOwe > 0) && (
            <div className="mt-5 flex items-center gap-4 text-sm sm:gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("debts.youOweShort", "You owe")}
                </span>
                <span className="mt-1 font-semibold tabular-nums text-semantic-negative">
                  {formatCurrency(totalIOwe, currency)}
                </span>
              </div>
              <div className="h-8 w-px bg-border/60" aria-hidden />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("debts.owesYouShort", "Owes you")}
                </span>
                <span className="mt-1 font-semibold tabular-nums text-semantic-positive">
                  {formatCurrency(totalTheyOwe, currency)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex w-full max-w-md flex-wrap items-center justify-center gap-2">
            {canPayOnline && (
              <PaymentMethodDropdown
                split={debtPaymentSplit}
                payeeId={payeeId}
                payeeName={payeeName}
                allowSepay={allowSepay}
                amountOverride={totalIOwe}
                sepaySource={{ type: "DEBT", id: counterpartyId }}
                paymentDescription={`FairPay debt: ${counterpartyName}`}
                className={primaryActionClass}
                onPaymentComplete={onPaymentComplete}
              />
            )}

            {canRecordPayment && (
              <Button
                variant="default"
                className={primaryActionClass}
                onClick={() => {
                  tap();
                  onRecordPayment?.();
                }}
              >
                <CreditCardIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {t("debts.recordPayment", "Record payment")}
                </span>
              </Button>
            )}

            {!canPayOnline && !canRecordPayment && canSettle && (
              <Button
                className={primaryActionClass}
                onClick={() => {
                  tap();
                  onSettleAll?.();
                }}
                disabled={isSettlingAll}
              >
                <CheckCircle2Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {isSettlingAll
                    ? t("debts.settling", "Settling…")
                    : t("debts.settleUp", "Settle up")}
                </span>
              </Button>
            )}

            <Button
              variant="outline"
              className={cn(secondaryActionClass, "min-w-0 flex-1")}
              onClick={() => {
                tap();
                go({ to: `/expenses/create?with=${counterpartyId}` });
              }}
            >
              <PlusIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("debts.addExpense", "Add expense")}</span>
            </Button>

            <SharePlatformPicker
              shareUrl={getShareUrl}
              destinationUrl={getDestinationUrl}
              title={shareTitle}
              text={shareText}
              entityType="debt"
              entityId={counterpartyId}
              campaign="debt_share"
              content="debt_detail_share_button"
              templateKey="debt_detail_share_button"
              successMessage={t("common.shareOpened", "Share link opened")}
              copyMessage={t("common.linkCopied", "Link copied to clipboard")}
              errorMessage={t("common.shareError", "Failed to share link")}
              trigger={
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon" }),
                    "size-10 min-h-10 shrink-0 rounded-md",
                  )}
                  onClick={tap}
                  aria-label={t("common.share", "Share")}
                >
                  <ShareIcon className="h-4 w-4" />
                  <span className="sr-only">{t("common.share", "Share")}</span>
                </button>
              }
            />
          </div>
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  PlusIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { usePayeeSepaySettings } from "@/hooks/payment/use-sepay-settings";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { SepayPaymentDialog } from "@/modules/payments/components/sepay-payment-dialog";
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
}: DebtBreakdownHeaderProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);
  const { isConfigured: isSepayConfigured } = usePayeeSepaySettings(counterpartyId);

  const firstName = getFirstName(counterpartyName);
  const relationshipLabel = iOweThem
    ? t("debts.heroYouOwe", "You owe {{name}}", { name: firstName })
    : t("debts.heroTheyOwe", "{{name}} owes you", { name: firstName });

  const canPayViaSePay = iOweThem && isSepayConfigured && netAmount > 0;
  const canRecordPayment = iOweThem && totalIOwe > 0 && !canPayViaSePay && !!onRecordPayment;
  const canSettle = totalTheyOwe > 0 && !!onSettleAll;

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
    "h-10 min-w-0 min-h-10 flex-1 rounded-md px-3 text-sm sm:px-4";
  const secondaryActionClass =
    "h-10 min-h-10 shrink-0 rounded-md px-2.5 text-sm sm:px-3";

  return (
    <>
      <section className="border-b border-border/60 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
        <div className="mx-auto w-full max-w-2xl sm:max-w-none">
          <p
            className={cn(
              "text-center text-4xl font-bold tabular-nums tracking-tight sm:text-left sm:text-5xl",
              iOweThem ? "text-semantic-negative" : "text-semantic-positive",
            )}
          >
            {formatSignedCurrency(iOweThem ? -netAmount : netAmount, currency)}
          </p>

          <div className="mx-auto mt-3 flex w-full max-w-md items-center gap-3 sm:mx-0 sm:mt-4 sm:max-w-none">
            <Avatar className="size-10 shrink-0 ring-2 ring-border/40 sm:size-12">
              <AvatarImage src={counterpartyAvatarUrl ?? undefined} alt={counterpartyName} />
              <AvatarFallback className="bg-muted text-sm font-semibold">
                {getInitials(counterpartyName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">
                {counterpartyName}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{relationshipLabel}</p>
            </div>
          </div>

          {(totalIOwe > 0 || totalTheyOwe > 0) && (
            <dl className="mx-auto mt-3 grid w-full max-w-md grid-cols-2 gap-x-4 gap-y-0.5 border-t border-border/60 pt-2.5 text-sm sm:mx-0 sm:max-w-none">
              <div className="min-w-0 text-left">
                <dt className="text-xs text-muted-foreground">
                  {t("debts.youOweShort", "You owe")}
                </dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCurrency(totalIOwe, currency)}
                </dd>
              </div>
              <div className="min-w-0 text-right sm:text-left">
                <dt className="text-xs text-muted-foreground">
                  {t("debts.owesYouShort", "Owes you")}
                </dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCurrency(totalTheyOwe, currency)}
                </dd>
              </div>
            </dl>
          )}

          <div className="mx-auto mt-4 flex w-full max-w-md flex-row flex-wrap items-center justify-center gap-2 sm:mx-0 sm:max-w-none sm:justify-start">
                {canPayViaSePay && (
                  <Button
                    className={primaryActionClass}
                    onClick={() => {
                      tap();
                      setSepayDialogOpen(true);
                    }}
                  >
                    <CreditCardIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {t("payments.payViaSePay", "Pay via SePay")}
                    </span>
                  </Button>
                )}

                {canRecordPayment && (
                  <Button
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

                {!canPayViaSePay && !canRecordPayment && canSettle && (
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
                  className={cn(secondaryActionClass, "min-w-0 flex-1 sm:flex-none sm:flex-initial")}
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-10 min-h-10 shrink-0 rounded-md"
                      onClick={tap}
                      aria-label={t("common.share", "Share")}
                    >
                      <ShareIcon className="h-4 w-4" />
                      <span className="sr-only">{t("common.share", "Share")}</span>
                    </Button>
                  }
                />
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

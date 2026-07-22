import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { motion, type Variants } from "framer-motion";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { getOweStatusColors, getPaymentStateColors } from "@/lib/status-colors";
import { formatCurrency } from "@/lib/locale-utils";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { journeyTracking } from "@/lib/journey-tracking";
import { cn } from "@/lib/utils";
import { BalanceRecentTransactionsPreview } from "./balance-recent-transactions-preview";
import { BalanceExpandPanel } from "./balance-expand-panel";

interface Balance {
  counterparty_id: string | null;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  counterparty_email?: string;
  amount: string | number;
  currency?: string;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface BalanceTableRowExpandableProps {
  balance: Balance;
  index: number;
  disabled: boolean;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  rowVariants?: Variants;
}

function formatShortDate(dateString?: string) {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "MMM d");
  } catch {
    return "";
  }
}

export function BalanceTableRowExpandable({
  balance,
  index,
  disabled,
  currency,
  isExpanded,
  onToggleExpand,
  rowVariants,
}: BalanceTableRowExpandableProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { expenses, isLoading } = useContributingExpenses(
    isExpanded ? balance.counterparty_id || "" : ""
  );

  const amountValue = Number(
    balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount
  );
  const isFullySettled = amountValue === 0;
  const statusColors = balance.i_owe_them
    ? getOweStatusColors("owe")
    : getOweStatusColors("owed");

  return (
    <>
      <motion.tr
        role="button"
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? t("dashboard.collapseBalanceRow", "Collapse related expenses for {{name}}", {
                name: balance.counterparty_name,
              })
            : t("dashboard.expandBalanceRow", "Expand related expenses for {{name}}", {
                name: balance.counterparty_name,
              })
        }
        variants={rowVariants}
        custom={index}
        className={cn(
          "cursor-pointer border-b transition-colors hover:bg-muted/80 data-[state=selected]:bg-muted",
          index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
          isExpanded && "bg-muted/40 dark:bg-muted/35",
          disabled && "cursor-not-allowed opacity-50",
          isFullySettled && `opacity-60 ${getPaymentStateColors("paid").bg}`
        )}
        onClick={() => {
          if (!disabled) {
            tap();
            journeyTracking.trackEvent({
              event_name: "dashboard_balance_card_clicked",
              event_category: "dashboard",
              page_path: typeof window !== "undefined" ? window.location.pathname : "/",
              flow_name: "dashboard",
              step_name: "balance_card",
              properties: {
                counterparty_id: balance.counterparty_id ?? undefined,
                i_owe_them: balance.i_owe_them,
                is_fully_settled: isFullySettled,
              },
            });
            onToggleExpand();
          }
        }}
        onKeyDown={onButtonKeyDown(() => {
          if (!disabled) {
            tap();
            journeyTracking.trackEvent({
              event_name: "dashboard_balance_card_clicked",
              event_category: "dashboard",
              page_path: typeof window !== "undefined" ? window.location.pathname : "/",
              flow_name: "dashboard",
              step_name: "balance_card",
              properties: {
                counterparty_id: balance.counterparty_id ?? undefined,
                i_owe_them: balance.i_owe_them,
                is_fully_settled: isFullySettled,
              },
            });
            onToggleExpand();
          }
        })}
        tabIndex={disabled ? -1 : 0}
      >
        <TableCell>
          <div className="relative">
            <UserAvatar
              user={{
                full_name: balance.counterparty_name,
                avatar_url: balance.counterparty_avatar_url ?? null,
              }}
              size="md"
              className={cn(
                "transition-shadow duration-300",
                isExpanded && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
              )}
            />
            {isFullySettled ? (
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-0.5",
                  getPaymentStateColors("paid").bg
                )}
              >
                <CheckIcon className={cn("size-3", getPaymentStateColors("paid").icon)} />
              </div>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "typography-row-title",
                  isFullySettled && "text-muted-foreground line-through"
                )}
              >
                {balance.counterparty_name}
              </span>
              {balance.counterparty_id ? (
                <UserGroupStack userId={balance.counterparty_id} size="xs" />
              ) : null}
            </div>
            {balance.last_transaction_date ? (
              <span className="typography-metadata">
                {t("dashboard.last", "Last")}: {formatShortDate(balance.last_transaction_date)}
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          {isFullySettled ? (
            <PaymentStateBadge state="paid" size="md" />
          ) : (
            <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
              {balance.i_owe_them ? t("dashboard.youOwe") : t("dashboard.userOwesYou")}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {isFullySettled ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 typography-amount tabular-nums",
                  getPaymentStateColors("paid").text
                )}
              >
                <CheckIcon className="size-4" />
                {formatCurrency(0, currency)}
              </span>
            ) : (
              <span className={cn("typography-amount-prominent tabular-nums", statusColors.text)}>
                {balance.i_owe_them ? "-" : "+"}
                {formatCurrency(Math.abs(amountValue), currency)}
              </span>
            )}
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="inline-flex"
            >
              <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground" />
            </motion.span>
          </div>
        </TableCell>
      </motion.tr>

      <TableRow className="border-0 hover:bg-transparent data-[state=selected]:bg-transparent">
        <TableCell colSpan={4} className="border-0 p-0">
          <BalanceExpandPanel isExpanded={isExpanded} contentClassName="px-4 py-4 sm:px-5">
            <BalanceRecentTransactionsPreview
              expenses={expenses}
              counterpartyName={balance.counterparty_name}
              isLoading={isLoading}
              onViewDetails={
                balance.counterparty_id
                  ? () => {
                      tap();
                      go({ to: `/debts/${balance.counterparty_id}` });
                    }
                  : undefined
              }
            />
          </BalanceExpandPanel>
        </TableCell>
      </TableRow>
    </>
  );
}

export function BalanceTableRowExpandableMobile({
  balance,
  disabled,
  currency,
  isExpanded,
  onToggleExpand,
}: Omit<BalanceTableRowExpandableProps, "index" | "rowVariants">) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { expenses, isLoading } = useContributingExpenses(
    isExpanded ? balance.counterparty_id || "" : ""
  );

  const statusColors = balance.i_owe_them
    ? getOweStatusColors("owe")
    : getOweStatusColors("owed");

  const amountValue = Number(
    balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount
  );
  const isFullySettled = amountValue === 0;

  return (
    <div
      className={cn(
        "transition-colors duration-200",
        isExpanded && "bg-muted/25"
      )}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? t("dashboard.collapseBalanceRow", "Collapse related expenses for {{name}}", {
                name: balance.counterparty_name,
              })
            : t("dashboard.expandBalanceRow", "Expand related expenses for {{name}}", {
                name: balance.counterparty_name,
              })
        }
        onClick={() => {
          if (!disabled) {
            tap();
            journeyTracking.trackEvent({
              event_name: "dashboard_balance_card_clicked",
              event_category: "dashboard",
              page_path: typeof window !== "undefined" ? window.location.pathname : "/",
              flow_name: "dashboard",
              step_name: "balance_card",
              properties: {
                counterparty_id: balance.counterparty_id ?? undefined,
                i_owe_them: balance.i_owe_them,
                is_fully_settled: isFullySettled,
              },
            });
            onToggleExpand();
          }
        }}
        onKeyDown={onButtonKeyDown(() => {
          if (!disabled) {
            tap();
            journeyTracking.trackEvent({
              event_name: "dashboard_balance_card_clicked",
              event_category: "dashboard",
              page_path: typeof window !== "undefined" ? window.location.pathname : "/",
              flow_name: "dashboard",
              step_name: "balance_card",
              properties: {
                counterparty_id: balance.counterparty_id ?? undefined,
                i_owe_them: balance.i_owe_them,
                is_fully_settled: isFullySettled,
              },
            });
            onToggleExpand();
          }
        })}
        className={cn(
          "flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <UserAvatar
              user={{
                full_name: balance.counterparty_name,
                avatar_url: balance.counterparty_avatar_url ?? null,
              }}
              size="lg"
              className={cn(
                "border-2 border-border transition-shadow duration-300",
                isExpanded && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
              )}
            />
            {isFullySettled ? (
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-0.5",
                  getPaymentStateColors("paid").bg
                )}
              >
                <CheckIcon className={cn("size-3", getPaymentStateColors("paid").icon)} />
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p
                className={cn(
                  "typography-row-title truncate",
                  isFullySettled && "text-muted-foreground line-through"
                )}
              >
                {balance.counterparty_name}
              </p>
              {balance.counterparty_id ? (
                <UserGroupStack userId={balance.counterparty_id} size="xs" />
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {isFullySettled ? (
                <PaymentStateBadge state="paid" size="sm" />
              ) : (
                <Badge
                  variant={balance.i_owe_them ? "default" : "secondary"}
                  className="text-xs"
                >
                  {balance.i_owe_them ? t("dashboard.youOwe") : t("dashboard.userOwesYou")}
                </Badge>
              )}
              {balance.transaction_count !== undefined ? (
                <>
                  <span className="typography-metadata">·</span>
                  <span className="typography-metadata tabular-nums">
                    {balance.transaction_count} {t("dashboard.expenses", "expenses")}
                  </span>
                </>
              ) : null}
              {balance.last_transaction_date ? (
                <>
                  <span className="typography-metadata">·</span>
                  <span className="typography-metadata">
                    {t("dashboard.last", "Last")}: {formatShortDate(balance.last_transaction_date)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="ml-3 flex items-center gap-2">
          {isFullySettled ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 typography-amount tabular-nums",
                getPaymentStateColors("paid").text
              )}
            >
              <CheckIcon className="size-4" />
              {formatCurrency(0, currency)}
            </span>
          ) : (
            <span className={cn("typography-amount-prominent tabular-nums", statusColors.text)}>
              {balance.i_owe_them ? "-" : "+"}
              {formatCurrency(Math.abs(amountValue), currency)}
            </span>
          )}
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="inline-flex"
          >
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </motion.span>
        </div>
      </div>

      <BalanceExpandPanel isExpanded={isExpanded} contentClassName="px-4 py-3">
        <BalanceRecentTransactionsPreview
          expenses={expenses}
          counterpartyName={balance.counterparty_name}
          isLoading={isLoading}
          onViewDetails={
            balance.counterparty_id
              ? () => {
                  tap();
                  go({ to: `/debts/${balance.counterparty_id}` });
                }
              : undefined
          }
        />
      </BalanceExpandPanel>
    </div>
  );
}

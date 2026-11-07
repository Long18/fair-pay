import { format } from "date-fns";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";

import { useHaptics } from "@/hooks/use-haptics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/ui/icons";
import { CategoryIcon } from "@/modules/expenses/components/category-icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/locale-utils";
import { BALANCE_EXPAND_INSET_CARD } from "./balance-table-surface";
import { SkeletonCrossFade } from "@/lib/motion";

type PreviewExpense = {
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_name?: string | null;
  category?: string | null;
  my_share: number;
  status: "paid" | "unpaid" | "partial";
  is_settled: boolean;
};

interface BalanceRecentTransactionsPreviewProps {
  expenses: PreviewExpense[];
  counterpartyName: string;
  isLoading?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

function formatExpenseDate(dateString: string) {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function BalanceRecentTransactionsPreview({
  expenses,
  counterpartyName,
  isLoading = false,
  onViewDetails,
  className,
}: BalanceRecentTransactionsPreviewProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  const openExpense = (expenseId: string) => {
    tap();
    go({ to: `/expenses/show/${expenseId}` });
  };

  const breakdownFooter = onViewDetails ? (
    <div className="relative min-h-9 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={isLoading}
        aria-busy={isLoading}
        className={cn(
          "h-9 w-full justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium",
          isLoading && "pointer-events-none border-transparent bg-transparent shadow-none"
        )}
        onClick={onViewDetails}
      >
        <span className={cn(isLoading && "invisible")}>
          {t("dashboard.viewFullBreakdown", "View full breakdown")}
        </span>
        <ArrowRightIcon className={cn("h-4 w-4", isLoading && "invisible")} />
      </Button>
      {isLoading ? (
        <Skeleton
          className="pointer-events-none absolute inset-0 h-9 w-full rounded-lg"
          aria-hidden
        />
      ) : null}
    </div>
  ) : null;

  const minHeightClass = onViewDetails ? "min-h-[216px]" : "min-h-[168px]";

  const loadingSkeleton = (
    <div className={cn("space-y-3", minHeightClass)}>
      <Skeleton className="h-3 w-36" />
      <div className={cn(BALANCE_EXPAND_INSET_CARD, "p-3")}>
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="ml-auto h-3 w-14" />
            <Skeleton className="ml-auto h-5 w-20" />
          </div>
        </div>
      </div>
      {breakdownFooter}
    </div>
  );

  const emptyContent = (
      <div className="min-h-[120px] space-y-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("dashboard.recentWithUser", {
            defaultValue: "Recent with {{name}}",
            name: counterpartyName,
          })}
        </div>
        <div
          className={cn(
            BALANCE_EXPAND_INSET_CARD,
            "border-dashed px-4 py-5 text-sm text-muted-foreground"
          )}
        >
          {t("dashboard.noContributingExpenses", "No expenses found")}
        </div>
        {onViewDetails ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-fit gap-1.5 rounded-md border-border/60 bg-transparent px-3 text-xs font-medium text-muted-foreground shadow-none hover:bg-background/50 hover:text-foreground"
            onClick={onViewDetails}
          >
            <span>{t("dashboard.viewFullBreakdown", "View full breakdown")}</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
  );

  const statusLabels = {
    paid: t("expenses.paid", "Paid"),
    unpaid: t("expenses.unpaid", "Unpaid"),
    partial: t("dashboard.activityFeed.filters.partial", "Partial"),
  } as const;

  const filledContent = expenses.length > 0 ? (() => {
  const recentExpenses = expenses.slice(0, 3);
  const latestExpense = recentExpenses[0]!;
  const olderExpenses = recentExpenses.slice(1);
  const settledExpenses = expenses.filter((expense) => expense.is_settled);
  const settledTotal = settledExpenses.reduce((sum, expense) => sum + expense.my_share, 0);

  return (
    <div className={cn("space-y-3", minHeightClass)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {t("dashboard.recentWithUser", {
          defaultValue: "Recent with {{name}}",
          name: counterpartyName,
        })}
      </div>

      <div className="space-y-1.5">
        <button
          type="button"
          className={cn(
            BALANCE_EXPAND_INSET_CARD,
            "w-full px-3 py-3 text-left transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={() => openExpense(latestExpense.expense_id)}
        >
          <div className="flex items-start gap-3">
            <CategoryIcon category={latestExpense.category} size="sm" className="shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="typography-row-title truncate">{latestExpense.description}</p>
                <PaymentStateBadge state={latestExpense.status} size="sm" />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {formatExpenseDate(latestExpense.expense_date)}
                </span>
                {latestExpense.group_name && (
                  <>
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] font-normal">
                      {latestExpense.group_name}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-muted-foreground/40">·</span>
                <span className="text-xs tabular-nums text-muted-foreground/70">
                  {t("expense.total", "Total")}:{" "}
                  {formatCurrency(latestExpense.amount, latestExpense.currency)}
                </span>
              </div>
            </div>

            <div className="ml-2 flex shrink-0 flex-col items-end">
              <span className="mb-0.5 text-xs text-muted-foreground">
                {t("expense.myShare", "My Share")}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(latestExpense.my_share, latestExpense.currency)}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                {t("dashboard.openExpenseDetail", "Open detail")}
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </button>

        {olderExpenses.length > 0 && (
          <div className={cn(BALANCE_EXPAND_INSET_CARD, "divide-y divide-border/30")}>
            {olderExpenses.map((expense) => (
              <button
                type="button"
                key={`${expense.description}-${expense.expense_date}-${expense.my_share}`}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => openExpense(expense.expense_id)}
              >
                <CategoryIcon category={expense.category} size="sm" className="shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {expense.description}
                    </p>
                    <PaymentStateBadge state={expense.status} size="sm" />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {formatExpenseDate(expense.expense_date)}
                    </span>
                    {expense.group_name && (
                      <>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] font-normal">
                          {expense.group_name}
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs tabular-nums text-muted-foreground/60">
                      {t("expense.total", "Total")}:{" "}
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                </div>

                <div className="ml-2 shrink-0 text-right">
                  <span className="mb-0.5 block text-xs text-muted-foreground">
                    {t("expense.myShare", "My Share")}
                  </span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {formatCurrency(expense.my_share, expense.currency)}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {statusLabels[expense.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {settledExpenses.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-status-success-bg/25 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {t("dashboard.settledTransactionsSummary", {
                defaultValue: "{{count}} settled transactions",
                count: settledExpenses.length,
              })}
            </span>
            <span className="font-medium tabular-nums text-status-success-foreground">
              {formatCurrency(
                settledTotal,
                settledExpenses[0]?.currency || latestExpense.currency
              )}
            </span>
          </div>
        )}
      </div>

      {breakdownFooter}
    </div>
  );
  })() : null;

  const resolvedContent = isLoading
    ? <div className={cn("space-y-3", minHeightClass)} aria-hidden />
    : expenses.length === 0
      ? emptyContent
      : filledContent;

  return (
    <SkeletonCrossFade
      showSkeleton={isLoading}
      skeleton={loadingSkeleton}
      className={className}
    >
      {resolvedContent}
    </SkeletonCrossFade>
  );
}

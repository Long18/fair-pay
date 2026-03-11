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

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-3 w-36" />
        <div className="rounded-lg border bg-background p-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-4 w-28" />
          <div className="mt-4 flex items-end justify-between gap-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="rounded-lg border bg-background">
          {[1, 2].map((row) => (
            <div key={row} className="grid gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("dashboard.recentWithUser", { defaultValue: "Recent with {{name}}", name: counterpartyName })}
        </div>
        <div className="rounded-lg border border-dashed bg-background/70 px-4 py-5 text-sm text-muted-foreground">
          {t("dashboard.noContributingExpenses", "No expenses found")}
        </div>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium"
            onClick={onViewDetails}
          >
            <span>{t("dashboard.viewFullBreakdown", "View full breakdown")}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const recentExpenses = expenses.slice(0, 3);
  const latestExpense = recentExpenses[0];
  const olderExpenses = recentExpenses.slice(1);
  const settledExpenses = expenses.filter((expense) => expense.is_settled);
  const settledTotal = settledExpenses.reduce((sum, expense) => sum + expense.my_share, 0);
  const statusLabels = {
    paid: t("expenses.paid", "Paid"),
    unpaid: t("expenses.unpaid", "Unpaid"),
    partial: t("dashboard.activityFeed.filters.partial", "Partial"),
  } as const;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t("dashboard.recentWithUser", { defaultValue: "Recent with {{name}}", name: counterpartyName })}
      </div>

      <div className="rounded-md bg-muted/20 p-1.5">
        <button
          type="button"
          className="w-full rounded-md border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => openExpense(latestExpense.expense_id)}
        >
          <div className="flex items-start gap-3">
            <CategoryIcon category={latestExpense.category} size="sm" className="shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="typography-row-title truncate">{latestExpense.description}</p>
                <PaymentStateBadge state={latestExpense.status} size="sm" />
              </div>

              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatExpenseDate(latestExpense.expense_date)}
                </span>
                {latestExpense.group_name && (
                  <>
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {latestExpense.group_name}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground/70 tabular-nums">
                  {t("expense.total", "Total")}: {formatCurrency(latestExpense.amount, latestExpense.currency)}
                </span>
              </div>
            </div>

            <div className="ml-2 flex shrink-0 flex-col items-end">
              <span className="text-[10px] text-muted-foreground mb-0.5">
                {t("expense.myShare", "My Share")}
              </span>
              <span className="text-base font-semibold tabular-nums md:text-lg">
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
          <div className="mt-1 overflow-hidden rounded-md">
            {olderExpenses.map((expense) => (
              <button
                type="button"
                key={`${expense.description}-${expense.expense_date}-${expense.my_share}`}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => openExpense(expense.expense_id)}
              >
                <CategoryIcon category={expense.category} size="sm" className="shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate text-foreground">
                      {expense.description}
                    </p>
                    <PaymentStateBadge state={expense.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatExpenseDate(expense.expense_date)}
                    </span>
                    {expense.group_name && (
                      <>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {expense.group_name}
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground/60 tabular-nums">
                      {t("expense.total", "Total")}: {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                </div>

                <div className="ml-2 shrink-0 text-right">
                  <span className="block text-[10px] text-muted-foreground mb-0.5">
                    {t("expense.myShare", "My Share")}
                  </span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {formatCurrency(expense.my_share, expense.currency)}
                  </span>
                  <span className="block mt-1 text-[11px] text-muted-foreground">
                    {statusLabels[expense.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {settledExpenses.length > 0 && (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-md bg-status-success-bg/30 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {t("dashboard.settledTransactionsSummary", {
                defaultValue: "{{count}} settled transactions",
                count: settledExpenses.length,
              })}
            </span>
            <span className="font-medium tabular-nums text-status-success-foreground">
              {formatCurrency(settledTotal, settledExpenses[0]?.currency || latestExpense.currency)}
            </span>
          </div>
        )}
      </div>

      {onViewDetails && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium"
          onClick={onViewDetails}
        >
          <span>{t("dashboard.viewFullBreakdown", "View full breakdown")}</span>
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

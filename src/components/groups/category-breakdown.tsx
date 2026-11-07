import { useTranslation } from "react-i18next";
import { getCategoryMeta } from "@/modules/expenses";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { PieChartIcon } from "@/components/ui/icons";

interface CategoryBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
  totalAmount: number;
  currency?: string;
  variant?: "default" | "compact";
}

export function CategoryBreakdown({
  breakdown,
  totalAmount,
  currency = "₫",
  variant = "default",
}: CategoryBreakdownProps) {
  const { t } = useTranslation();

  if (breakdown.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <PieChartIcon className="mx-auto mb-2 h-6 w-6 opacity-50" aria-hidden />
        <p className="text-sm">{t("reports.noBreakdownData", "No category data")}</p>
      </div>
    );
  }

  if (variant === "compact") {
    const topItems = breakdown.slice(0, 3);

    return (
      <div className="space-y-2.5">
        <div
          className="flex h-2 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={t("groups.spendingByCategory")}
        >
          {breakdown.map((item) => {
            const categoryMeta = getCategoryMeta(item.category);
            if (item.percentage <= 0) {
              return null;
            }
            return (
              <div
                key={item.category}
                className="h-full min-w-[2px]"
                style={{
                  width: `${Math.max(item.percentage, 0.5)}%`,
                  backgroundColor: categoryMeta.chartColor,
                }}
                title={`${item.category}: ${item.percentage.toFixed(0)}%`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topItems.map((item) => {
            const categoryMeta = getCategoryMeta(item.category);
            const Icon = categoryMeta.icon;
            return (
              <div
                key={item.category}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs"
              >
                <Icon className={cn("h-3 w-3 shrink-0", categoryMeta.color)} aria-hidden />
                <span className="truncate font-medium">{item.category}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
          {breakdown.length > 3 ? (
            <span className="self-center px-1 text-[11px] text-muted-foreground">
              {t("common.showMore", { count: breakdown.length - 3, defaultValue: "+{{count}} more" })}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {t("groups.summary.totalTracked", "Total tracked")}: {formatNumber(totalAmount)} {currency}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {breakdown.map((item) => {
        const categoryMeta = getCategoryMeta(item.category);
        const Icon = categoryMeta.icon;

        return (
          <div
            key={item.category}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg p-2", categoryMeta.bgColor)}>
                <Icon className={cn("h-4 w-4", categoryMeta.color)} />
              </div>
              <div>
                <p className="text-sm font-medium">{item.category}</p>
                <p className="text-xs text-muted-foreground">
                  {t("groups.summary.expenseCount", { count: item.count })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">
                {formatNumber(item.amount)} {currency}
              </p>
              <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-sm font-medium">{t("dashboard.activityFeed.total", "Total")}:</span>
        <span className="text-lg font-bold tabular-nums">
          {formatNumber(totalAmount)} {currency}
        </span>
      </div>
    </div>
  );
}

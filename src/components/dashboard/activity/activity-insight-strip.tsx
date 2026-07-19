import * as React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownIcon, ArrowUpIcon, ScaleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatCurrency, type SupportedCurrency } from "@/lib/format-utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { FilterCounts, PaymentStateFilter } from "./activity-filter-controls";

export interface ActivityInsightStripProps {
  totalOwed: number;
  totalToReceive: number;
  netBalance: number;
  currency: SupportedCurrency;
  counts: FilterCounts;
  activeFilter: PaymentStateFilter;
  onFilterChange: (filter: PaymentStateFilter) => void;
  className?: string;
}

export const ActivityInsightStrip: React.FC<ActivityInsightStripProps> = ({
  totalOwed,
  totalToReceive,
  netBalance,
  currency,
  counts,
  activeFilter,
  onFilterChange,
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  const moneyCards = [
    {
      key: "owe",
      label: t("dashboard.activityFeed.insight.youOwe", "You owe"),
      value: formatCurrency(totalOwed, currency),
      icon: ArrowDownIcon,
      tone: "text-semantic-negative",
      surface: "bg-semantic-negative/8",
    },
    {
      key: "owed",
      label: t("dashboard.activityFeed.insight.owedToYou", "Owed to you"),
      value: formatCurrency(totalToReceive, currency),
      icon: ArrowUpIcon,
      tone: "text-semantic-positive",
      surface: "bg-semantic-positive/8",
    },
    {
      key: "net",
      label: t("dashboard.activityFeed.insight.net", "Net"),
      value: `${netBalance > 0 ? "+" : netBalance < 0 ? "-" : ""}${formatCurrency(Math.abs(netBalance), currency)}`,
      icon: ScaleIcon,
      tone:
        netBalance > 0
          ? "text-semantic-positive"
          : netBalance < 0
            ? "text-semantic-negative"
            : "text-muted-foreground",
      surface: "bg-muted/60",
    },
  ] as const;

  const statusFilters: Array<{
    value: PaymentStateFilter;
    label: string;
    count: number;
    activeClass: string;
  }> = [
    {
      value: "all",
      label: t("dashboard.activityFeed.filters.all", "All"),
      count: counts.all,
      activeClass: "border-primary bg-primary text-primary-foreground shadow-sm",
    },
    {
      value: "paid",
      label: t("dashboard.activityFeed.filters.paid", "Paid"),
      count: counts.paid,
      activeClass:
        "border-status-success-border bg-status-success-bg text-status-success-foreground shadow-sm",
    },
    {
      value: "partial",
      label: t("dashboard.activityFeed.filters.partial", "Partial"),
      count: counts.partial,
      activeClass:
        "border-status-info-border bg-status-info-bg text-status-info-foreground shadow-sm",
    },
    {
      value: "unpaid",
      label: t("dashboard.activityFeed.filters.unpaid", "Unpaid"),
      count: counts.unpaid,
      activeClass:
        "border-status-warning-border bg-status-warning-bg text-status-warning-foreground shadow-sm",
    },
  ];

  return (
    <div className={cn("space-y-3 border-b border-border bg-muted/20 p-4", className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {moneyCards.map((card) => (
          <div
            key={card.key}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5",
              card.surface
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80">
              <card.icon className={cn("size-4", card.tone)} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className={cn("truncate typography-amount-prominent", card.tone)}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label={t("dashboard.activityFeed.filters.groupLabel", "Filter activity by payment state")}
      >
        {statusFilters.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                tap();
                onFilterChange(filter.value);
              }}
              aria-pressed={isActive}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? filter.activeClass
                  : "border-border/80 bg-background/80 text-foreground hover:bg-muted/70"
              )}
            >
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wide",
                  isActive ? "opacity-90" : "text-muted-foreground"
                )}
              >
                {filter.label}
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
                {filter.count}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

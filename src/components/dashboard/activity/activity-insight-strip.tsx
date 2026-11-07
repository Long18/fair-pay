import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowDownIcon, ArrowUpIcon, ScaleIcon } from "@/components/ui/icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { formatCurrency, type SupportedCurrency } from "@/lib/format-utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { FilterCounts, PaymentStateFilter } from "./activity-filter-controls";
import {
  DashboardMetricsIsland,
  type DashboardMetricExpandRow,
  type DashboardMetricItem,
} from "../shared/dashboard-metrics-island";
import {
  DashboardNotchDock,
  DASHBOARD_NOTCH_MENU_BAR_PT,
} from "../shared/dashboard-notch-dock";

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

const FILTER_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

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
  const reducedMotion = useReducedMotion();

  const totals: readonly DashboardMetricItem[] = [
    {
      key: "owe",
      label: t("dashboard.activityFeed.insight.youOwe", "You owe"),
      value: formatCurrency(totalOwed, currency),
      icon: ArrowDownIcon,
      tone: "text-semantic-negative",
    },
    {
      key: "owed",
      label: t("dashboard.activityFeed.insight.owedToYou", "Owed to you"),
      value: formatCurrency(totalToReceive, currency),
      icon: ArrowUpIcon,
      tone: "text-semantic-positive",
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
      anchor: true,
    },
  ];

  const statusFilters: Array<{
    value: PaymentStateFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "all",
      label: t("dashboard.activityFeed.filters.all", "All"),
      count: counts.all,
    },
    {
      value: "paid",
      label: t("dashboard.activityFeed.filters.paid", "Paid"),
      count: counts.paid,
    },
    {
      value: "partial",
      label: t("dashboard.activityFeed.filters.partial", "Partial"),
      count: counts.partial,
    },
    {
      value: "unpaid",
      label: t("dashboard.activityFeed.filters.unpaid", "Unpaid"),
      count: counts.unpaid,
    },
  ];

  const expandRows = React.useMemo((): readonly DashboardMetricExpandRow[] => {
    const activeCount = counts[activeFilter];
    const activeLabel = t(`dashboard.activityFeed.filters.${activeFilter}`, activeFilter);

    return [
      {
        key: "active-filter",
        label: t("dashboard.activityFeed.insight.expand.viewing", "Viewing"),
        value: `${activeLabel} · ${activeCount}`,
      },
      {
        key: "paid",
        label: t("dashboard.activityFeed.filters.paid", "Paid"),
        value: String(counts.paid),
        tone: "text-semantic-positive",
      },
      {
        key: "unpaid",
        label: t("dashboard.activityFeed.filters.unpaid", "Unpaid"),
        value: String(counts.unpaid),
        tone: "text-semantic-negative",
      },
      {
        key: "partial",
        label: t("dashboard.activityFeed.filters.partial", "Partial"),
        value: String(counts.partial),
        tone: "text-muted-foreground",
      },
    ];
  }, [activeFilter, counts, t]);

  return (
    <div className={cn("relative flex flex-col", className)}>
      <DashboardNotchDock>
        <DashboardMetricsIsland
          items={totals}
          variant="notch"
          expandable
          expandRows={expandRows}
          expandAriaLabel={t(
            "dashboard.activityFeed.insight.expand.toggle",
            "Activity totals summary",
          )}
        />
      </DashboardNotchDock>

      <div
        className={cn(
          "flex justify-center border-b border-border/60 px-3 py-2 sm:px-4 sm:py-2.5",
          DASHBOARD_NOTCH_MENU_BAR_PT,
        )}
      >
        <ToggleGroup
          type="single"
          value={activeFilter}
          onValueChange={(value) => {
            if (!value) return;
            tap();
            onFilterChange(value as PaymentStateFilter);
          }}
          variant="outline"
          size="sm"
          className="mx-auto h-8 w-auto max-w-full items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-none"
          aria-label={t("dashboard.activityFeed.filters.groupLabel", "Filter activity by payment state")}
        >
          {statusFilters.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <ToggleGroupItem
                key={filter.value}
                value={filter.value}
                className={cn(
                  "relative h-7 min-w-0 flex-none gap-1 whitespace-nowrap rounded-md border-0 px-2 text-[11px] shadow-none sm:px-2.5 sm:text-xs",
                  "data-[variant=outline]:border-0",
                  "data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:shadow-none",
                )}
              >
                {isActive ? (
                  reducedMotion ? (
                    <span
                      className="absolute inset-0 rounded-md bg-background shadow-none ring-1 ring-border/60"
                      aria-hidden
                    />
                  ) : (
                    <motion.span
                      layoutId="activity-filter-pill"
                      className="absolute inset-0 rounded-md bg-background shadow-none ring-1 ring-border/60"
                      transition={FILTER_SPRING}
                      aria-hidden
                    />
                  )
                ) : null}
                <span className="relative z-10 inline-flex min-w-0 items-center gap-1">
                  <span className="truncate">{filter.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{filter.count}</span>
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
    </div>
  );
};

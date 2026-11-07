import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownIcon, ArrowUpIcon, ScaleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/locale-utils";
import {
  DashboardMetricsIsland,
  type DashboardMetricExpandRow,
  type DashboardMetricItem,
} from "../shared/dashboard-metrics-island";
import type { BalanceTotalsSummaryContext } from "./balance-summary-context";
import type { BalanceTotals } from "./summary-strip";

export type { BalanceTotalsSummaryContext } from "./balance-summary-context";

interface BalanceTotalsStripProps {
  totals: BalanceTotals;
  isLoading?: boolean;
  className?: string;
  summaryContext?: BalanceTotalsSummaryContext;
  /** When true, parent positions the island on the card top edge (no strip padding). */
  docked?: boolean;
}

export function BalanceTotalsStrip({
  totals,
  isLoading,
  className,
  summaryContext,
  docked = false,
}: BalanceTotalsStripProps) {
  const { t } = useTranslation();

  const items: readonly DashboardMetricItem[] = [
    {
      key: "owe",
      label: t("dashboard.youOwe", "You owe"),
      value: formatCurrency(totals.youOwe, totals.currency),
      icon: ArrowDownIcon,
      tone: "text-semantic-negative",
    },
    {
      key: "owed",
      label: t("dashboard.youAreOwed", "You are owed"),
      value: formatCurrency(totals.owedToYou, totals.currency),
      icon: ArrowUpIcon,
      tone: "text-semantic-positive",
    },
    {
      key: "net",
      label: t("dashboard.netBalance", "Net balance"),
      value: `${totals.net >= 0 ? "+" : ""}${formatCurrency(totals.net, totals.currency)}`,
      icon: ScaleIcon,
      tone:
        totals.net > 0
          ? "text-semantic-positive"
          : totals.net < 0
            ? "text-semantic-negative"
            : "text-muted-foreground",
      anchor: true,
    },
  ];

  const expandRows = useMemo((): readonly DashboardMetricExpandRow[] | undefined => {
    if (!summaryContext) return undefined;
    const rows: DashboardMetricExpandRow[] = [
      {
        key: "people",
        label: t("dashboard.balancesExpand.people", "People in balances"),
        value: String(summaryContext.peopleCount),
      },
    ];

    if (summaryContext.topEntry) {
      const { name, amount, youOwe } = summaryContext.topEntry;
      rows.push({
        key: "top",
        label: youOwe
          ? t("dashboard.balancesExpand.topYouOwe", "Largest amount you owe")
          : t("dashboard.balancesExpand.topOwedYou", "Largest amount owed to you"),
        value: `${name} · ${formatCurrency(amount, totals.currency)}`,
        tone: youOwe ? "text-semantic-negative" : "text-semantic-positive",
      });
    }

    const netExplain =
      totals.net > 0
        ? t("dashboard.balancesExpand.netPositive", "Overall, others owe you more than you owe.")
        : totals.net < 0
          ? t("dashboard.balancesExpand.netNegative", "Overall, you owe more than you're owed.")
          : t("dashboard.balancesExpand.netZero", "Your totals are even.");

    rows.push({
      key: "net-hint",
      label: t("dashboard.balancesExpand.snapshot", "Snapshot"),
      value: netExplain,
      tone: "text-muted-foreground",
    });

    return rows;
  }, [summaryContext, t, totals.currency, totals.net]);

  return (
    <div
      className={cn(
        "flex justify-center",
        docked ? "px-0" : "px-3 pt-2 pb-2 sm:px-4",
        className,
      )}
      aria-busy={isLoading}
    >
      <DashboardMetricsIsland
        items={items}
        isLoading={isLoading}
        variant="notch"
        expandable
        expandRows={expandRows}
        expandAriaLabel={t("dashboard.netBalanceSummary", "Balance summary")}
      />
    </div>
  );
}

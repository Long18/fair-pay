import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import {
  BalanceTotalsStrip,
  type BalanceTotalsSummaryContext,
} from "./balance-totals-strip";
import type { BalanceTotals } from "./summary-strip";
import {
  DashboardNotchDock,
  DASHBOARD_NOTCH_MENU_BAR_PT,
} from "../shared/dashboard-notch-dock";

export type BalanceFilter = "all" | "owe" | "owed";

interface BalanceTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: BalanceFilter;
  onFilterChange: (value: BalanceFilter) => void;
  filterCounts: { all: number; owe: number; owed: number };
  totals: BalanceTotals;
  summaryContext?: BalanceTotalsSummaryContext;
  isLoading?: boolean;
}

const FILTER_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

export function BalanceTableToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  totals,
  summaryContext,
  isLoading,
}: BalanceTableToolbarProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative flex flex-col">
      <DashboardNotchDock>
        <BalanceTotalsStrip
          docked
          totals={totals}
          summaryContext={summaryContext}
          isLoading={isLoading}
        />
      </DashboardNotchDock>

      <div
        className={cn(
          "flex flex-col gap-2 border-b border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2.5",
          DASHBOARD_NOTCH_MENU_BAR_PT,
        )}
      >
        <div className="relative min-w-0 w-full sm:min-w-[12rem] sm:flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("dashboard.balancesSearchPlaceholder")}
            className={cn(
              "h-8 rounded-lg border border-border/60 bg-background pl-8 pr-8 text-sm shadow-none",
              "placeholder:text-muted-foreground/80",
            )}
            aria-label={t("dashboard.balancesSearchAria")}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                tap();
                onSearchChange("");
              }}
              className="absolute right-1.5 top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("common.clear")}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <ToggleGroup
          type="single"
          value={activeFilter}
          onValueChange={(value) => {
            if (!value) return;
            tap();
            onFilterChange(value as BalanceFilter);
          }}
          variant="outline"
          size="sm"
          className="h-8 w-full shrink-0 items-center justify-stretch gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-none sm:w-auto"
          aria-label={t("dashboard.balancesFilterLabel")}
        >
          {(
            [
              {
                value: "all" as const,
                label: t("dashboard.activityFeed.filters.all"),
                count: filterCounts.all,
              },
              {
                value: "owe" as const,
                label: t("dashboard.youOwe"),
                count: filterCounts.owe,
              },
              {
                value: "owed" as const,
                label: t("dashboard.userOwesYou"),
                count: filterCounts.owed,
              },
            ] as const
          ).map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <ToggleGroupItem
                key={filter.value}
                value={filter.value}
                className={cn(
                  "relative h-7 min-w-0 flex-1 gap-1 whitespace-nowrap rounded-md border-0 px-2 text-[11px] shadow-none sm:flex-none sm:px-2.5 sm:text-xs",
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
                      layoutId="balance-filter-pill"
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
}

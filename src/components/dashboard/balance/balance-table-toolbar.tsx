import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type BalanceFilter = "all" | "owe" | "owed";

interface BalanceTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: BalanceFilter;
  onFilterChange: (value: BalanceFilter) => void;
  filterCounts: { all: number; owe: number; owed: number };
}

export function BalanceTableToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
}: BalanceTableToolbarProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("dashboard.balancesSearchPlaceholder", "Search people…")}
          className="h-9 rounded-md border-border bg-background pl-9 pr-9"
          aria-label={t("dashboard.balancesSearchAria", "Search balances")}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              tap();
              onSearchChange("");
            }}
            className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("common.clear", "Clear")}
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
        className="w-full justify-start gap-0 rounded-md border border-border bg-muted/30 p-0.5 shadow-none sm:w-auto"
        aria-label={t("dashboard.balancesFilterLabel", "Filter balances")}
      >
        {(
          [
            {
              value: "all" as const,
              label: t("dashboard.activityFeed.filters.all", "All"),
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
                "relative h-8 gap-1.5 rounded-sm border-0 px-3 text-xs shadow-none",
                "first:rounded-sm last:rounded-sm",
                "data-[variant=outline]:border-0 data-[variant=outline]:first:border-0",
                // Pill provides the active surface — keep item transparent.
                "data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:shadow-none"
              )}
            >
              {isActive ? (
                reducedMotion ? (
                  <span
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    aria-hidden
                  />
                ) : (
                  <motion.span
                    layoutId="balance-filter-pill"
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    aria-hidden
                  />
                )
              ) : null}
              <span className="relative z-10">{filter.label}</span>
              <span className="relative z-10 tabular-nums text-muted-foreground">
                {filter.count}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

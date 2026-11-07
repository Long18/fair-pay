import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type DebtFilterTab = "all" | "unsettled" | "settled";

interface DebtFilterTabsProps {
  activeTab: DebtFilterTab;
  onTabChange: (tab: DebtFilterTab) => void;
  counts: {
    all: number;
    unsettled: number;
    settled: number;
  };
  className?: string;
}

const FILTER_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

export function DebtFilterTabs({
  activeTab,
  onTabChange,
  counts,
  className,
}: DebtFilterTabsProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();

  const filters: { value: DebtFilterTab; label: string; count: number }[] = [
    {
      value: "unsettled",
      label: t("debts.filterOpen", "Open"),
      count: counts.unsettled,
    },
    {
      value: "all",
      label: t("debts.filterAll", "All"),
      count: counts.all,
    },
    {
      value: "settled",
      label: t("debts.filterSettled", "Settled"),
      count: counts.settled,
    },
  ];

  return (
    <div className={cn("flex w-full items-center justify-center", className)}>
      <ToggleGroup
        type="single"
        value={activeTab}
        onValueChange={(value) => {
          if (!value) return;
          tap();
          onTabChange(value as DebtFilterTab);
        }}
        variant="outline"
        size="sm"
        className="mx-auto h-8 w-auto max-w-full items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-none"
        aria-label={t("debts.expenseFilterLabel", "Filter expenses")}
      >
        {filters.map((filter) => {
          const isActive = activeTab === filter.value;
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
                    layoutId="debt-filter-pill"
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
  );
}

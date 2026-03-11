import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

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

export function DebtFilterTabs({
  activeTab,
  onTabChange,
  counts,
  className,
}: DebtFilterTabsProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  const tabs: { key: DebtFilterTab; label: string; count: number }[] = [
    {
      key: "unsettled",
      label: t("debts.filterOpen", "Open"),
      count: counts.unsettled,
    },
    {
      key: "all",
      label: t("debts.filterAll", "All"),
      count: counts.all,
    },
    {
      key: "settled",
      label: t("debts.filterSettled", "Settled"),
      count: counts.settled,
    },
  ];

  return (
    <div className={cn("rounded-xl bg-muted/60 p-1", className)} role="tablist">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                tap();
                onTabChange(tab.key);
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 text-xs font-medium opacity-60">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

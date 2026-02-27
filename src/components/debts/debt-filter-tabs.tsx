import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

  const tabs: { key: DebtFilterTab; label: string; count: number }[] = [
    { key: "all", label: t("debts.filterAll", "All"), count: counts.all },
    { key: "unsettled", label: t("debts.filterUnsettled", "Unsettled"), count: counts.unsettled },
    { key: "settled", label: t("debts.filterSettled", "Settled"), count: counts.settled },
  ];

  return (
    <div
      className={cn(
        "flex bg-card border-b border-border sticky top-0 z-[150] touch-manipulation",
        className
      )}
      role="tablist"
      aria-label={t("debts.filterTabs", "Filter expenses")}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5",
            "text-sm font-medium border-b-2 transition-colors cursor-pointer",
            activeTab === tab.key
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              activeTab === tab.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground border border-border"
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

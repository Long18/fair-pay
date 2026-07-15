import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        tap();
        onTabChange(value as DebtFilterTab);
      }}
      className={cn("w-full", className)}
    >
      <TabsList className="grid w-full grid-cols-3 h-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="px-3 py-2 font-semibold"
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 text-xs font-medium opacity-60">
              {tab.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

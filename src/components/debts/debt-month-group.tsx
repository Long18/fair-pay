import { useState, useMemo } from "react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/ui/icons";

interface DebtMonthGroupProps {
  monthKey: string; // "2026-02"
  netAmount: number;
  currency: string;
  settledCount: number;
  showSettledToggle: boolean;
  children: React.ReactNode;
  settledChildren?: React.ReactNode;
}

export function DebtMonthGroup({
  monthKey,
  netAmount,
  currency,
  settledCount,
  showSettledToggle,
  children,
  settledChildren,
}: DebtMonthGroupProps) {
  const { t, i18n } = useTranslation();
  const [settledExpanded, setSettledExpanded] = useState(false);
  const dateLocale = i18n.language === "vi" ? vi : enUS;

  const monthLabel = useMemo(() => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, "MMMM yyyy", { locale: dateLocale });
  }, [monthKey, dateLocale]);

  const isNegative = netAmount < 0;

  return (
    <div>
      {/* Sticky month label */}
      <div className="sticky top-[41px] z-[100] bg-background flex items-center justify-between px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {monthLabel}
        </span>
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            isNegative
              ? "text-red-700 dark:text-red-400"
              : "text-green-700 dark:text-green-400"
          )}
        >
          {isNegative ? "−" : "+"}
          {formatCurrency(Math.abs(netAmount), currency)}
        </span>
      </div>

      {/* Unsettled items */}
      {children}

      {/* Settled section: collapsible toggle or direct render */}
      {settledCount > 0 && (
        showSettledToggle ? (
          <>
            <button
              onClick={() => setSettledExpanded((v) => !v)}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5",
                "border-b border-border bg-card",
                "text-xs font-medium text-muted-foreground",
                "cursor-pointer select-none transition-colors hover:bg-muted/50"
              )}
              aria-expanded={settledExpanded}
            >
              <ChevronRightIcon
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  settledExpanded && "rotate-90"
                )}
              />
              {t("debts.settledExpenses", "Settled expenses")}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                {settledCount}
              </span>
              <span className="ml-auto text-[11px]">
                {settledExpanded
                  ? t("debts.hide", "Hide")
                  : t("debts.show", "Show")}
              </span>
            </button>
            {settledExpanded && settledChildren}
          </>
        ) : (
          /* Settled tab: render settled items directly without collapsible */
          settledChildren
        )
      )}
    </div>
  );
}

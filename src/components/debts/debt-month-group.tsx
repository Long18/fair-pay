import { useState, useMemo } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, CheckCircle2Icon } from "@/components/ui/icons";

interface ParticipantInfo {
  name: string;
  avatarUrl?: string | null;
}

interface DebtMonthGroupProps {
  monthKey: string; // "2026-02"
  netAmount: number;
  currency: string;
  settledCount: number;
  settledTotal?: number;
  showSettledToggle: boolean;
  participants?: ParticipantInfo[];
  children: React.ReactNode;
  settledChildren?: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DebtMonthGroup({
  monthKey,
  netAmount,
  currency,
  settledCount,
  settledTotal = 0,
  showSettledToggle,
  participants,
  children,
  settledChildren,
}: DebtMonthGroupProps) {
  const { t, i18n } = useTranslation();
  const { tap } = useHaptics();
  const [settledExpanded, setSettledExpanded] = useState(false);

  const monthLabel = useMemo(() => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(i18n.language, {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [monthKey, i18n.language]);

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
              onClick={() => { tap(); setSettledExpanded((v) => !v); }}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-3",
                "border-b border-border",
                "bg-status-success-bg/30",
                "cursor-pointer select-none transition-colors hover:bg-status-success-bg/50"
              )}
              aria-expanded={settledExpanded}
            >
              <ChevronRightIcon
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-200 shrink-0",
                  settledExpanded && "rotate-90"
                )}
              />
              <CheckCircle2Icon className="h-3.5 w-3.5 text-status-success-foreground shrink-0" />
              {participants && participants.length > 0 && (
                <div className="flex -space-x-1.5 shrink-0" aria-label="Participants">
                  {participants.map((p) => (
                    <Avatar key={p.name} className="h-5 w-5 border border-status-success-border">
                      <AvatarImage src={p.avatarUrl || undefined} alt={p.name} />
                      <AvatarFallback className="text-[7px] font-bold bg-status-success-bg text-status-success-foreground">
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {t("debts.settledExpenses", "Settled expenses")}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-status-success-bg border border-status-success-border text-status-success-foreground">
                {settledCount}
              </span>
              {settledTotal > 0 && (
                <span className="text-[11px] font-semibold tabular-nums text-status-success-foreground/70">
                  {formatCurrency(settledTotal, currency)}
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
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

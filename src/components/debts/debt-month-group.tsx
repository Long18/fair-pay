import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";

interface ParticipantInfo {
  name: string;
  avatarUrl?: string | null;
}

interface DebtMonthGroupProps {
  monthKey: string;
  netAmount: number;
  currency: string;
  settledCount: number;
  settledTotal?: number;
  participants?: ParticipantInfo[];
  defaultSettledExpanded?: boolean;
  children: React.ReactNode;
  settledChildren?: React.ReactNode;
}

function formatSignedCurrency(amount: number, currency: string) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function ParticipantChipRow({
  participants,
  maxVisible = 3,
}: {
  participants: ParticipantInfo[];
  maxVisible?: number;
}) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - visibleParticipants.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleParticipants.map((participant) => (
        <div
          key={participant.name}
          className="inline-flex items-center gap-1.5 rounded-full border border-status-success-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
        >
          <Avatar className="h-4 w-4">
            <AvatarImage src={participant.avatarUrl || undefined} alt={participant.name} />
            <AvatarFallback className="bg-status-success-bg text-[8px] font-bold text-status-success-foreground">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          <span>{getFirstName(participant.name)}</span>
          <CheckCircle2Icon className="h-3 w-3 text-status-success" />
        </div>
      ))}

      {remainingCount > 0 && (
        <div className="inline-flex items-center rounded-full border border-status-success-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export function DebtMonthGroup({
  monthKey,
  netAmount,
  currency,
  settledCount,
  settledTotal = 0,
  participants,
  defaultSettledExpanded = false,
  children,
  settledChildren,
}: DebtMonthGroupProps) {
  const { t, i18n } = useTranslation();
  const [settledExpanded, setSettledExpanded] = useState(defaultSettledExpanded);

  useEffect(() => {
    setSettledExpanded(defaultSettledExpanded);
  }, [defaultSettledExpanded, monthKey]);

  const monthLabel = useMemo(() => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    return new Intl.DateTimeFormat(i18n.language, {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [monthKey, i18n.language]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {monthLabel}
        </h3>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            netAmount < 0
              ? "text-semantic-negative"
              : netAmount > 0
                ? "text-semantic-positive"
                : "text-muted-foreground"
          )}
        >
          {formatSignedCurrency(netAmount, currency)}{" "}
          <span className="text-muted-foreground">
            {t("debts.netSuffix", "net")}
          </span>
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {children}
      </div>

      {settledCount > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSettledExpanded((value) => !value)}
            className="w-full rounded-xl border border-border bg-muted/35 px-4 py-3 text-left transition-colors hover:bg-muted/55"
            aria-expanded={settledExpanded}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2Icon className="h-4 w-4 text-status-success" />
                  <span className="text-sm font-semibold text-foreground">
                    {t("debts.settledExpensesCount", "Settled {{count}} expenses", {
                      count: settledCount,
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · {formatCurrency(settledTotal, currency)}
                  </span>
                </div>

                {participants && participants.length > 0 && (
                  <ParticipantChipRow participants={participants} />
                )}
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {settledExpanded
                  ? t("debts.hideDetails", "Hide details")
                  : t("debts.showDetails", "Show details")}
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    settledExpanded && "rotate-180"
                  )}
                />
              </span>
            </div>
          </button>

          {settledExpanded && settledChildren && (
            <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-muted/15 px-2">
              {settledChildren}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import type { UserBalance } from "@/modules/payments/types";

type GroupShowSummaryStripProps = {
  myNetBalance: number;
  expenseCount: number;
  memberCount: number;
  topCounterpartyRows: UserBalance[];
};

export function GroupShowSummaryStrip({
  myNetBalance,
  expenseCount,
  memberCount,
  topCounterpartyRows,
}: GroupShowSummaryStripProps) {
  const { t } = useTranslation();

  const contextualLine =
    topCounterpartyRows.length > 0 ? (
      <ul className="space-y-0.5 text-xs tabular-nums text-muted-foreground">
        {topCounterpartyRows.map((row) => (
          <li key={row.user_id} className="truncate">
            <span className="font-medium text-foreground">{row.user_name}</span>
            {": "}
            {formatNumber(Math.abs(row.balance))} ₫
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-muted-foreground">
        {t("groups.membersCount", "{{count}} members", { count: memberCount })}
        {expenseCount > 0 ? (
          <>
            {" · "}
            {t("groups.summary.expenseCount", { count: expenseCount })}
          </>
        ) : null}
      </p>
    );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">
          {t("groups.yourNetBalance", "Your net balance")}
        </p>
        <p
          className={cn(
            "text-xl font-semibold tabular-nums tracking-tight",
            myNetBalance >= 0 ? "text-semantic-positive" : "text-semantic-negative"
          )}
        >
          {myNetBalance >= 0 ? "+" : "−"}
          {formatNumber(Math.abs(myNetBalance))} ₫
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {myNetBalance >= 0
            ? t("reports.youAreOwed", "You are owed")
            : t("reports.youOwe", "You owe")}
        </p>
      </div>
      <div className="min-w-0 sm:max-w-[55%] sm:text-right">
        {topCounterpartyRows.length > 0 ? (
          <>
            <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-right">
              {t("groups.topOwedToYou", "Owe you the most")}
            </p>
            {contextualLine}
          </>
        ) : (
          contextualLine
        )}
      </div>
    </div>
  );
}

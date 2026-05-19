import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "./ShareSheet";
import { formatCurrency } from "@/lib/locale-utils";

interface GroupSummaryCardProps {
  groupName: string;
  totalExpenses: number;
  memberCount: number;
  currency?: string;
}

export function GroupSummaryCard({
  groupName,
  totalExpenses,
  memberCount,
  currency = "VND",
}: GroupSummaryCardProps) {
  const { t } = useTranslation();
  const formattedTotal = formatCurrency(totalExpenses, currency);
  const shareUrl = window.location.href;
  const shareTitle = t(
    "groupSummary.shareTitle",
    "Check out {{name}} on FairPay — splitting {{total}} across {{count}} members!",
    { name: groupName, total: formattedTotal, count: memberCount },
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-lg">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold leading-tight">{groupName}</p>
            <p className="mt-1 text-sm font-medium opacity-80">
              {t("groupSummary.members", "{{count}} members", { count: memberCount })}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/20 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
              {t("groupSummary.total", "Total")}
            </p>
            <p className="text-base font-extrabold tabular-nums">{formattedTotal}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] font-semibold tracking-wide opacity-60">FairPay</p>
          <ShareSheet
            url={shareUrl}
            title={shareTitle}
            trigger={
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1.5 rounded-lg bg-white/20 px-3 text-xs font-semibold text-primary-foreground hover:bg-white/30"
              >
                <span aria-hidden>↗</span>
                {t("groupSummary.share", "Share")}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

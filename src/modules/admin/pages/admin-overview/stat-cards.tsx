import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  UsersIcon,
  GroupIcon,
  ReceiptIcon,
  CreditCardIcon,
  ActivityIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@/components/ui/icons";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { formatNumber } from "@/lib/locale-utils";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";
import type { AdminStats } from "../../types";
import { useAdminTranslation } from "../../i18n";
import { calcTrendPercent } from "./hooks";

const STAT_CARDS = [
  { key: "totalUsers", labelKey: "overview.totalUsers", icon: UsersIcon, tone: "brand" as ThemeIntent },
  { key: "totalGroups", labelKey: "overview.totalGroups", icon: GroupIcon, tone: "chart2" as ThemeIntent },
  { key: "totalExpenses", labelKey: "overview.totalExpenses", icon: ReceiptIcon, tone: "accent" as ThemeIntent },
  { key: "totalPayments", labelKey: "overview.totalPayments", icon: CreditCardIcon, tone: "success" as ThemeIntent },
  { key: "activeUsersLast7Days", labelKey: "overview.activeUsers7d", icon: ActivityIcon, tone: "chart5" as ThemeIntent },
] as const;

type StatKey = (typeof STAT_CARDS)[number]["key"];

function trendFor(key: StatKey, stats: AdminStats): number {
  switch (key) {
    case "totalUsers":
      return calcTrendPercent(stats.totalUsers, stats.prevTotalUsers);
    case "totalGroups":
      return calcTrendPercent(stats.totalGroups, stats.prevTotalGroups);
    case "totalExpenses":
      return calcTrendPercent(stats.currExpenses30d, stats.prevExpenses30d);
    case "totalPayments":
      return calcTrendPercent(stats.currPayments30d, stats.prevPayments30d);
    case "activeUsersLast7Days":
      return calcTrendPercent(stats.activeUsersLast7Days, stats.prevActiveUsers7d);
  }
}

function TrendIndicator({ value, isPositive }: { value: number; isPositive: boolean }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        —
      </span>
    );
  }
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        isPositive
          ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]"
          : "bg-[var(--status-error-bg)] text-[var(--status-error-foreground)]"
      }`}
    >
      <Icon size={10} />
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="gap-0 p-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-muted animate-pulse" />
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-5 w-14 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

export function OverviewStatCards({
  stats,
  loading,
}: {
  stats: AdminStats | undefined;
  loading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation([...STAT_CARDS]);

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 viewport-transition-grid"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={animationKey}
      aria-label={tAdmin("overview.keyMetrics")}
    >
      {loading
        ? STAT_CARDS.map((card) => <StatCardSkeleton key={card.key} />)
        : STAT_CARDS.map((card, index) => {
            const Icon = card.icon;
            const value = stats?.[card.key] ?? 0;
            const trendPercent = stats ? trendFor(card.key, stats) : 0;
            return (
              <motion.div key={card.key} variants={rowVariants} custom={index}>
                <Card className="gap-0 p-3 transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${themeIntentTones[card.tone].surface} ${themeIntentTones[card.tone].icon}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[11px] font-medium text-muted-foreground">
                        {tAdmin(card.labelKey)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold leading-tight tabular-nums tracking-tight">
                          {formatNumber(value)}
                        </span>
                        <TrendIndicator value={Math.abs(trendPercent)} isPositive={trendPercent >= 0} />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
    </motion.div>
  );
}

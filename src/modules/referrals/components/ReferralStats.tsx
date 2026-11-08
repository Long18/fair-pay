import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useReferralStats } from "../hooks/use-referral";

const statsShellClass =
  "overflow-hidden rounded-xl border border-border/60 bg-card shadow-none";

const statsListClass =
  "grid grid-cols-3 divide-border/60 max-md:divide-x md:grid-cols-1 md:divide-y md:divide-border/60";

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-2.5 md:flex-row md:items-baseline md:gap-2 md:px-3 md:py-2">
      <span className="text-xl font-bold tabular-nums leading-none md:text-lg md:font-semibold">
        {value}
      </span>
      <span className="text-center text-[10px] leading-tight text-muted-foreground md:text-left md:text-xs">
        {label}
      </span>
    </div>
  );
}

function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(statsShellClass, className)}>
      <div className={statsListClass}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 px-2 py-2.5 md:flex-row md:items-center md:gap-2 md:px-3 md:py-2"
          >
            <Skeleton className="h-6 w-8 md:h-5 md:w-6" />
            <Skeleton className="h-3 w-14 md:h-3 md:w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReferralStats({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useReferralStats();

  const stats = data ?? { invited: 0, signedUp: 0, active: 0 };

  if (isLoading) {
    return <StatsSkeleton className={className} />;
  }

  return (
    <div className={cn(statsShellClass, className)}>
      <div className={statsListClass}>
        <StatRow
          label={t("referrals.stats.invited", "Friends invited")}
          value={stats.invited}
        />
        <StatRow
          label={t("referrals.stats.signedUp", "Signed up")}
          value={stats.signedUp}
        />
        <StatRow
          label={t("referrals.stats.active", "Active")}
          value={stats.active}
        />
      </div>
    </div>
  );
}

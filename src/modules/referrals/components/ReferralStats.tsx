import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReferralStats } from "../hooks/use-referral";

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border bg-background p-3">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function ReferralStats() {
  const { t } = useTranslation();
  const { data, isLoading } = useReferralStats();

  const stats = data ?? { invited: 0, signedUp: 0, active: 0 };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatItem
        label={t("referrals.stats.invited", "Friends invited")}
        value={stats.invited}
      />
      <StatItem
        label={t("referrals.stats.signedUp", "Signed up")}
        value={stats.signedUp}
      />
      <StatItem
        label={t("referrals.stats.active", "Active")}
        value={stats.active}
      />
    </div>
  );
}

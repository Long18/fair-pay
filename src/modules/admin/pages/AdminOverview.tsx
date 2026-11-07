import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { useAdminStats } from "./admin-overview/hooks";
import { OverviewStatCards } from "./admin-overview/stat-cards";
import { OverviewTrendsCard } from "./admin-overview/trends-card";
import { OverviewRecentActivityCard } from "./admin-overview/recent-activity-card";
import { MotionPageShell, ScrollReveal } from "@/lib/motion";

export function AdminOverview() {
  const { tAdmin, locale } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const showAdminOnlyWidgets = !isModerator;
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  return (
    <MotionPageShell loading={statsLoading} className="space-y-4">
      <AdminPageHeader
        title={tAdmin("overview.title")}
        description={tAdmin("overview.subtitle")}
      />

      <ScrollReveal direction="up">
        <OverviewStatCards stats={stats} loading={statsLoading} />

        {showAdminOnlyWidgets && (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <OverviewTrendsCard locale={locale} />
            <OverviewRecentActivityCard enabled={showAdminOnlyWidgets} />
          </div>
        )}
      </ScrollReveal>
    </MotionPageShell>
  );
}

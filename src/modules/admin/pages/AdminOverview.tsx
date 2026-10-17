import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { useAdminStats } from "./admin-overview/hooks";
import { OverviewStatCards } from "./admin-overview/stat-cards";
import { OverviewTrendsCard } from "./admin-overview/trends-card";
import { OverviewRecentActivityCard } from "./admin-overview/recent-activity-card";

export function AdminOverview() {
  const { tAdmin, locale } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const showAdminOnlyWidgets = !isModerator;
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={tAdmin("overview.title")}
        description={tAdmin("overview.subtitle")}
      />

      <OverviewStatCards stats={stats} loading={statsLoading} />

      {showAdminOnlyWidgets && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <OverviewTrendsCard locale={locale} />
          <OverviewRecentActivityCard enabled={showAdminOnlyWidgets} />
        </div>
      )}
    </div>
  );
}

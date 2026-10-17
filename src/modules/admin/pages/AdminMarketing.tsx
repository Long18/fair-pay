import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { GrowthTab } from "./admin-marketing/growth-tab";
import { RetentionTab } from "./admin-marketing/retention-tab";
import { EmailsTab } from "./admin-marketing/emails-tab";
import { ExperimentsTab } from "./admin-marketing/experiments-tab";

const MARKETING_TABS = ["growth", "retention", "emails", "experiments"] as const;

export function AdminMarketing() {
  const { tAdmin, locale } = useAdminTranslation();
  const { canViewGrowth } = useAdminAccess();
  const [activeTab, setActiveTab] = useAdminTabParam("growth", MARKETING_TABS);

  if (!canViewGrowth) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">{tAdmin("common.accessDenied")}</p>
      </div>
    );
  }

  return (
    <AdminTabs
      value={activeTab}
      onValueChange={setActiveTab}
      header={
        <AdminPageHeader
          title={tAdmin("marketing.title")}
          description={tAdmin("marketing.subtitle")}
        />
      }
      items={[
        { value: "growth", label: tAdmin("marketing.tabGrowth") },
        { value: "retention", label: tAdmin("marketing.tabRetention") },
        { value: "emails", label: tAdmin("marketing.tabEmails") },
        { value: "experiments", label: tAdmin("marketing.tabExperiments") },
      ]}
    >
      <AdminTabsContent value="growth">
        <GrowthTab enabled={canViewGrowth && activeTab === "growth"} locale={locale} />
      </AdminTabsContent>

      <AdminTabsContent value="retention">
        <RetentionTab enabled={canViewGrowth && activeTab === "retention"} />
      </AdminTabsContent>

      <AdminTabsContent value="emails">
        <EmailsTab enabled={canViewGrowth && activeTab === "emails"} />
      </AdminTabsContent>

      <AdminTabsContent value="experiments">
        <ExperimentsTab enabled={canViewGrowth && activeTab === "experiments"} />
      </AdminTabsContent>
    </AdminTabs>
  );
}

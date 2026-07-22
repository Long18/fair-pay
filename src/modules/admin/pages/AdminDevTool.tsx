import { useMemo } from "react";
import { AdminOgPreview } from "./AdminOgPreview";
import { AdminUtmDevTool } from "./AdminUtmDevTool";
import { AdminApiDocs } from "./AdminApiDocs";
import { AdminAuditLogs } from "./AdminAuditLogs";
import { AdminAgentOperations } from "./AdminAgentOperations";
import { AdminModeration } from "./AdminModeration";
import {
  BookOpenIcon,
  EyeIcon,
  MailIcon,
  PieChartIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent, type AdminTabItem } from "../components/AdminTabs";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { useAdminAccess } from "../hooks/use-admin-access";
import { useAdminTranslation } from "../i18n";
import { AdminEmailDevTools } from "./admin-devtool/email-dev-tools";

export function AdminDevTool() {
  const { tAdmin } = useAdminTranslation();
  const access = useAdminAccess();
  const isApiDocsEnabled = import.meta.env.VITE_ENABLE_ADMIN_API_DOCS === "true";

  const tabItems = useMemo<AdminTabItem[]>(
    () => [
      {
        value: "og-preview",
        label: tAdmin("devtool.tabs.ogPreview"),
        icon: EyeIcon,
        enabled: access.canUseDevtool,
      },
      {
        value: "email",
        label: tAdmin("devtool.debtTab"),
        icon: MailIcon,
        enabled: access.canUseDevtool,
      },
      {
        value: "utm",
        label: tAdmin("devtool.tabs.utm"),
        icon: PieChartIcon,
        enabled: access.canUseDevtool,
      },
      {
        value: "audit-logs",
        label: tAdmin("devtool.tabs.auditLogs"),
        icon: ScrollTextIcon,
        enabled: access.canViewAuditLogs,
      },
      {
        value: "agent-ops",
        label: tAdmin("devtool.tabs.agentOps"),
        icon: ZapIcon,
        enabled: access.canViewAuditLogs,
      },
      {
        value: "api-docs",
        label: tAdmin("devtool.tabs.apiDocs"),
        icon: BookOpenIcon,
        enabled: access.canUseDevtool && isApiDocsEnabled,
      },
      {
        value: "moderation",
        label: tAdmin("devtool.tabs.moderation"),
        icon: ShieldCheckIcon,
        enabled: access.canModerateContent,
      },
    ],
    [access, isApiDocsEnabled, tAdmin]
  );

  const validTabs = useMemo(
    () => tabItems.filter((item) => item.enabled !== false).map((item) => item.value),
    [tabItems]
  );
  const defaultTab = validTabs[0] ?? "moderation";
  const [activeTab, setActiveTab] = useAdminTabParam(defaultTab, validTabs);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("devtool.developerToolsTitle")}
        description={tAdmin("devtool.developerToolsSubtitle")}
      />
      <AdminTabs
        value={activeTab}
        onValueChange={setActiveTab}
        mobileAsSelect={false}
        items={tabItems}
      >
        {access.canUseDevtool ? (
          <AdminTabsContent value="og-preview">
            <AdminOgPreview embedded />
          </AdminTabsContent>
        ) : null}
        {access.canUseDevtool ? (
          <AdminTabsContent value="email">
            <AdminEmailDevTools embedded />
          </AdminTabsContent>
        ) : null}
        {access.canUseDevtool ? (
          <AdminTabsContent value="utm">
            <AdminUtmDevTool embedded />
          </AdminTabsContent>
        ) : null}
        {access.canViewAuditLogs ? (
          <AdminTabsContent value="audit-logs">
            <AdminAuditLogs embedded />
          </AdminTabsContent>
        ) : null}
        {access.canViewAuditLogs ? (
          <AdminTabsContent value="agent-ops">
            <AdminAgentOperations embedded />
          </AdminTabsContent>
        ) : null}
        {access.canUseDevtool && isApiDocsEnabled ? (
          <AdminTabsContent value="api-docs">
            <AdminApiDocs embedded />
          </AdminTabsContent>
        ) : null}
        {access.canModerateContent ? (
          <AdminTabsContent value="moderation">
            <AdminModeration embedded />
          </AdminTabsContent>
        ) : null}
      </AdminTabs>
    </div>
  );
}

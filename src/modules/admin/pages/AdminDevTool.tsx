import { AdminOgPreview } from "./AdminOgPreview";
import { AdminUtmDevTool } from "./AdminUtmDevTool";
import { AdminApiDocs } from "./AdminApiDocs";
import { AdminAuditLogs } from "./AdminAuditLogs";
import { AdminAgentOperations } from "./AdminAgentOperations";
import {
  BookOpenIcon,
  EyeIcon,
  MailIcon,
  PieChartIcon,
  ScrollTextIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { useAdminTranslation } from "../i18n";
import { AdminEmailDevTools } from "./admin-devtool/email-dev-tools";

export function AdminDevTool() {
  const { tAdmin } = useAdminTranslation();
  const isApiDocsEnabled = import.meta.env.VITE_ENABLE_ADMIN_API_DOCS === "true";
  const validTabs = [
    "og-preview",
    "email",
    "utm",
    "audit-logs",
    "agent-ops",
    ...(isApiDocsEnabled ? ["api-docs"] : []),
  ] as const;
  const [activeTab, setActiveTab] = useAdminTabParam("og-preview", validTabs);

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
        listClassName={isApiDocsEnabled ? "sm:grid-cols-6" : "sm:grid-cols-5"}
        items={[
          {
            value: "og-preview",
            label: tAdmin("devtool.tabs.ogPreview"),
            icon: EyeIcon,
          },
          {
            value: "email",
            label: tAdmin("devtool.debtTab"),
            icon: MailIcon,
          },
          {
            value: "utm",
            label: tAdmin("devtool.tabs.utm"),
            icon: PieChartIcon,
          },
          {
            value: "audit-logs",
            label: tAdmin("devtool.tabs.auditLogs"),
            icon: ScrollTextIcon,
          },
          {
            value: "agent-ops",
            label: tAdmin("devtool.tabs.agentOps"),
            icon: ZapIcon,
          },
          {
            value: "api-docs",
            label: tAdmin("devtool.tabs.apiDocs"),
            icon: BookOpenIcon,
            enabled: isApiDocsEnabled,
          },
        ]}
      >
        <AdminTabsContent value="og-preview">
          <AdminOgPreview embedded />
        </AdminTabsContent>
        <AdminTabsContent value="email">
          <AdminEmailDevTools embedded />
        </AdminTabsContent>
        <AdminTabsContent value="utm">
          <AdminUtmDevTool embedded />
        </AdminTabsContent>
        <AdminTabsContent value="audit-logs">
          <AdminAuditLogs embedded />
        </AdminTabsContent>
        <AdminTabsContent value="agent-ops">
          <AdminAgentOperations embedded />
        </AdminTabsContent>
        {isApiDocsEnabled ? (
          <AdminTabsContent value="api-docs">
            <AdminApiDocs embedded />
          </AdminTabsContent>
        ) : null}
      </AdminTabs>
    </div>
  );
}

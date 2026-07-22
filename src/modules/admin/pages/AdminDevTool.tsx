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
import type { AdminCapabilities } from "../access";

function DevToolTabPanels({
  access,
  isApiDocsEnabled,
}: {
  access: AdminCapabilities;
  isApiDocsEnabled: boolean;
}) {
  return (
    <>
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
      {access.canModerateContent ? (
        <AdminTabsContent value="moderation">
          <AdminModeration embedded />
        </AdminTabsContent>
      ) : null}
      {access.canUseDevtool && isApiDocsEnabled ? (
        <AdminTabsContent value="api-docs">
          <AdminApiDocs embedded />
        </AdminTabsContent>
      ) : null}
    </>
  );
}

function renderSoleTab(
  tab: string,
  access: AdminCapabilities,
  isApiDocsEnabled: boolean,
) {
  switch (tab) {
    case "og-preview":
      return access.canUseDevtool ? <AdminOgPreview embedded /> : null;
    case "email":
      return access.canUseDevtool ? <AdminEmailDevTools embedded /> : null;
    case "utm":
      return access.canUseDevtool ? <AdminUtmDevTool embedded /> : null;
    case "audit-logs":
      return access.canViewAuditLogs ? <AdminAuditLogs embedded /> : null;
    case "agent-ops":
      return access.canViewAuditLogs ? <AdminAgentOperations embedded /> : null;
    case "moderation":
      return access.canModerateContent ? <AdminModeration embedded /> : null;
    case "api-docs":
      return access.canUseDevtool && isApiDocsEnabled ? <AdminApiDocs embedded /> : null;
    default:
      return null;
  }
}

export function AdminDevTool() {
  const { tAdmin } = useAdminTranslation();
  const access = useAdminAccess();
  const isApiDocsEnabled = import.meta.env.VITE_ENABLE_ADMIN_API_DOCS === "true";
  const isModerationOnly =
    access.canModerateContent && !access.canUseDevtool && !access.canViewAuditLogs;

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
        value: "moderation",
        label: tAdmin("devtool.tabs.moderation"),
        icon: ShieldCheckIcon,
        enabled: access.canModerateContent,
      },
      {
        value: "api-docs",
        label: tAdmin("devtool.tabs.apiDocs"),
        icon: BookOpenIcon,
        enabled: access.canUseDevtool && isApiDocsEnabled,
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
  const showTabs = validTabs.length > 1;
  const soleTab = validTabs.length === 1 ? validTabs[0] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          isModerationOnly
            ? tAdmin("moderation.title")
            : tAdmin("devtool.developerToolsTitle")
        }
        description={
          isModerationOnly
            ? tAdmin("moderation.description")
            : tAdmin("devtool.developerToolsSubtitle")
        }
      />
      {showTabs ? (
        <AdminTabs
          value={activeTab}
          onValueChange={setActiveTab}
          layout="scroll"
          items={tabItems}
        >
          <DevToolTabPanels access={access} isApiDocsEnabled={isApiDocsEnabled} />
        </AdminTabs>
      ) : (
        renderSoleTab(soleTab ?? defaultTab, access, isApiDocsEnabled)
      )}
    </div>
  );
}

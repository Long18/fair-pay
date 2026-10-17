import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
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

/** Per-tab URL state (e.g. the audit `entry` pane) that must not leak into other tabs */
const TAB_SCOPED_PARAMS = ["entry"] as const;

function renderTab(tab: string, access: AdminCapabilities, isApiDocsEnabled: boolean) {
  switch (tab) {
    case "audit-logs":
      return access.canViewAuditLogs ? <AdminAuditLogs embedded /> : null;
    case "agent-ops":
      return access.canViewAuditLogs ? <AdminAgentOperations embedded /> : null;
    case "moderation":
      return access.canModerateContent ? <AdminModeration embedded /> : null;
    case "email":
      return access.canUseDevtool ? <AdminEmailDevTools embedded /> : null;
    case "utm":
      return access.canUseDevtool ? <AdminUtmDevTool embedded /> : null;
    case "og-preview":
      return access.canUseDevtool ? <AdminOgPreview embedded /> : null;
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

  const tabItems = useMemo<AdminTabItem[]>(() => {
    const monitoring = tAdmin("layout.devtool.groupMonitoring");
    const tools = tAdmin("layout.devtool.groupTools");
    return [
      {
        value: "audit-logs",
        label: tAdmin("devtool.tabs.auditLogs"),
        icon: ScrollTextIcon,
        enabled: access.canViewAuditLogs,
        group: monitoring,
      },
      {
        value: "agent-ops",
        label: tAdmin("devtool.tabs.agentOps"),
        icon: ZapIcon,
        enabled: access.canViewAuditLogs,
        group: monitoring,
      },
      {
        value: "moderation",
        label: tAdmin("devtool.tabs.moderation"),
        icon: ShieldCheckIcon,
        enabled: access.canModerateContent,
        group: monitoring,
      },
      {
        value: "email",
        label: tAdmin("devtool.debtTab"),
        icon: MailIcon,
        enabled: access.canUseDevtool,
        group: tools,
      },
      {
        value: "utm",
        label: tAdmin("devtool.tabs.utm"),
        icon: PieChartIcon,
        enabled: access.canUseDevtool,
        group: tools,
      },
      {
        value: "og-preview",
        label: tAdmin("devtool.tabs.ogPreview"),
        icon: EyeIcon,
        enabled: access.canUseDevtool,
        group: tools,
      },
      {
        value: "api-docs",
        label: tAdmin("devtool.tabs.apiDocs"),
        icon: BookOpenIcon,
        enabled: access.canUseDevtool && isApiDocsEnabled,
        group: tools,
      },
    ];
  }, [access, isApiDocsEnabled, tAdmin]);

  const validTabs = useMemo(
    () => tabItems.filter((item) => item.enabled !== false).map((item) => item.value),
    [tabItems]
  );
  const defaultTab = validTabs[0] ?? "moderation";
  const [activeTab] = useAdminTabParam(defaultTab, validTabs);
  const [, setSearchParams] = useSearchParams();
  const setActiveTab = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const key of TAB_SCOPED_PARAMS) next.delete(key);
          next.set("tab", value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const showTabs = validTabs.length > 1;
  const soleTab = validTabs.length === 1 ? validTabs[0] : null;

  const header = (
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
  );

  if (!showTabs) {
    return (
      <div className="space-y-4">
        {header}
        {renderTab(soleTab ?? defaultTab, access, isApiDocsEnabled)}
      </div>
    );
  }

  return (
    <AdminTabs
      value={activeTab}
      onValueChange={setActiveTab}
      layout="rail"
      header={header}
      items={tabItems}
    >
      {validTabs.map((tab) => (
        <AdminTabsContent key={tab} value={tab}>
          {renderTab(tab, access, isApiDocsEnabled)}
        </AdminTabsContent>
      ))}
    </AdminTabs>
  );
}

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminTranslation } from "../../i18n";
import { formatDate } from "@/lib/locale-utils";
import type { AuditLogEntry } from "../../types";
import { ActionBadge } from "./action-badge";
import { countAuditChangeSections } from "./audit-change-count";
import { DiffView } from "./diff-view";
import { enrichAuditEntityMaps, useAuditEntities, type AuditEntityHints } from "./use-audit-entities";
import {
  AuditExpenseChip,
  AuditGroupChip,
  AuditResolvedValue,
  AuditUserChip,
} from "./audit-entity-display";
import { AuditRawPayloadToggle } from "./audit-raw-payload";
import { AuditEntityPreviewRoot } from "./audit-entity-preview";
import { AuditDetailSection, AuditLabelValueRow } from "./audit-detail-layout";
import { isSettlementAuditPayload } from "./audit-settlement-payload";

function useActorLine(entry: AuditLogEntry) {
  const { tAdmin } = useAdminTranslation();
  return entry.actor_name || entry.actor_email || tAdmin("common.system");
}

/** Title row for the audit detail pane / dialog: action badge + table name. */
export function AuditDetailTitle({ entry }: { entry: AuditLogEntry }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ActionBadge action={entry.action_type} />
      <span className="truncate">{entry.table_name ?? entry.entity_type ?? "—"}</span>
    </span>
  );
}

/** One-line meta under the title: time · actor · source. */
export function AuditDetailMeta({ entry }: { entry: AuditLogEntry }) {
  const { tAdmin } = useAdminTranslation();
  const actorLine = useActorLine(entry);
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
      <span className="tabular-nums">{formatDate(entry.timestamp)}</span>
      <span aria-hidden>·</span>
      <span className="inline-flex min-w-0 items-center gap-1">
        <UserAvatar
          size="xs"
          user={{ full_name: actorLine, avatar_url: entry.actor_avatar_url ?? null }}
        />
        <span className="truncate">{actorLine}</span>
      </span>
      <span aria-hidden>·</span>
      <Badge variant="outline" className="h-5 text-[10px] font-normal">
        {entry.source === "audit_logs" ? tAdmin("auditLogs.dataChanges") : tAdmin("layout.devtool.settlement")}
      </Badge>
    </span>
  );
}

export function AuditDetailBody({
  entry,
  entityHints,
}: {
  entry: AuditLogEntry;
  /** DEV preview or extra labels when DB rows are missing */
  entityHints?: AuditEntityHints | null;
}) {
  const { tAdmin } = useAdminTranslation();
  const actorLine = useActorLine(entry);

  const changedFieldCount = useMemo(
    () => countAuditChangeSections(entry.old_data, entry.new_data),
    [entry]
  );

  const { entities: fetchedEntities, isLoadingEntities } = useAuditEntities({
    enabled: true,
    oldData: entry.old_data ?? null,
    newData: entry.new_data ?? null,
    metadata: entry.metadata ?? null,
    tableName: entry.table_name,
    entityId: entry.entity_id,
  });

  const entities = useMemo(() => {
    const userHints = [...(entityHints?.users ?? [])];
    if (entry.actor_id && (entry.actor_name || entry.actor_avatar_url)) {
      userHints.push({
        id: entry.actor_id,
        full_name: entry.actor_name,
        avatar_url: entry.actor_avatar_url,
      });
    }
    return enrichAuditEntityMaps(fetchedEntities, {
      ...entityHints,
      users: userHints.length > 0 ? userHints : undefined,
    });
  }, [fetchedEntities, entry.actor_id, entry.actor_name, entry.actor_avatar_url, entityHints]);

  const hasOldNewData = entry.old_data || entry.new_data;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;
  const isSettlement = isSettlementAuditPayload(entry.old_data, entry.new_data);

  const currency =
    (entry.new_data?.currency as string | undefined) ??
    (entry.old_data?.currency as string | undefined);

  const resolvedEntityId = (() => {
    const table = entry.table_name?.toLowerCase();
    const id = entry.entity_id;
    if (!id) return <span>—</span>;
    if (table === "groups") return <AuditGroupChip groupId={id} groups={entities.groups} />;
    if (table === "expenses") {
      return (
        <AuditExpenseChip expenseId={id} expenses={entities.expenses} groups={entities.groups} />
      );
    }
    if (table === "profiles") return <AuditUserChip userId={id} users={entities.users} />;
    return <span className="font-mono text-xs">{id}</span>;
  })();

  const diff = (
    <DiffView
      oldData={entry.old_data}
      newData={entry.new_data}
      entities={entities}
      isLoadingEntities={isLoadingEntities}
      actorId={entry.actor_id}
    />
  );

  return (
    <AuditEntityPreviewRoot>
      {isSettlement && hasOldNewData ? (
        diff
      ) : (
        <Tabs
          key={entry.id}
          defaultValue={hasOldNewData ? "changes" : "overview"}
          className="flex flex-col gap-3"
        >
          <TabsList className="h-8 w-full shrink-0 justify-start">
            <TabsTrigger value="overview" className="text-xs">
              {tAdmin("auditLogs.tabOverview")}
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5 text-xs">
              {tAdmin("auditLogs.tabChanges")}
              {changedFieldCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {changedFieldCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-3">
            <AuditDetailSection title={tAdmin("auditLogs.sectionRecord")}>
              <div className="space-y-3">
                <AuditLabelValueRow label={tAdmin("auditLogs.actor")}>
                  {entry.actor_id ? (
                    <AuditUserChip userId={entry.actor_id} users={entities.users} layout="row" />
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
                      <UserAvatar
                        size="sm"
                        user={{ full_name: actorLine, avatar_url: entry.actor_avatar_url ?? null }}
                      />
                      <span className="text-sm font-medium">{actorLine}</span>
                    </div>
                  )}
                </AuditLabelValueRow>
                <AuditLabelValueRow label={tAdmin("auditLogs.tableEntity")}>
                  <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    {entry.table_name ?? entry.entity_type ?? "—"}
                  </code>
                </AuditLabelValueRow>
                <AuditLabelValueRow label={tAdmin("auditLogs.entityId")}>
                  <div className="min-w-0">{resolvedEntityId}</div>
                </AuditLabelValueRow>
                <AuditLabelValueRow label={tAdmin("layout.devtool.auditId")}>
                  <span className="break-all font-mono text-xs text-muted-foreground">{entry.id}</span>
                </AuditLabelValueRow>
              </div>
            </AuditDetailSection>
            {hasMetadata && entry.metadata && (
              <AuditDetailSection title={tAdmin("auditLogs.metadataTitle")}>
                <div className="space-y-3">
                  {Object.entries(entry.metadata).map(([key, val]) => (
                    <AuditLabelValueRow key={key} label={key}>
                      <AuditResolvedValue
                        fieldKey={key}
                        value={val}
                        entities={entities}
                        currency={currency}
                      />
                    </AuditLabelValueRow>
                  ))}
                </div>
                <div className="mt-3 border-t pt-2">
                  <AuditRawPayloadToggle data={entry.metadata} />
                </div>
              </AuditDetailSection>
            )}
          </TabsContent>

          <TabsContent value="changes" className="mt-0">
            {hasOldNewData ? (
              diff
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tAdmin("auditLogs.noDetailData")}
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AuditEntityPreviewRoot>
  );
}

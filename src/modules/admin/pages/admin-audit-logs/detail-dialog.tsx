import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  AuditDetailSection,
  AuditLabelValueRow,
} from "./audit-detail-layout";
import { isSettlementAuditPayload } from "./audit-settlement-payload";

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
  entityHints,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** DEV preview or extra labels when DB rows are missing */
  entityHints?: AuditEntityHints | null;
}) {
  const { tAdmin } = useAdminTranslation();

  const changedFieldCount = useMemo(() => {
    if (!entry) return 0;
    return countAuditChangeSections(entry.old_data, entry.new_data);
  }, [entry]);

  const { entities: fetchedEntities, isLoadingEntities } = useAuditEntities({
    enabled: open && Boolean(entry),
    oldData: entry?.old_data ?? null,
    newData: entry?.new_data ?? null,
    metadata: entry?.metadata ?? null,
    tableName: entry?.table_name,
    entityId: entry?.entity_id,
  });

  const entities = useMemo(() => {
    const userHints = [...(entityHints?.users ?? [])];
    if (entry?.actor_id && (entry.actor_name || entry.actor_avatar_url)) {
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
  }, [fetchedEntities, entry?.actor_id, entry?.actor_name, entry?.actor_avatar_url, entityHints]);

  if (!entry) return null;

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

  const actorLine = entry.actor_name || entry.actor_email || tAdmin("common.system");

  return (
    <AuditEntityPreviewRoot>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92vh,52rem)] w-[min(100vw-1.5rem,42rem)] flex-col gap-4 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-2 pr-8">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
              <ActionBadge action={entry.action_type} />
              <span className="break-words">{entry.table_name ?? entry.entity_type ?? "—"}</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-sm text-muted-foreground">
                <span>{formatDate(entry.timestamp)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <UserAvatar
                    size="xs"
                    user={{
                      full_name: actorLine,
                      avatar_url: entry.actor_avatar_url ?? null,
                    }}
                  />
                  {actorLine}
                </span>
                <span aria-hidden>·</span>
                <Badge variant="outline" className="text-[10px] font-normal h-5">
                  {entry.source === "audit_logs" ? tAdmin("auditLogs.dataChanges") : "Settlement"}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-1 px-1">
            {isSettlement && hasOldNewData ? (
              <DiffView
                oldData={entry.old_data}
                newData={entry.new_data}
                entities={entities}
                isLoadingEntities={isLoadingEntities}
                actorId={entry.actor_id}
              />
            ) : (
              <Tabs
                key={entry.id}
                defaultValue={hasOldNewData ? "changes" : "overview"}
                className="flex flex-col gap-4"
              >
                <TabsList className="w-full justify-start shrink-0 h-9">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">
                    {tAdmin("auditLogs.tabOverview")}
                  </TabsTrigger>
                  <TabsTrigger value="changes" className="gap-1.5 text-xs sm:text-sm">
                    {tAdmin("auditLogs.tabChanges")}
                    {changedFieldCount > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {changedFieldCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 space-y-4">
                  <AuditDetailSection title={tAdmin("auditLogs.sectionRecord")}>
                    <div className="space-y-4">
                      <AuditLabelValueRow label={tAdmin("auditLogs.actor")}>
                        {entry.actor_id ? (
                          <AuditUserChip userId={entry.actor_id} users={entities.users} layout="row" />
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2.5">
                            <UserAvatar
                              size="sm"
                              user={{
                                full_name: actorLine,
                                avatar_url: entry.actor_avatar_url ?? null,
                              }}
                            />
                            <span className="text-sm font-medium">{actorLine}</span>
                          </div>
                        )}
                      </AuditLabelValueRow>
                      <AuditLabelValueRow label={tAdmin("auditLogs.tableEntity")}>
                        <code className="font-mono text-xs bg-muted rounded-md px-2 py-1">
                          {entry.table_name ?? entry.entity_type ?? "—"}
                        </code>
                      </AuditLabelValueRow>
                      <AuditLabelValueRow label={tAdmin("auditLogs.entityId")}>
                        <div className="min-w-0">{resolvedEntityId}</div>
                      </AuditLabelValueRow>
                      <AuditLabelValueRow label="Audit ID">
                        <span className="font-mono text-xs text-muted-foreground break-all">{entry.id}</span>
                      </AuditLabelValueRow>
                    </div>
                  </AuditDetailSection>
                  {hasMetadata && entry.metadata && (
                    <AuditDetailSection title={tAdmin("auditLogs.metadataTitle")}>
                      <div className="space-y-4">
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
                      <div className="mt-4 pt-2 border-t">
                        <AuditRawPayloadToggle data={entry.metadata} />
                      </div>
                    </AuditDetailSection>
                  )}
                </TabsContent>

                <TabsContent value="changes" className="mt-0">
                  {hasOldNewData ? (
                    <DiffView
                      oldData={entry.old_data}
                      newData={entry.new_data}
                      entities={entities}
                      isLoadingEntities={isLoadingEntities}
                      actorId={entry.actor_id}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {tAdmin("auditLogs.noDetailData")}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AuditEntityPreviewRoot>
  );
}

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminTranslation } from "../../i18n";
import { formatDate } from "@/lib/locale-utils";
import type { AuditLogEntry } from "../../types";
import { ActionBadge } from "./action-badge";
import { DiffView } from "./diff-view";

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
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  // Count changed fields for the tab badge
  const changedFieldCount = useMemo(() => {
    if (!entry || (!entry.old_data && !entry.new_data)) return 0;
    const allKeys = new Set([
      ...Object.keys(entry.old_data ?? {}),
      ...Object.keys(entry.new_data ?? {}),
    ]);
    let count = 0;
    for (const key of allKeys) {
      if (JSON.stringify(entry.old_data?.[key]) !== JSON.stringify(entry.new_data?.[key])) count++;
    }
    return count;
  }, [entry]);

  if (!entry) return null;

  const hasOldNewData = entry.old_data || entry.new_data;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionBadge action={entry.action_type} />
            <span>{entry.table_name ?? entry.entity_type ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(entry.timestamp)} · {entry.actor_name || entry.actor_email || tAdmin("common.system")} · {tAdmin("auditLogs.sourceLabel")}: {entry.source}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5">
              Changes
              {changedFieldCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{changedFieldCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-3">
            <TabsContent value="overview" className="mt-0 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label={tAdmin("auditLogs.actor")}
                  value={
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        size="sm"
                        user={{
                          full_name: entry.actor_name || entry.actor_email || "?",
                          avatar_url: entry.actor_avatar_url ?? null,
                        }}
                      />
                      <span>{entry.actor_name || entry.actor_email || tAdmin("common.system")}</span>
                    </div>
                  }
                />
                <DetailItem label={tAdmin("common.email")} value={entry.actor_email || "—"} />
                <DetailItem label={tAdmin("auditLogs.actionType")} value={<ActionBadge action={entry.action_type} />} />
                <DetailItem label={tAdmin("auditLogs.tableEntity")} value={
                  <code className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{entry.table_name ?? entry.entity_type ?? "—"}</code>
                } />
                <DetailItem label={tAdmin("auditLogs.entityId")} value={<span className="font-mono text-xs">{entry.entity_id || "—"}</span>} />
                <DetailItem label="Audit ID" value={<span className="font-mono text-xs">{entry.id}</span>} />
                <DetailItem label={tAdmin("auditLogs.timestamp")} value={formatDate(entry.timestamp)} />
                <DetailItem label={tAdmin("auditLogs.sourceLabel")} value={
                  <Badge variant="outline" className="text-xs">
                    {entry.source === "audit_logs" ? tAdmin("auditLogs.dataChanges") : "Settlement"}
                  </Badge>
                } />
              </div>
              {hasMetadata && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">Metadata</h4>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="changes" className="mt-0 pb-4">
              {hasOldNewData ? (
                <DiffView oldData={entry.old_data} newData={entry.new_data} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {tAdmin("auditLogs.noDetailData")}
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

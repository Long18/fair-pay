import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2Icon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { AuditResolvedValue } from "./audit-entity-display";
import { AuditRawPayloadToggle } from "./audit-raw-payload";
import type { AuditEntityMaps } from "./use-audit-entities";

export type CompactChange = {
  key: string;
  label: string;
  oldVal: unknown;
  newVal: unknown;
  type: "added" | "removed" | "changed" | "unchanged";
};

const TECHNICAL_KEYS = new Set([
  "currency",
  "settlement_id",
  "actor_id",
  "split_ids",
]);

export function shouldHideFieldInSettlementSummary(key: string): boolean {
  return TECHNICAL_KEYS.has(key) ||
    key === "total_amount" ||
    key === "splits_updated" ||
    key === "counterparty_ids" ||
    key === "group_ids" ||
    key === "splits";
}

export function AuditCompactChangeList({
  changes,
  showUnchanged,
  onShowUnchangedChange,
  entities,
  currency,
  isLoadingEntities,
  oldData,
  newData,
  hideKeys,
}: {
  changes: CompactChange[];
  showUnchanged: boolean;
  onShowUnchangedChange: (v: boolean) => void;
  entities: AuditEntityMaps;
  currency?: string;
  isLoadingEntities: boolean;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  hideKeys?: Set<string>;
}) {
  const { tAdmin } = useAdminTranslation();

  const visible = changes.filter((c) => {
    if (hideKeys?.has(c.key)) return false;
    if (!showUnchanged && c.type === "unchanged") return false;
    return true;
  });

  const typeLabel = (type: CompactChange["type"]) => {
    const map = {
      added: tAdmin("auditLogs.changeAdded"),
      removed: tAdmin("auditLogs.changeRemoved"),
      changed: tAdmin("auditLogs.changeUpdated"),
      unchanged: tAdmin("auditLogs.changeUnchanged"),
    };
    return map[type];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Switch
            id="audit-show-unchanged-compact"
            checked={showUnchanged}
            onCheckedChange={onShowUnchangedChange}
          />
          <Label htmlFor="audit-show-unchanged-compact" className="text-xs font-normal cursor-pointer">
            {tAdmin("auditLogs.showUnchanged")}
          </Label>
        </div>
        {isLoadingEntities ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {tAdmin("auditLogs.allFieldsUnchanged")}
        </p>
      ) : (
        <div className="rounded-xl border bg-card divide-y shadow-sm">
          {visible.map(({ key, label, oldVal, newVal, type }) => (
            <div
              key={key}
              className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)_auto] gap-2 sm:gap-4 items-start text-sm"
            >
              <span className="text-xs font-medium text-muted-foreground sm:pt-1">{label}</span>
              <div className="min-w-0 space-y-2">
                {type === "changed" ? (
                  <>
                    <div className="text-muted-foreground line-through opacity-80">
                      <AuditResolvedValue fieldKey={key} value={oldVal} entities={entities} currency={currency} compact />
                    </div>
                    <AuditResolvedValue fieldKey={key} value={newVal} entities={entities} currency={currency} compact />
                  </>
                ) : (
                  <AuditResolvedValue
                    fieldKey={key}
                    value={type === "removed" ? oldVal : newVal}
                    entities={entities}
                    currency={currency}
                    compact
                  />
                )}
              </div>
              {type !== "unchanged" ? (
                <Badge variant="outline" className="text-[9px] font-normal shrink-0 h-5 px-1.5">
                  {typeLabel(type)}
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <AuditRawPayloadToggle data={{ old_data: oldData, new_data: newData }} />
    </div>
  );
}

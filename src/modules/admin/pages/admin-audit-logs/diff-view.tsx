import { useMemo, useState } from "react";
import { useAdminTranslation } from "../../i18n";
import { AuditCompactChangeList, type CompactChange } from "./audit-compact-change-list";
import { AuditSettleChangesView } from "./audit-settle-changes-view";
import { isSettlementAuditPayload } from "./audit-settlement-payload";
import type { AuditEntityMaps } from "./use-audit-entities";

const FIELD_LABELS: Record<string, string> = {
  actor_id: "Actor",
  settlement_id: "Settlement",
  split_ids: "Splits",
  splits: "Split states (before)",
  splits_updated: "Splits updated",
  total_amount: "Total amount",
  counterparty_ids: "Counterparties",
  group_ids: "Groups",
  group_id: "Group",
  user_id: "Member",
  expense_id: "Expense",
  currency: "Currency",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ChangeType = "added" | "removed" | "changed" | "unchanged";

export function DiffView({
  oldData,
  newData,
  entities,
  isLoadingEntities,
  actorId,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  entities: AuditEntityMaps;
  isLoadingEntities: boolean;
  actorId?: string | null;
}) {
  const { tAdmin } = useAdminTranslation();
  const [showUnchanged, setShowUnchanged] = useState(false);

  const currency =
    (newData?.currency as string | undefined) ??
    (oldData?.currency as string | undefined);

  const changes = useMemo((): CompactChange[] => {
    if (!oldData && !newData) return [];

    const allKeys = new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData ?? {}),
    ]);

    const result: CompactChange[] = [];

    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      let type: ChangeType;
      if (oldVal === undefined) type = "added";
      else if (newVal === undefined) type = "removed";
      else if (oldStr !== newStr) type = "changed";
      else type = "unchanged";

      result.push({ key, label: fieldLabel(key), oldVal, newVal, type });
    }

    const order: Record<ChangeType, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);
    return result;
  }, [oldData, newData]);

  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {tAdmin("auditLogs.noDetailData")}
      </p>
    );
  }

  const settlement = isSettlementAuditPayload(oldData, newData);

  if (settlement) {
    return (
      <AuditSettleChangesView
        oldData={oldData}
        newData={newData}
        entities={entities}
        isLoadingEntities={isLoadingEntities}
        actorId={actorId}
      />
    );
  }

  return (
    <AuditCompactChangeList
      changes={changes}
      showUnchanged={showUnchanged}
      onShowUnchangedChange={setShowUnchanged}
      entities={entities}
      currency={currency}
      isLoadingEntities={isLoadingEntities}
      oldData={oldData}
      newData={newData}
    />
  );
}

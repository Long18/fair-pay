import type { AuditLogEntry } from "../../types";
import type { useAdminTranslation } from "../../i18n";
import { SETTLEMENT_SUMMARY_ACTIONS } from "./constants";

export function hasSettlementRevertPayload(entry: AuditLogEntry): boolean {
  const splits = entry.old_data?.splits;
  if (Array.isArray(splits) && splits.length > 0) return true;

  const priorStates = entry.metadata?.priorStates;
  if (Array.isArray(priorStates) && priorStates.length > 0) return true;

  const splitIds = entry.metadata?.splitIds ?? entry.new_data?.split_ids;
  return Array.isArray(splitIds) && splitIds.length > 0;
}

export function canRevertEntry(entry: AuditLogEntry): boolean {
  if (entry.source === "audit_logs") {
    if (entry.action_type === "SETTLE_SUMMARY" && hasSettlementRevertPayload(entry)) return true;
    if (entry.action_type === "DELETE" && entry.old_data) return true;
    if (entry.action_type === "UPDATE" && entry.old_data) return true;
    if (entry.action_type === "INSERT" && entry.entity_id) return true;
    return false;
  }

  // Settlement trail summaries (incl. legacy settle_all_* without SETTLE_SUMMARY)
  if (
    entry.source === "audit_trail" &&
    SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type) &&
    hasSettlementRevertPayload(entry)
  ) {
    return true;
  }

  return false;
}

export function exportToCsv(entries: AuditLogEntry[], tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]) {
  const headers = [
    tAdmin("auditLogs.timestamp"),
    tAdmin("auditLogs.actor"),
    tAdmin("common.email"),
    tAdmin("auditLogs.actionType"),
    tAdmin("auditLogs.tableEntity"),
    tAdmin("auditLogs.entityId"),
    tAdmin("auditLogs.sourceLabel"),
  ];
  const rows = entries.map((e) => [
    e.timestamp,
    e.actor_name || tAdmin("common.system"),
    e.actor_email || "",
    e.action_type,
    e.table_name ?? e.entity_type ?? "",
    e.entity_id,
    e.source,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}


export function getSettlementSummary(entry: AuditLogEntry): string | null {
  if (!SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type)) return null;

  const amount =
    (entry.new_data?.total_amount as number | undefined) ??
    (entry.metadata?.totalAmount as number | undefined);
  const currency =
    (entry.new_data?.currency as string | undefined) ??
    (entry.metadata?.currency as string | undefined) ??
    "";
  const splitCount =
    (entry.new_data?.splits_updated as number | undefined) ??
    (entry.metadata?.splitsUpdated as number | undefined) ??
    (Array.isArray(entry.new_data?.split_ids) ? entry.new_data.split_ids.length : undefined) ??
    (Array.isArray(entry.metadata?.splitIds) ? (entry.metadata.splitIds as unknown[]).length : undefined);

  const parts: string[] = ["Settle Up"];
  if (typeof amount === "number") {
    parts.push(currency ? `${amount} ${currency}` : String(amount));
  }
  if (typeof splitCount === "number") {
    parts.push(`${splitCount} split(s)`);
  }
  return parts.join(" · ");
}

export function getDetailSummary(entry: AuditLogEntry, tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]): string {
  const settlementSummary = getSettlementSummary(entry);
  if (settlementSummary) return settlementSummary;

  if (entry.old_data || entry.new_data) {
    const data = entry.new_data ?? entry.old_data ?? {};
    const keys = Object.keys(data);
    if (keys.length === 0) return `Record ${entry.entity_id?.slice(0, 8) ?? "—"}`;

    // For UPDATE, show changed fields
    if (entry.action_type === "UPDATE" && entry.old_data && entry.new_data) {
      const changed = keys.filter(
        (k) => JSON.stringify(entry.old_data?.[k]) !== JSON.stringify(entry.new_data?.[k])
      );
      if (changed.length > 0) {
        return tAdmin("auditLogs.changedFields", {
          fields: `${changed.slice(0, 3).join(", ")}${changed.length > 3 ? "..." : ""}`,
        });
      }
    }

    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}`;
  }
  if (entry.metadata) {
    const keys = Object.keys(entry.metadata);
    if (keys.length === 0) return `Entity ${entry.entity_id?.slice(0, 8) ?? "—"}`;
    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}`;
  }
  return entry.entity_id?.slice(0, 8) || "—";
}

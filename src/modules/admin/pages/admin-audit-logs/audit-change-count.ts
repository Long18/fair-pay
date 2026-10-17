import { isSettlementAuditPayload } from "./audit-settlement-payload";

export function countAuditChangeSections(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): number {
  if (isSettlementAuditPayload(oldData, newData)) return 1;
  if (!oldData && !newData) return 0;
  const allKeys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  let count = 0;
  for (const key of allKeys) {
    if (JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key])) count++;
  }
  return count;
}

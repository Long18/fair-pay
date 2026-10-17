export function isSettlementAuditPayload(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): boolean {
  if (!newData) return false;
  const hasSummary =
    typeof newData.total_amount === "number" ||
    typeof newData.splits_updated === "number" ||
    Array.isArray(newData.split_ids);
  const hasPrior = Array.isArray(oldData?.splits);
  return hasSummary && (hasPrior || Array.isArray(newData.split_ids));
}

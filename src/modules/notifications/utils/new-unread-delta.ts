export type UnreadDeltaResult =
  | { kind: "initial"; newIds: readonly string[] }
  | { kind: "delta"; newIds: readonly string[] };

/** Compare unread ID sets; skip the first snapshot (no toast on page load). */
export function diffNewUnreadIds(
  knownIds: Set<string> | null,
  unreadIds: readonly string[]
): UnreadDeltaResult {
  if (knownIds === null) {
    return { kind: "initial", newIds: [] };
  }
  const newIds = unreadIds.filter((id) => !knownIds.has(id));
  return { kind: "delta", newIds };
}

export function pickNotificationsForToast<T extends { id: string; created_at: string }>(
  notifications: readonly T[],
  ids: readonly string[]
): T[] {
  if (ids.length === 0) return [];
  const idSet = new Set(ids);
  return [...notifications]
    .filter((n) => idSet.has(n.id))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}


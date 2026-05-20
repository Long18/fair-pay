import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/settings/use-persisted-state";

export type RecentContext = {
  id: string;
  type: "group" | "friend";
  name: string;
  avatarUrl?: string;
  timestamp: number;
};

const MAX_STORED = 10;

export function useRecentExpenseContexts(userId: string | undefined) {
  const key = `fairpay_recent_expense_contexts_v1_${userId ?? "anon"}`;
  const [allRecents, setAllRecents] = usePersistedState<RecentContext[]>(
    key,
    []
  );

  const recentGroups = useMemo(
    () =>
      allRecents
        .filter((r) => r.type === "group")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3),
    [allRecents]
  );

  const recentFriends = useMemo(
    () =>
      allRecents
        .filter((r) => r.type === "friend")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3),
    [allRecents]
  );

  const addRecent = useCallback(
    (ctx: Omit<RecentContext, "timestamp">) => {
      setAllRecents((prev) => {
        const deduped = prev.filter(
          (r) => !(r.id === ctx.id && r.type === ctx.type)
        );
        const updated = [{ ...ctx, timestamp: Date.now() }, ...deduped];
        const groups = updated
          .filter((r) => r.type === "group")
          .slice(0, MAX_STORED);
        const friends = updated
          .filter((r) => r.type === "friend")
          .slice(0, MAX_STORED);
        return [...groups, ...friends];
      });
    },
    [setAllRecents]
  );

  return { recentGroups, recentFriends, addRecent };
}

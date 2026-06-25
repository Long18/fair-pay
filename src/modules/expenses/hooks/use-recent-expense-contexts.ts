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
const MAX_RECENT = 3;

export function useRecentExpenseContexts(userId: string | undefined) {
  const key = `fairpay_recent_expense_contexts_v1_${userId ?? "anon"}`;
  const [allRecents, setAllRecents] = usePersistedState<RecentContext[]>(
    key,
    []
  );

  // Unified recent list: sorted by timestamp across both types, top 3
  const recentAll = useMemo(
    () =>
      [...allRecents]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_RECENT),
    [allRecents]
  );

  const addRecent = useCallback(
    (ctx: Omit<RecentContext, "timestamp">) => {
      setAllRecents((prev) => {
        const deduped = prev.filter(
          (r) => !(r.id === ctx.id && r.type === ctx.type)
        );
        const updated = [{ ...ctx, timestamp: Date.now() }, ...deduped];
        return updated.slice(0, MAX_STORED * 2);
      });
    },
    [setAllRecents]
  );

  return { recentAll, addRecent };
}

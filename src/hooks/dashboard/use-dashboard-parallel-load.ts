import { useEffect, useRef, useState } from "react";
import {
  scheduleBackgroundTask,
  shouldDeferHeavyDashboardPrefetch,
} from "@/lib/idle-schedule";

type ParallelLoadOptions = {
  userId: string | undefined;
  /** Skip pond-hero chunk on phone (GPU). */
  isMobile: boolean;
};

/**
 * Warm dashboard JS chunks in parallel after auth — does not block paint.
 * Phase 1: chunk imports. Phase 2 (idle): flip `historyPrefetchReady` for History RPCs.
 */
export function useDashboardParallelLoad({ userId, isMobile }: ParallelLoadOptions) {
  const warmedChunksForUserRef = useRef<string | null>(null);
  const [historyWarmUserId, setHistoryWarmUserId] = useState<string | null>(null);
  const historyPrefetchReady = Boolean(userId && historyWarmUserId === userId);
  const deferHeavy = shouldDeferHeavyDashboardPrefetch();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    if (warmedChunksForUserRef.current !== userId) {
      warmedChunksForUserRef.current = userId;

      const chunks: Promise<unknown>[] = [
        import("@/components/dashboard/activity/enhanced-activity"),
        import("@/components/dashboard/activity/history-ledger-list"),
        import("@/components/dashboard/activity/SettledHistoryList"),
      ];

      if (!isMobile) {
        chunks.push(import("@/components/pond-hero"));
      }

      const runChunks = () => {
        if (!cancelled) void Promise.allSettled(chunks);
      };
      scheduleBackgroundTask(runChunks, 2_500);
    }

    if (deferHeavy) {
      return;
    }

    const runHistory = () => {
      if (!cancelled) setHistoryWarmUserId(userId);
    };
    const cancelHistory = scheduleBackgroundTask(runHistory, 4_000);

    return () => {
      cancelled = true;
      cancelHistory?.();
    };
  }, [userId, isMobile, deferHeavy]);

  return { historyPrefetchReady, deferHeavyPrefetch: deferHeavy };
}

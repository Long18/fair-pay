type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * Skip idle History prefetch / heavy warmups on Save-Data or very slow links
 * (same signal as {@link useSpeculationRules}).
 */
export function shouldDeferHeavyDashboardPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) return true;

  const type = connection?.effectiveType;
  return type === "slow-2g" || type === "2g";
}

/**
 * Run work after first paint without blocking the critical path.
 * Prefer Scheduler.postTask(background), then requestIdleCallback, then timeout.
 */
export function scheduleBackgroundTask(
  run: () => void,
  idleTimeoutMs: number,
): (() => void) | void {
  const scheduler = (
    globalThis as { scheduler?: { postTask: (cb: () => void, opts?: { priority?: string }) => void } }
  ).scheduler;

  if (scheduler?.postTask) {
    scheduler.postTask(run, { priority: "background" });
    return;
  }

  if (typeof requestIdleCallback !== "undefined") {
    const idleId = requestIdleCallback(run, { timeout: idleTimeoutMs });
    return () => cancelIdleCallback(idleId);
  }

  const t = window.setTimeout(run, 400);
  return () => window.clearTimeout(t);
}

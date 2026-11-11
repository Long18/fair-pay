import { afterEach, describe, expect, it, vi } from "vitest";
import {
  scheduleBackgroundTask,
  shouldDeferHeavyDashboardPrefetch,
} from "@/lib/idle-schedule";

describe("shouldDeferHeavyDashboardPrefetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when Save-Data is on", () => {
    vi.stubGlobal("navigator", {
      connection: { saveData: true, effectiveType: "4g" },
    });
    expect(shouldDeferHeavyDashboardPrefetch()).toBe(true);
  });

  it("returns true on slow-2g", () => {
    vi.stubGlobal("navigator", {
      connection: { saveData: false, effectiveType: "slow-2g" },
    });
    expect(shouldDeferHeavyDashboardPrefetch()).toBe(true);
  });

  it("returns false on typical 4g", () => {
    vi.stubGlobal("navigator", {
      connection: { saveData: false, effectiveType: "4g" },
    });
    expect(shouldDeferHeavyDashboardPrefetch()).toBe(false);
  });
});

describe("scheduleBackgroundTask", () => {
  it("falls back to setTimeout when idle APIs are missing", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    scheduleBackgroundTask(run, 1_000);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(run).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

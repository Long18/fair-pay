import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createChunkBatcher, createLoadingStatusThrottle } from "../ui-throttle";

describe("createLoadingStatusThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid calls", () => {
    const emit = vi.fn();
    const schedule = createLoadingStatusThrottle(emit, 200);

    schedule();
    schedule();
    schedule();

    expect(emit).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});

describe("createChunkBatcher", () => {
  it("merges deltas before flush", () => {
    const onFlush = vi.fn();
    const batcher = createChunkBatcher(onFlush);

    batcher.push("a");
    batcher.push("b");
    batcher.flush();

    expect(onFlush).toHaveBeenCalledWith("ab");
    batcher.dispose();
  });
});

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  messageMock: vi.fn(),
  dismissMock: vi.fn(),
  useRegisterSWMock: vi.fn(),
  currentBuildInfoMock: {
    version: "1.0.0-26031301",
    baseVersion: "1.0.0",
    dateCode: "260313",
    sequence: 1,
    channel: "production" as const,
    builtAt: "2026-03-13T09:15:00+07:00",
    deploymentId: "dpl_current",
    commitSha: "abcdef1",
  },
}));

vi.mock("sonner", () => ({
  toast: {
    message: hoisted.messageMock,
    dismiss: hoisted.dismissMock,
  },
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (...args: unknown[]) => hoisted.useRegisterSWMock(...args),
}));

vi.mock("@/lib/build-info", () => ({
  currentBuildInfo: hoisted.currentBuildInfoMock,
  coerceBuildInfo: (value: unknown) => value,
  isNewBuildAvailable: (
    remoteBuildInfo: { version: string },
    currentBuildInfoArg = hoisted.currentBuildInfoMock
  ) => remoteBuildInfo.version !== currentBuildInfoArg.version,
}));

import {
  BuildVersionMonitor,
  refreshToLatestBuild,
} from "@/components/system/build-version-monitor";

describe("BuildVersionMonitor", () => {
  const fetchMock = vi.fn();
  const updateServiceWorkerMock = vi.fn().mockResolvedValue(undefined);
  const registrationUpdateMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mockServiceWorkerState(needRefresh = false) {
    hoisted.useRegisterSWMock.mockImplementation((options?: {
      onRegisteredSW?: (
        swScriptUrl: string,
        registration: ServiceWorkerRegistration | undefined
      ) => void;
    }) => {
      options?.onRegisteredSW?.("/sw.js", {
        update: registrationUpdateMock,
      } as ServiceWorkerRegistration);

      return {
        needRefresh: [needRefresh, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: updateServiceWorkerMock,
      };
    });
  }

  it("does not prompt when the fetched version matches the current version", async () => {
    mockServiceWorkerState(false);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => hoisted.currentBuildInfoMock,
    });

    render(<BuildVersionMonitor />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(hoisted.messageMock).not.toHaveBeenCalled();
  });

  it("prompts once when a newer version is detected", async () => {
    vi.useFakeTimers();
    mockServiceWorkerState(false);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...hoisted.currentBuildInfoMock,
        version: "1.0.0-26031302",
        sequence: 2,
        deploymentId: "dpl_next",
      }),
    });

    render(<BuildVersionMonitor />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(hoisted.messageMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });

    expect(hoisted.messageMock).toHaveBeenCalledTimes(1);
  });

  it("prompts once when the service worker reports a waiting update", async () => {
    mockServiceWorkerState(true);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => hoisted.currentBuildInfoMock,
    });

    render(<BuildVersionMonitor />);

    await waitFor(() => {
      expect(hoisted.messageMock).toHaveBeenCalledTimes(1);
    });
  });

  it("fails silently when version fetch errors", async () => {
    mockServiceWorkerState(false);
    fetchMock.mockRejectedValue(new Error("network down"));

    render(<BuildVersionMonitor />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(hoisted.messageMock).not.toHaveBeenCalled();
  });

  it("uses updateServiceWorker when a waiting service worker exists", async () => {
    const reloadMock = vi.fn();

    await refreshToLatestBuild({
      hasWaitingServiceWorker: true,
      updateServiceWorker: updateServiceWorkerMock,
      reload: reloadMock,
    });

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("clears caches and reloads when no waiting service worker exists", async () => {
    const reloadMock = vi.fn();
    const clearCachesMock = vi.fn().mockResolvedValue(undefined);
    const unregisterServiceWorkersMock = vi.fn().mockResolvedValue(undefined);

    await refreshToLatestBuild({
      hasWaitingServiceWorker: false,
      updateServiceWorker: updateServiceWorkerMock,
      clearCaches: clearCachesMock,
      unregisterServiceWorkers: unregisterServiceWorkersMock,
      reload: reloadMock,
    });

    expect(updateServiceWorkerMock).not.toHaveBeenCalled();
    expect(unregisterServiceWorkersMock).toHaveBeenCalledTimes(1);
    expect(clearCachesMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("still reloads when clearing caches fails", async () => {
    const reloadMock = vi.fn();

    await refreshToLatestBuild({
      hasWaitingServiceWorker: false,
      updateServiceWorker: updateServiceWorkerMock,
      clearCaches: vi.fn().mockRejectedValue(new Error("cache error")),
      unregisterServiceWorkers: vi.fn().mockResolvedValue(undefined),
      reload: reloadMock,
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

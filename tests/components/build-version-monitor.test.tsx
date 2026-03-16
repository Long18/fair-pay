import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  messageMock: vi.fn(),
  dismissMock: vi.fn(),
  useRegisterSWMock: vi.fn(),
  currentBuildInfoMock: {
    version: "1.0.1-26031301",
    baseVersion: "1.0.1",
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

  function mockServiceWorkerState() {
    hoisted.useRegisterSWMock.mockImplementation((options?: {
      onRegisteredSW?: (
        swScriptUrl: string,
        registration: ServiceWorkerRegistration | undefined
      ) => void;
    }) => {
      options?.onRegisteredSW?.("/sw.js", {} as ServiceWorkerRegistration);

      return {};
    });
  }

  it("does not prompt when the fetched version matches the current version", async () => {
    mockServiceWorkerState();
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
    mockServiceWorkerState();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...hoisted.currentBuildInfoMock,
        version: "1.0.1-26031302",
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

  it("fails silently when version fetch errors", async () => {
    mockServiceWorkerState();
    fetchMock.mockRejectedValue(new Error("network down"));

    render(<BuildVersionMonitor />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(hoisted.messageMock).not.toHaveBeenCalled();
  });

  it("unregisters service workers and clears caches on refresh", async () => {
    const unregisterMock = vi.fn().mockResolvedValue(true);
    const getRegistrationsMock = vi.fn().mockResolvedValue([
      { unregister: unregisterMock },
    ]);
    const deleteCacheMock = vi.fn().mockResolvedValue(true);
    const cacheKeysMock = vi.fn().mockResolvedValue(["cache-v1"]);

    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations: getRegistrationsMock },
    });
    vi.stubGlobal("caches", {
      keys: cacheKeysMock,
      delete: deleteCacheMock,
    });

    const replaceMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://example.com/", replace: replaceMock },
    });

    await refreshToLatestBuild();

    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(deleteCacheMock).toHaveBeenCalledWith("cache-v1");
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("still reloads when clearing caches fails", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });
    vi.stubGlobal("caches", {
      keys: vi.fn().mockRejectedValue(new Error("cache error")),
      delete: vi.fn(),
    });

    const replaceMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://example.com/", replace: replaceMock },
    });

    await refreshToLatestBuild();

    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});

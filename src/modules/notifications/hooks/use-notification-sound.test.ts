import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationSound } from "./use-notification-sound";

describe("useNotificationSound", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? false : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  it("plays the notification asset when not reduced-motion", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const play = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn();
    class MockAudio {
      volume = 1;
      currentTime = 0;
      play = play;
      load = load;
    }
    vi.stubGlobal("Audio", MockAudio);

    const { result } = renderHook(() => useNotificationSound());
    act(() => {
      result.current.play();
    });

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("skips playback when prefers-reduced-motion is set", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    const play = vi.fn();
    class MockAudio {
      play = play;
      load = vi.fn();
    }
    vi.stubGlobal("Audio", MockAudio);

    const { result } = renderHook(() => useNotificationSound());
    act(() => {
      result.current.play();
    });

    expect(play).not.toHaveBeenCalled();
  });
});

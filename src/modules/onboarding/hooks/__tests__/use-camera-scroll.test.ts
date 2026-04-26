import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  isElementInViewport,
  calculateCenterScrollY,
  useCameraScroll,
} from "../use-camera-scroll";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock useReducedMotion
let mockReducedMotion = false;
vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Mock gsap — capture tween callbacks so we can drive them manually
let capturedTween: {
  target: { y: number };
  vars: Record<string, unknown>;
  kill: ReturnType<typeof vi.fn>;
} | null = null;

vi.mock("gsap", () => ({
  gsap: {
    to: vi.fn((target: { y: number }, vars: Record<string, unknown>) => {
      const tween = {
        target,
        vars,
        kill: vi.fn(),
      };
      capturedTween = tween;

      // If duration is 0, fire immediately
      if (vars.duration === 0) {
        target.y = vars.y as number;
        if (typeof vars.onUpdate === "function") vars.onUpdate();
        if (typeof vars.onComplete === "function") vars.onComplete();
      }

      return tween;
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockElement(rect: Partial<DOMRect>) {
  return {
    getBoundingClientRect: () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }),
  } as Element;
}

function setupViewport(height: number, scrollY: number = 0) {
  Object.defineProperty(window, "innerHeight", {
    value: height,
    writable: true,
  });
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    writable: true,
  });
}

function setupDocument(scrollHeight: number) {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: scrollHeight,
    writable: true,
    configurable: true,
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockReducedMotion = false;
  capturedTween = null;
  vi.restoreAllMocks();
  setupViewport(800, 0);
  setupDocument(3000);
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Unit tests for isElementInViewport
// ============================================================================

describe("isElementInViewport", () => {
  it("returns true when element is fully within viewport with margin", () => {
    setupViewport(800);
    const el = mockElement({ top: 100, bottom: 300 });
    expect(isElementInViewport(el, 80)).toBe(true);
  });

  it("returns false when element top is above margin", () => {
    setupViewport(800);
    const el = mockElement({ top: 50, bottom: 200 });
    expect(isElementInViewport(el, 80)).toBe(false);
  });

  it("returns false when element bottom exceeds viewport minus margin", () => {
    setupViewport(800);
    const el = mockElement({ top: 100, bottom: 750 });
    expect(isElementInViewport(el, 80)).toBe(false);
  });

  it("returns true at exact margin boundaries", () => {
    setupViewport(800);
    // top = 80 (exactly at margin), bottom = 720 (exactly at viewport - margin)
    const el = mockElement({ top: 80, bottom: 720 });
    expect(isElementInViewport(el, 80)).toBe(true);
  });

  it("uses default margin of 80 when not specified", () => {
    setupViewport(800);
    const el = mockElement({ top: 80, bottom: 720 });
    expect(isElementInViewport(el)).toBe(true);
  });
});

// ============================================================================
// Unit tests for calculateCenterScrollY
// ============================================================================

describe("calculateCenterScrollY", () => {
  it("calculates scroll position to center element vertically", () => {
    setupViewport(800, 0);
    setupDocument(3000);
    // Element at top=500, height=100 → center at 550
    // Target scrollY = 550 - 400 = 150
    const el = mockElement({ top: 500, height: 100 });
    expect(calculateCenterScrollY(el)).toBe(150);
  });

  it("clamps to 0 when element is near the top", () => {
    setupViewport(800, 0);
    setupDocument(3000);
    // Element at top=100, height=50 → center at 125
    // Target scrollY = 125 - 400 = -275 → clamped to 0
    const el = mockElement({ top: 100, height: 50 });
    expect(calculateCenterScrollY(el)).toBe(0);
  });

  it("clamps to max scroll when element is near the bottom", () => {
    setupViewport(800, 0);
    setupDocument(1000);
    // maxScrollY = 1000 - 800 = 200
    // Element at top=900, height=50 → center at 925
    // Target scrollY = 925 - 400 = 525 → clamped to 200
    const el = mockElement({ top: 900, height: 50 });
    expect(calculateCenterScrollY(el)).toBe(200);
  });

  it("accounts for current scroll position", () => {
    setupViewport(800, 500);
    setupDocument(3000);
    // Element at top=200 (viewport-relative), height=100
    // Page-level center = 200 + 500 + 50 = 750
    // Target scrollY = 750 - 400 = 350
    const el = mockElement({ top: 200, height: 100 });
    expect(calculateCenterScrollY(el)).toBe(350);
  });
});

// ============================================================================
// Unit tests for useCameraScroll hook
// ============================================================================

describe("useCameraScroll", () => {
  it("resolves immediately when selector is null", async () => {
    const { result } = renderHook(() => useCameraScroll());

    let resolved = false;
    await act(async () => {
      await result.current.scrollToTarget(null);
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(result.current.isScrolling).toBe(false);
  });

  it("resolves immediately when element is not found", async () => {
    vi.spyOn(document, "querySelector").mockReturnValue(null);

    const { result } = renderHook(() => useCameraScroll());

    let resolved = false;
    await act(async () => {
      await result.current.scrollToTarget('[data-target="missing"]');
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(result.current.isScrolling).toBe(false);
  });

  it("resolves immediately when element is already in viewport", async () => {
    setupViewport(800);
    const el = mockElement({ top: 200, bottom: 400 });
    vi.spyOn(document, "querySelector").mockReturnValue(el);

    const { result } = renderHook(() => useCameraScroll());

    let resolved = false;
    await act(async () => {
      await result.current.scrollToTarget('[data-target="visible"]');
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(result.current.isScrolling).toBe(false);
  });

  it("starts GSAP tween when element is outside viewport", async () => {
    setupViewport(800, 0);
    setupDocument(3000);
    // Element below viewport
    const el = mockElement({ top: 900, bottom: 950, height: 50 });
    vi.spyOn(document, "querySelector").mockReturnValue(el);

    const { result } = renderHook(() => useCameraScroll());

    // Start scroll (won't resolve until onComplete fires)
    let resolved = false;
    const promise = act(async () => {
      const p = result.current.scrollToTarget('[data-target="below"]');
      // Manually complete the tween
      if (capturedTween) {
        const { vars, target } = capturedTween;
        target.y = vars.y as number;
        if (typeof vars.onUpdate === "function") vars.onUpdate();
        if (typeof vars.onComplete === "function") vars.onComplete();
      }
      await p;
      resolved = true;
    });

    await promise;
    expect(resolved).toBe(true);
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("uses duration 0 when reduced motion is active", async () => {
    mockReducedMotion = true;
    setupViewport(800, 0);
    setupDocument(3000);
    const el = mockElement({ top: 900, bottom: 950, height: 50 });
    vi.spyOn(document, "querySelector").mockReturnValue(el);

    const { result } = renderHook(() => useCameraScroll());

    await act(async () => {
      await result.current.scrollToTarget('[data-target="below"]');
    });

    // With duration 0, the mock fires immediately
    expect(capturedTween).not.toBeNull();
    expect(capturedTween!.vars.duration).toBe(0);
    expect(result.current.isScrolling).toBe(false);
  });

  it("uses power2.out easing and 0.6s duration normally", async () => {
    mockReducedMotion = false;
    setupViewport(800, 0);
    setupDocument(3000);
    const el = mockElement({ top: 900, bottom: 950, height: 50 });
    vi.spyOn(document, "querySelector").mockReturnValue(el);

    const { result } = renderHook(() => useCameraScroll());

    act(() => {
      result.current.scrollToTarget('[data-target="below"]');
    });

    expect(capturedTween).not.toBeNull();
    expect(capturedTween!.vars.duration).toBe(0.6);
    expect(capturedTween!.vars.ease).toBe("power2.out");

    // Complete the tween to clean up
    await act(async () => {
      if (capturedTween) {
        const { vars } = capturedTween;
        if (typeof vars.onComplete === "function") vars.onComplete();
      }
    });
  });

  it("kills previous tween when a new scroll is requested", async () => {
    setupViewport(800, 0);
    setupDocument(3000);
    const el = mockElement({ top: 900, bottom: 950, height: 50 });
    vi.spyOn(document, "querySelector").mockReturnValue(el);

    const { result } = renderHook(() => useCameraScroll());

    // Start first scroll
    act(() => {
      result.current.scrollToTarget('[data-target="first"]');
    });

    const firstTween = capturedTween;
    expect(firstTween).not.toBeNull();

    // Start second scroll — should kill the first
    act(() => {
      result.current.scrollToTarget('[data-target="second"]');
    });

    expect(firstTween!.kill).toHaveBeenCalled();

    // Complete the second tween to clean up
    await act(async () => {
      if (capturedTween) {
        const { vars } = capturedTween;
        if (typeof vars.onComplete === "function") vars.onComplete();
      }
    });
  });
});

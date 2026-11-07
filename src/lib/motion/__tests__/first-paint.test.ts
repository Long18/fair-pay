import { describe, expect, it } from "vitest";
import {
  SCROLL_REVEAL,
  FIRST_PAINT_CHROME,
  FIRST_PAINT_TRANSITION,
} from "../tokens";
import { instantIfReduced } from "../reduced-motion";
import {
  firstPaintEnterInitial,
  firstPaintEnterTransition,
} from "../first-paint";

describe("scroll reveal tokens", () => {
  it("matches cold-load preloader defaults", () => {
    expect(SCROLL_REVEAL.start).toBe("top 88%");
    expect(SCROLL_REVEAL.duration).toBe(0.85);
    expect(SCROLL_REVEAL.distance).toBe(64);
    expect(SCROLL_REVEAL.ease).toBe("power3.out");
    expect(SCROLL_REVEAL.staggerDelay).toBe(0.12);
  });
});

describe("first paint helpers", () => {
  it("uses longer transition than default shell when motion is allowed", () => {
    expect(firstPaintEnterTransition(false)).toEqual({
      ...FIRST_PAINT_TRANSITION,
      delay: FIRST_PAINT_CHROME.contentDelay,
    });
    expect(firstPaintEnterTransition(true)).toEqual({ duration: 0 });
  });

  it("firstPaintEnterInitial uses deeper Y than default shell", () => {
    expect(firstPaintEnterInitial(false)).toMatchObject({
      opacity: 0,
      y: 28,
    });
    expect(firstPaintEnterInitial(true)).toBe(false);
  });

  it("instantIfReduced applies to first paint transition", () => {
    expect(instantIfReduced(true, FIRST_PAINT_TRANSITION)).toEqual({
      duration: 0,
    });
  });
});

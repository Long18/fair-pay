import { describe, expect, it } from "vitest";
import { SHELL_TRANSITION } from "../tokens";
import {
  instantIfReduced,
  shellEnterInitial,
  shellEnterTransition,
} from "../reduced-motion";

describe("motion reduced-motion helpers", () => {
  it("instantIfReduced returns zero duration when reduced", () => {
    expect(instantIfReduced(true, SHELL_TRANSITION)).toEqual({ duration: 0 });
    expect(instantIfReduced(false, SHELL_TRANSITION)).toEqual(SHELL_TRANSITION);
  });

  it("shellEnterTransition mirrors instantIfReduced for shell tokens", () => {
    expect(shellEnterTransition(true)).toEqual({ duration: 0 });
    expect(shellEnterTransition(false)).toEqual(SHELL_TRANSITION);
  });

  it("shellEnterInitial is false when reduced motion is on", () => {
    expect(shellEnterInitial(true)).toBe(false);
    expect(shellEnterInitial(false)).toMatchObject({ opacity: 0, y: expect.any(Number) });
  });
});

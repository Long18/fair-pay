import { describe, it, expect } from "vitest";

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe("rectsOverlap (pond vs floating chrome)", () => {
  it("detects overlap when FAB lane intersects stage", () => {
    const fab = new DOMRect(16, 600, 48, 48);
    const stage = new DOMRect(0, 500, 1200, 400);
    expect(rectsOverlap(fab, stage)).toBe(true);
  });

  it("no overlap when stage is above FAB lane", () => {
    const fab = new DOMRect(16, 600, 48, 48);
    const stage = new DOMRect(0, 0, 1200, 400);
    expect(rectsOverlap(fab, stage)).toBe(false);
  });
});

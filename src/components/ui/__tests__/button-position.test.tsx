import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "../button";

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

describe("Button position classes", () => {
  it("keeps caller fixed positioning when ripple is enabled", () => {
    const { getByRole } = render(
      <Button className="fixed bottom-6 right-6 h-14 w-14">New</Button>,
    );

    const className = getByRole("button").className;
    expect(className).toContain("fixed");
    expect(className).not.toMatch(/(?:^|\s)relative(?:\s|$)/);
  });

  it("keeps caller absolute positioning when ripple is enabled", () => {
    const { getByRole } = render(
      <Button className="absolute top-2 right-2">Menu</Button>,
    );

    const className = getByRole("button").className;
    expect(className).toContain("absolute");
    expect(className).not.toMatch(/(?:^|\s)relative(?:\s|$)/);
  });

  it("still applies relative for ripple when no position class is passed", () => {
    const { getByRole } = render(<Button>Save</Button>);

    expect(getByRole("button").className).toMatch(/(?:^|\s)relative(?:\s|$)/);
  });
});

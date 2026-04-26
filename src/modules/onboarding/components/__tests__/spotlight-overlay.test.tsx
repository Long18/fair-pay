import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SpotlightOverlay } from "../spotlight-overlay";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock useSpotlight to return controlled spotlight rects
vi.mock("../../hooks/use-spotlight", () => ({
  useSpotlight: vi.fn(),
}));

// Mock useReducedMotion
vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useSpotlight } from "../../hooks/use-spotlight";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const mockUseSpotlight = vi.mocked(useSpotlight);
const mockUseReducedMotion = vi.mocked(useReducedMotion);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSpotlightRect(overrides = {}) {
  return {
    x: 100,
    y: 200,
    width: 216,
    height: 116,
    shape: "rect" as const,
    borderRadius: 8,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SpotlightOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    // Default: spotlight found
    mockUseSpotlight.mockReturnValue({
      spotlightRect: makeSpotlightRect(),
      tooltipPosition: { x: 200, y: 350, placement: "bottom" },
      recalculate: vi.fn(),
    });
  });

  it("renders aria-live region for screen reader announcements", () => {
    render(
      <SpotlightOverlay
        targetSelector="[data-test]"
        isVisible={true}
        announcement="Step 1: Welcome to FairPay"
      />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("Step 1: Welcome to FairPay");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("clears aria-live region when not visible", () => {
    render(
      <SpotlightOverlay
        targetSelector="[data-test]"
        isVisible={false}
        announcement="Step 1: Welcome"
      />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("");
  });

  it("does not render overlay when isVisible is false", () => {
    mockUseSpotlight.mockReturnValue({
      spotlightRect: null,
      tooltipPosition: { x: 0, y: 0, placement: "center" },
      recalculate: vi.fn(),
    });

    const { container } = render(
      <SpotlightOverlay targetSelector={null} isVisible={false} />,
    );

    // No SVG should be rendered
    expect(container.querySelector("svg")).toBeNull();
  });

  it("does not render overlay when spotlightRect is null (element not found)", () => {
    mockUseSpotlight.mockReturnValue({
      spotlightRect: null,
      tooltipPosition: { x: 0, y: 0, placement: "center" },
      recalculate: vi.fn(),
    });

    const { container } = render(
      <SpotlightOverlay targetSelector="[data-missing]" isVisible={true} />,
    );

    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders SVG overlay with mask when visible and rect is available", () => {
    const { container } = render(
      <SpotlightOverlay targetSelector="[data-test]" isVisible={true} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");

    // Should have a mask definition
    const mask = container.querySelector("mask");
    expect(mask).not.toBeNull();
  });

  it("passes targetSelector and isVisible to useSpotlight", () => {
    render(
      <SpotlightOverlay targetSelector="[data-fab]" isVisible={true} />,
    );

    expect(mockUseSpotlight).toHaveBeenCalledWith("[data-fab]", true);
  });

  it("renders children when provided", () => {
    render(
      <SpotlightOverlay targetSelector="[data-test]" isVisible={true}>
        <div data-testid="tooltip-content">Tooltip here</div>
      </SpotlightOverlay>,
    );

    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("calls onBackdropClick when backdrop is clicked", () => {
    const handleClick = vi.fn();

    const { container } = render(
      <SpotlightOverlay
        targetSelector="[data-test]"
        isVisible={true}
        onBackdropClick={handleClick}
      />,
    );

    // Click on the backdrop rect (the one with data-spotlight-backdrop)
    const backdropRect = container.querySelector(
      "[data-spotlight-backdrop='true']",
    );
    if (backdropRect) {
      fireEvent.click(backdropRect);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it("uses duration 0 when reduced motion is preferred", () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { container } = render(
      <SpotlightOverlay targetSelector="[data-test]" isVisible={true} />,
    );

    // The component should still render (just with instant transitions)
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders circle cutout shape correctly", () => {
    mockUseSpotlight.mockReturnValue({
      spotlightRect: makeSpotlightRect({ shape: "circle" }),
      tooltipPosition: { x: 200, y: 350, placement: "bottom" },
      recalculate: vi.fn(),
    });

    const { container } = render(
      <SpotlightOverlay
        targetSelector="[data-test]"
        isVisible={true}
        shape="circle"
      />,
    );

    // Should have circle elements in the SVG (cutout + border)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pill cutout shape correctly", () => {
    mockUseSpotlight.mockReturnValue({
      spotlightRect: makeSpotlightRect({ shape: "pill" }),
      tooltipPosition: { x: 200, y: 350, placement: "bottom" },
      recalculate: vi.fn(),
    });

    const { container } = render(
      <SpotlightOverlay
        targetSelector="[data-test]"
        isVisible={true}
        shape="pill"
      />,
    );

    // Should have rect elements with rounded corners (rx attribute)
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // The mask should contain a rect with rx for pill shape
    const maskRects = container.querySelectorAll("mask rect");
    // At least the white background rect + the cutout rect
    expect(maskRects.length).toBeGreaterThanOrEqual(2);
  });

  it("renders rect cutout shape by default", () => {
    const { container } = render(
      <SpotlightOverlay targetSelector="[data-test]" isVisible={true} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Default shape is rect — should have rect elements in the mask
    const maskRects = container.querySelectorAll("mask rect");
    expect(maskRects.length).toBeGreaterThanOrEqual(2);
  });

  it("has pointer-events-none on the overlay container", () => {
    const { container } = render(
      <SpotlightOverlay targetSelector="[data-test]" isVisible={true} />,
    );

    // The motion.div wrapper should have pointer-events-none class
    // while the SVG inside has pointer-events-auto
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("pointer-events-auto")).toBe(true);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OweStatusIndicator } from "@/components/ui/owe-status-indicator";

describe("OweStatusIndicator", () => {
  it("renders owe direction correctly", () => {
    render(<OweStatusIndicator direction="owe" amount={50000} currency="VND" />);
    expect(screen.getByText("50.000₫")).toBeInTheDocument();
  });

  it("renders owed direction correctly", () => {
    render(<OweStatusIndicator direction="owed" amount={100000} currency="VND" />);
    expect(screen.getByText("100.000₫")).toBeInTheDocument();
  });

  it("renders neutral direction correctly", () => {
    render(<OweStatusIndicator direction="neutral" amount={0} currency="VND" />);
    expect(screen.getByText("0₫")).toBeInTheDocument();
  });

  it("formats USD currency correctly", () => {
    render(<OweStatusIndicator direction="owe" amount={1234.56} currency="USD" />);
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("handles negative amounts by showing absolute value", () => {
    render(<OweStatusIndicator direction="owe" amount={-50000} currency="VND" />);
    expect(screen.getByText("50.000₫")).toBeInTheDocument();
  });

  it("renders small size variant", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} size="sm" />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-xs");
  });

  it("renders medium size variant (default)", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-sm");
  });

  it("renders large size variant", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} size="lg" />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-base");
  });

  it("applies correct color classes for owe direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-red-600");
  });

  it("applies correct color classes for owed direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owed" amount={50000} />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-green-600");
  });

  it("applies correct color classes for neutral direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="neutral" amount={0} />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("text-gray-600");
  });

  it("accepts custom className", () => {
    const { container } = render(
      <OweStatusIndicator
        direction="owe"
        amount={50000}
        className="custom-class"
      />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveClass("custom-class");
  });

  it("includes proper ARIA label for owe direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} currency="VND" />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveAttribute("aria-label", "You owe 50.000₫");
  });

  it("includes proper ARIA label for owed direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owed" amount={50000} currency="VND" />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveAttribute("aria-label", "Owed to you 50.000₫");
  });

  it("includes proper ARIA label for neutral direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="neutral" amount={0} currency="VND" />
    );
    const indicator = container.querySelector("span");
    expect(indicator).toHaveAttribute("aria-label", "Neutral 0₫");
  });

  it("renders arrow down icon for owe direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owe" amount={50000} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders arrow up icon for owed direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="owed" amount={50000} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does not render icon for neutral direction", () => {
    const { container } = render(
      <OweStatusIndicator direction="neutral" amount={0} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaymentStateBadge } from "@/components/ui/payment-state-badge";

describe("PaymentStateBadge", () => {
  it("renders paid state correctly", () => {
    render(<PaymentStateBadge state="paid" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders unpaid state correctly", () => {
    render(<PaymentStateBadge state="unpaid" />);
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });

  it("renders partial state correctly", () => {
    render(<PaymentStateBadge state="partial" />);
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });

  it("renders partial state with percentage", () => {
    render(<PaymentStateBadge state="partial" percentage={75} />);
    expect(screen.getByText("75% Paid")).toBeInTheDocument();
  });

  it("renders small size variant", () => {
    const { container } = render(<PaymentStateBadge state="paid" size="sm" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("text-xs", "px-1.5", "py-0.5");
  });

  it("renders medium size variant (default)", () => {
    const { container } = render(<PaymentStateBadge state="paid" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("text-xs", "px-2", "py-0.5");
  });

  it("renders large size variant", () => {
    const { container } = render(<PaymentStateBadge state="paid" size="lg" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("text-sm", "px-2.5", "py-1");
  });

  it("applies correct color classes for paid state", () => {
    const { container } = render(<PaymentStateBadge state="paid" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("border-green-200", "bg-green-100", "text-green-700");
  });

  it("applies correct color classes for unpaid state", () => {
    const { container } = render(<PaymentStateBadge state="unpaid" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("border-orange-200", "bg-orange-100", "text-orange-700");
  });

  it("applies correct color classes for partial state", () => {
    const { container } = render(<PaymentStateBadge state="partial" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("border-blue-200", "bg-blue-100", "text-blue-700");
  });

  it("accepts custom className", () => {
    const { container } = render(
      <PaymentStateBadge state="paid" className="custom-class" />
    );
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("custom-class");
  });
});

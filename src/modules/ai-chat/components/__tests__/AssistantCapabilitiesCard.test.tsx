import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AssistantCapabilitiesCard from "../AssistantCapabilitiesCard";

vi.mock("@refinedev/core", () => ({
  useGo: () => vi.fn(),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => ({ tap: vi.fn() }),
}));

describe("AssistantCapabilitiesCard", () => {
  it("fires digest quick prompt", async () => {
    const user = userEvent.setup();
    const onQuickPrompt = vi.fn();
    render(<AssistantCapabilitiesCard language="vi" onQuickPrompt={onQuickPrompt} />);

    const digestBtn = screen.getByRole("button", { name: /Tổng hợp đầy đủ|Full summary/ });
    await user.click(digestBtn);
    expect(onQuickPrompt).toHaveBeenCalledWith("Tổng hợp FairPay");
  });
});

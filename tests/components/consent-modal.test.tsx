import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { ConsentModal } from "@/components/consent/ConsentModal";
import { readConsentState, resetConsentCacheForTests, writeConsentState } from "@/lib/analytics/consent-gate";

function renderModal() {
  return render(
    <MemoryRouter>
      <ConsentModal />
    </MemoryRouter>,
  );
}

describe("ConsentModal", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConsentCacheForTests();
  });

  it("shows three pre-checked categories while consent is pending", () => {
    renderModal();

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(3);
    for (const toggle of switches) expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  it("saves the toggled categories on confirm", () => {
    renderModal();

    const [, , marketing] = screen.getAllByRole("switch");
    fireEvent.click(marketing);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(readConsentState()).toMatchObject({
      preferences: "accepted",
      experience: "accepted",
      marketing: "rejected",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects every category on decline", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(readConsentState()).toMatchObject({
      preferences: "rejected",
      experience: "rejected",
      marketing: "rejected",
    });
  });

  it("stays hidden once a decision exists", () => {
    act(() => {
      writeConsentState({ preferences: true, experience: false, marketing: false });
    });
    renderModal();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import { buildDebtShareUrl } from "../share-url";

describe("buildDebtShareUrl", () => {
  it("builds a debt share url with viewer and counterparty ids", () => {
    const result = buildDebtShareUrl(
      {
        viewerId: "viewer-123",
        counterpartyId: "counterparty-456",
        latestActivityAt: "2026-04-21T12:30:00.000Z",
      },
      "https://long-pay.vercel.app/debts/counterparty-456",
    );

    expect(result).toBe(
      "https://long-pay.vercel.app/api/share/debt?viewer_id=viewer-123&counterparty_id=counterparty-456&v=1776774600",
    );
  });

  it("extracts the counterparty id from the current debt route when needed", () => {
    const result = buildDebtShareUrl(
      {
        viewerId: "viewer-123",
        latestActivityAt: "2026-04-21",
      },
      "https://long-pay.vercel.app/debts/counterparty-789",
    );

    expect(result).toBe(
      "https://long-pay.vercel.app/api/share/debt?viewer_id=viewer-123&counterparty_id=counterparty-789&v=1776729600",
    );
  });

  it("returns the current url when the viewer id is missing", () => {
    const currentUrl = "https://long-pay.vercel.app/debts/counterparty-789";

    expect(buildDebtShareUrl({}, currentUrl)).toBe(currentUrl);
  });
});

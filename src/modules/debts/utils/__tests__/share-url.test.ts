import { describe, expect, it } from "vitest";

import { buildDebtShareUrl } from "../share-url";

describe("buildDebtShareUrl", () => {
  const viewerId = "9ac73f98-d6ff-54dd-8337-e96816e855c1";
  const counterpartyId = "18441dda-4fdf-57fe-829e-5dd795f25937";

  it("builds a short debt share url with a compact token", () => {
    const result = buildDebtShareUrl(
      {
        viewerId,
        counterpartyId,
        latestActivityAt: "2026-04-21T12:30:00.000Z",
      },
      `https://long-pay.vercel.app/debts/${counterpartyId}`,
    );

    const url = new URL(result);
    expect(url.origin).toBe("https://long-pay.vercel.app");
    expect(url.pathname.startsWith("/share/debts/")).toBe(true);
    // Token param should exist and be much shorter than two full UUIDs
    const token = url.pathname.split("/").pop();
    expect(token).toBeTruthy();
    expect(token!.length).toBeLessThan(50);
    expect(url.searchParams.has("v")).toBe(false);
    // Should NOT have the old verbose params
    expect(url.searchParams.has("viewer_id")).toBe(false);
    expect(url.searchParams.has("counterparty_id")).toBe(false);
  });

  it("extracts the counterparty id from the current debt route when needed", () => {
    const result = buildDebtShareUrl(
      {
        viewerId,
        latestActivityAt: "2026-04-21",
      },
      `https://long-pay.vercel.app/debts/${counterpartyId}`,
    );

    const url = new URL(result);
    expect(url.pathname.startsWith("/share/debts/")).toBe(true);
    expect(url.pathname.split("/").pop()).toBeTruthy();
    expect(url.searchParams.has("v")).toBe(false);
  });

  it("returns the current url when the viewer id is missing", () => {
    const currentUrl = `https://long-pay.vercel.app/debts/${counterpartyId}`;

    expect(buildDebtShareUrl({}, currentUrl)).toBe(currentUrl);
  });

  it("produces a deterministic token for the same pair of ids", () => {
    const url1 = buildDebtShareUrl(
      { viewerId, counterpartyId, latestActivityAt: "2026-01-01" },
      "https://long-pay.vercel.app/debts/x",
    );
    const url2 = buildDebtShareUrl(
      { viewerId, counterpartyId, latestActivityAt: "2026-01-01" },
      "https://long-pay.vercel.app/debts/x",
    );
    expect(url1).toBe(url2);
  });

  it("adds a compact ref when tracking context is provided", () => {
    const result = buildDebtShareUrl(
      {
        viewerId,
        counterpartyId,
        latestActivityAt: "2026-04-21T12:30:00.000Z",
      },
      `https://long-pay.vercel.app/debts/${counterpartyId}`,
      {
        source: "Native Share",
        medium: "Social Share",
        content: "Debt Detail Share Button",
      },
    );

    const url = new URL(result);
    expect(url.pathname.startsWith("/share/debts/")).toBe(true);
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(url.searchParams.has("utm_medium")).toBe(false);
    expect(url.searchParams.has("utm_campaign")).toBe(false);
    expect(url.searchParams.has("utm_content")).toBe(false);
    // native_share/social_share/debt_share/debt_detail_share_button → n=1690 → "RG"
    expect(url.searchParams.get("ref")).toBe("RG");
  });
});

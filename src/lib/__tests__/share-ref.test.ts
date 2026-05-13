import { describe, expect, it } from "vitest";

import {
  SHARE_REF_PARAM,
  appendShareRef,
  buildShareRef,
  getShareRefPropertiesFromUrl,
  parseShareRef,
} from "../share-ref";

describe("share-ref", () => {
  it("encodes taxonomy to a short base62 string and decodes back", () => {
    const ref = buildShareRef({
      source: "Native Share",
      medium: "Social Share",
      campaign: "Expense Share",
      content: "Expense Detail Share Button",
    });

    expect(ref).toBe("9i");
    expect(parseShareRef(ref)).toEqual({
      source: "native_share",
      medium: "social_share",
      campaign: "expense_share",
      content: "expense_detail_share_button",
    });
  });

  it("returns null for malformed refs", () => {
    expect(parseShareRef(null)).toBeNull();
    expect(parseShareRef("facebook")).toBeNull(); // too many bits
    expect(parseShareRef("fp1_missing_parts")).toBeNull();
    expect(parseShareRef("fp1_a~b~c~d~term")).toBeNull();
    expect(parseShareRef("fp1_a~b~c~d~e~unexpected")).toBeNull();
  });

  it("still decodes legacy fp1_ format for backward compat", () => {
    const legacy = "fp1_whatsapp~social_share~expense_share~expense_detail_share_button";
    expect(parseShareRef(legacy)).toEqual({
      source: "whatsapp",
      medium: "social_share",
      campaign: "expense_share",
      content: "expense_detail_share_button",
    });
  });

  it("appends one short ref parameter and strips visible UTM params", () => {
    const result = appendShareRef(
      "/expenses/show/expense-123?utm_source=old&utm_campaign=old&tab=details",
      {
        source: "facebook",
        medium: "social_share",
        campaign: "expense_share",
        content: "expense_detail_share_button",
      },
      { baseOrigin: "https://long-pay.vercel.app" },
    );

    const url = new URL(result, "https://long-pay.vercel.app");
    expect(url.pathname).toBe("/expenses/show/expense-123");
    expect(url.searchParams.get("tab")).toBe("details");
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(url.searchParams.has("utm_campaign")).toBe(false);
    expect(url.searchParams.get(SHARE_REF_PARAM)).toBe("9Z");
  });

  it("exposes decoded UTM properties from a legacy ref URL", () => {
    const properties = getShareRefPropertiesFromUrl(
      "https://long-pay.vercel.app/share/expenses/expense-123?ref=fp1_telegram~social_share~expense_share~expense_summary_share_button",
    );

    expect(properties).toEqual({
      share_ref: "fp1_telegram~social_share~expense_share~expense_summary_share_button",
      utm_source: "telegram",
      utm_medium: "social_share",
      utm_campaign: "expense_share",
      utm_content: "expense_summary_share_button",
    });
  });

  it("exposes decoded UTM properties from a compact base62 ref URL", () => {
    const ref = buildShareRef({
      source: "telegram",
      medium: "social_share",
      campaign: "expense_share",
      content: "expense_summary_share_button",
    });

    const properties = getShareRefPropertiesFromUrl(
      `https://long-pay.vercel.app/share/expenses/expense-123?ref=${ref}`,
    );

    expect(properties).toMatchObject({
      utm_source: "telegram",
      utm_medium: "social_share",
      utm_campaign: "expense_share",
      utm_content: "expense_summary_share_button",
    });
  });
});

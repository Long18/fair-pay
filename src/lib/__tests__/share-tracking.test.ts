import { describe, expect, it } from "vitest";

import { buildShareTrackedUrl } from "../share-tracking";
import { DEFAULT_UTM_PLATFORMS, findUtmPlatform } from "../utm-config";

describe("buildShareTrackedUrl", () => {
  it("emits compact copy-link taxonomy without visible UTM params", () => {
    const result = buildShareTrackedUrl({
      shareUrl: "/groups/show/group-123",
      source: "copy_link",
      medium: "copy_link",
      campaign: "group_invite",
      content: "group_detail_invite_button",
    });

    const url = new URL(result, "https://long-pay.vercel.app");
    expect(url.pathname).toBe("/groups/show/group-123");
    expect(url.searchParams.get("ref")).toBe(
      "fp1_copy_link~copy_link~group_invite~group_detail_invite_button",
    );
    expect(url.searchParams.has("utm_source")).toBe(false);
  });

  it("uses explicit taxonomy sources for utility share methods", () => {
    expect(findUtmPlatform(DEFAULT_UTM_PLATFORMS, "copy_link")?.source).toBe("copy_link");
    expect(findUtmPlatform(DEFAULT_UTM_PLATFORMS, "native_share")?.source).toBe("native_share");
  });
});

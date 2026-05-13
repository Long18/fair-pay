import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_STORAGE_KEYS,
  captureAttributionFromUrl,
  getCanonicalDestinationPath,
  getUtmPropertiesFromUrl,
  type StorageLike,
} from "../utm";

function createStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("utm attribution", () => {
  it("maps compact share refs into internal UTM fields", () => {
    const storage = createStorage();
    const context = captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/groups/show/group-123?ref=fp1_facebook~social_share~group_invite~group_detail_invite_button",
      referrer: null,
      now: "2026-05-13T00:00:00.000Z",
      storage,
      cookie: null,
    });

    expect(context.last_touch).toMatchObject({
      utm_source: "facebook",
      utm_medium: "social_share",
      utm_campaign: "group_invite",
      utm_content: "group_detail_invite_button",
      utm_term: null,
    });
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEYS.firstTouch)).toContain("group_invite");
  });

  it("keeps explicit UTM params ahead of decoded refs", () => {
    const context = captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/friends/friend-123?ref=fp1_facebook~social_share~friend_invite~friend_detail_share_button&utm_source=zalo&utm_medium=dm&utm_campaign=override",
      referrer: "https://facebook.com/example",
      now: "2026-05-13T00:00:00.000Z",
      storage: createStorage(),
      cookie: null,
    });

    expect(context.last_touch).toMatchObject({
      utm_source: "zalo",
      utm_medium: "dm",
      utm_campaign: "override",
      utm_content: null,
    });
  });

  it("exposes decoded refs as event properties while hiding display params from admin destinations", () => {
    const url = "https://long-pay.vercel.app/expenses/show/expense-123?tab=detail&ref=fp1_telegram~social_share~expense_share~expense_detail_share_button";

    expect(getUtmPropertiesFromUrl(url)).toEqual({
      share_ref: "fp1_telegram~social_share~expense_share~expense_detail_share_button",
      utm_source: "telegram",
      utm_medium: "social_share",
      utm_campaign: "expense_share",
      utm_content: "expense_detail_share_button",
    });
    expect(getCanonicalDestinationPath(url)).toBe("/expenses/show/expense-123?tab=detail");
  });
});

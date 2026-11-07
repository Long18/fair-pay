import { describe, expect, it } from "vitest";
import { resolveNotificationTarget } from "./notification-navigation";

describe("resolveNotificationTarget", () => {
  it("sends friend requests to Connections friends tab with requests section", () => {
    expect(
      resolveNotificationTarget({
        type: "friend_request",
        link: "/friends",
        related_id: "uuid-friendship",
      }),
    ).toBe("/connections?tab=friends&section=requests");
  });

  it("keeps expense deep links with comment anchors", () => {
    const link = "/expenses/show/exp-1#comment-abc";
    expect(
      resolveNotificationTarget({
        type: "comment_mention",
        link,
        related_id: "comment-abc",
      }),
    ).toBe(link);
  });

  it("opens accepter profile for friend_accepted", () => {
    expect(
      resolveNotificationTarget({
        type: "friend_accepted",
        link: "/friends",
        related_id: "ship-1",
        actor_id: "user-accepter",
      }),
    ).toBe("/profile/user-accepter");
  });

  it("anchors group join requests on group show", () => {
    expect(
      resolveNotificationTarget({
        type: "group_join_request",
        link: "/groups/show/g1",
        related_id: "g1",
        actor_id: "requester",
      }),
    ).toBe("/groups/show/g1#group-join-requests");
  });
});

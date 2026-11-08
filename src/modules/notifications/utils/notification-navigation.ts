import type { Notification, NotificationType } from "../types";

const FRIENDS_HUB = "/connections?tab=friends";
const GROUPS_HUB = "/connections?tab=groups";

/**
 * Maps DB `link` + `type` + `related_id` to the in-app route users expect.
 * DB links are often legacy (/friends) or missing anchors; this normalizes on the client.
 */
export function resolveNotificationTarget(
  notification: Pick<Notification, "type" | "link" | "related_id" | "actor_id">,
): string | null {
  const stored = notification.link?.trim() || null;
  const relatedId = notification.related_id;
  const actorId = notification.actor_id;
  const normalizedStored = stored
    ? normalizeLegacyLink(stored, notification.type, relatedId, actorId)
    : null;

  switch (notification.type) {
    case "friend_request":
      return normalizedStored ?? `${FRIENDS_HUB}&section=requests`;
    case "friend_accepted":
      if (actorId) return `/profile/${actorId}`;
      if (normalizedStored?.startsWith("/profile/")) return normalizedStored;
      if (relatedId) return `/friends/show/${relatedId}`;
      return normalizedStored ?? FRIENDS_HUB;
    case "added_to_group":
      if (relatedId) return `/groups/show/${relatedId}`;
      return normalizedStored ?? GROUPS_HUB;
    case "group_join_request":
      if (normalizedStored?.includes("group-join-requests")) return normalizedStored;
      if (relatedId) return `/groups/show/${relatedId}#group-join-requests`;
      return normalizedStored ?? GROUPS_HUB;
    case "group_join_approved":
    case "group_join_rejected":
      if (relatedId) return `/groups/show/${relatedId}`;
      return normalizedStored ?? GROUPS_HUB;
    case "expense_added":
    case "expense_updated":
    case "expense_deleted":
      if (normalizedStored?.startsWith("/expenses/")) return normalizedStored;
      if (relatedId) return `/expenses/show/${relatedId}`;
      return normalizedStored;
    case "expense_comment":
    case "comment_mention":
    case "comment_reply":
    case "comment_reaction":
      // related_id is the comment id; expense id lives in `link`
      if (normalizedStored?.startsWith("/expenses/")) return normalizedStored;
      return stored;
    case "payment_recorded":
    case "payment_pending_confirmation":
      return normalizedStored ?? "/balances";
    case "recurring_due_reminder":
      return "/recurring-expenses";
    default:
      return normalizedStored;
  }
}

function normalizeLegacyLink(
  link: string,
  type: NotificationType,
  relatedId: string | null,
  actorId: string | null,
): string | null {
  const pathOnly = link.split("#")[0].split("?")[0];

  if (type === "friend_request" && (pathOnly === "/friends" || pathOnly === "/connections")) {
    return `${FRIENDS_HUB}&section=requests`;
  }

  if (type === "friend_accepted") {
    if (pathOnly.startsWith("/profile/")) return link;
    if (pathOnly === "/friends" && actorId) return `/profile/${actorId}`;
    if (pathOnly === "/friends" && relatedId) return `/friends/show/${relatedId}`;
  }

  if (
    type === "group_join_request" &&
    pathOnly.startsWith("/groups/show/") &&
    !link.includes("group-join-requests")
  ) {
    return `${pathOnly}#group-join-requests`;
  }

  return link;
}

export type NotificationGo = (config: { to: string; type?: "push" | "replace" }) => void;

/**
 * SPA navigation that preserves query + hash (e.g. #comment-uuid) after the route mounts.
 */
export function navigateToNotificationTarget(go: NotificationGo, target: string): void {
  const hashIndex = target.indexOf("#");
  const pathAndSearch = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : "";

  go({ to: pathAndSearch || "/" });

  if (!hash || typeof window === "undefined") return;

  const scrollDelay =
    hash.startsWith("#comment-") || hash === "#group-join-requests" ? 800 : 150;

  window.setTimeout(() => {
    const base = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", `${base}${hash}`);
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, scrollDelay);
}

import { Notification } from "../types";
import { resolveNotificationTarget } from "./notification-navigation";
import {
  NOTIFICATION_PREVIEW_ENTER_STAGGER_MS,
  NOTIFICATION_PREVIEW_MAX_STACK,
} from "../constants";
import { pickNotificationsForToast } from "./new-unread-delta";
import {
  dispatchNotificationPreview,
  type NotificationPreviewDetail,
} from "./notification-preview-events";

export function showRichNotificationPreview(options: {
  notifications: readonly Notification[];
  burstIds: readonly string[];
  isMobile: boolean;
  reducedMotion: boolean;
}): void {
  const picked = pickNotificationsForToast(
    options.notifications,
    options.burstIds,
  ).slice(0, NOTIFICATION_PREVIEW_MAX_STACK);
  if (picked.length === 0) return;

  const ordered = [...picked].reverse();

  ordered.forEach((notification, index) => {
    const viewLink = resolveNotificationTarget(notification) ?? undefined;
    const detail: NotificationPreviewDetail = {
      notification,
      isMobile: options.isMobile,
      reducedMotion: options.reducedMotion,
      viewLink,
    };

    const delay =
      options.reducedMotion ? 0 : index * NOTIFICATION_PREVIEW_ENTER_STAGGER_MS;

    if (delay === 0) {
      dispatchNotificationPreview(detail);
      return;
    }

    globalThis.setTimeout(() => dispatchNotificationPreview(detail), delay);
  });
}

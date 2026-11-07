import type { Notification } from "../types";

export const NOTIFICATION_PREVIEW_EVENT = "fairpay:notification-preview";

export type NotificationPreviewDetail = {
  notification: Notification;
  isMobile: boolean;
  reducedMotion: boolean;
  /** When set, tap navigates here; otherwise opens the notification panel. */
  viewLink?: string;
};

export function dispatchNotificationPreview(detail: NotificationPreviewDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NotificationPreviewDetail>(NOTIFICATION_PREVIEW_EVENT, {
      detail,
    })
  );
}

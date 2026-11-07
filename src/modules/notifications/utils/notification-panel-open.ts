export const NOTIFICATION_PANEL_OPEN_EVENT = "fairpay:open-notifications";

export function openNotificationPanel(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_PANEL_OPEN_EVENT));
}

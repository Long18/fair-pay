export const NOTIF_WELCOME_PING_KEY = "notif-welcome-ping";

/** One welcome ping per browser tab session when unread exist on first fetch. */
export const tryConsumeWelcomePing = (): boolean => {
  if (typeof sessionStorage === "undefined") return true;
  if (sessionStorage.getItem(NOTIF_WELCOME_PING_KEY)) return false;
  sessionStorage.setItem(NOTIF_WELCOME_PING_KEY, "1");
  return true;
};

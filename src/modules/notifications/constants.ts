export const NOTIFICATION_SOUND_URL = "/assets/sounds/pop-notification.wav";

/** Minimum gap between notification chimes when several arrive at once. */
export const NOTIFICATION_SOUND_DEBOUNCE_MS = 800;

/** Wait for refetch to settle before showing in-app previews (same burst). */
export const NOTIFICATION_TOAST_DEBOUNCE_MS = 800;

/** Auto-dismiss each in-app preview after this duration. */
export const NOTIFICATION_PREVIEW_DURATION_MS = 6000;

/** Max in-app preview cards stacked at once (oldest dropped when exceeded). */
export const NOTIFICATION_PREVIEW_MAX_STACK = 3;

/** Delay between each preview in a burst so cards slide in left→right one by one. */
export const NOTIFICATION_PREVIEW_ENTER_STAGGER_MS = 110;

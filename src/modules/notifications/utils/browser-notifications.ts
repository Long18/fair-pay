import { Notification } from "../types";

/**
 * Warm up audio context on first user interaction.
 * Desktop browsers block audio.play() until user has interacted with the page.
 * This creates a silent audio context on first click/touch/keydown to unlock playback.
 */
let audioWarmedUp = false;
const warmUpAudio = () => {
  if (audioWarmedUp) return;
  audioWarmedUp = true;
  try {
    const ctx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    const audio = new Audio();
    audio.volume = 0;
    audio.play().catch(() => {});
  } catch {
    // Audio context not supported
  }
};

if (typeof window !== "undefined") {
  const events = ["click", "touchstart", "keydown"] as const;
  const handler = () => {
    warmUpAudio();
    events.forEach((e) => document.removeEventListener(e, handler));
  };
  events.forEach((e) => document.addEventListener(e, handler, { once: true }));
}

/**
 * Send a browser notification if the tab is not focused and permission is granted.
 */
export const sendBrowserNotification = (notification: Notification) => {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    window.Notification.permission !== "granted" ||
    document.hasFocus()
  ) {
    return;
  }

  try {
    const n = new window.Notification(notification.title, {
      body: notification.message,
      icon: "/favicon.ico",
      tag: notification.id,
    });

    if (notification.link) {
      n.onclick = () => {
        window.focus();
        window.location.href = notification.link!;
        n.close();
      };
    }
  } catch {
    // Browser notification not supported in this context
  }
};

/**
 * Request browser notification permission (once, on first use).
 */
export const requestNotificationPermission = () => {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    window.Notification.permission !== "default"
  ) {
    return;
  }
  window.Notification.requestPermission().catch(() => {});
};

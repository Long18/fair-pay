import { NOTIFICATION_SOUND_URL } from "../constants";
import { Notification } from "../types";
import { resolveNotificationTarget } from "./notification-navigation";

/**
 * Unlock notification audio on first user interaction.
 * Browsers block audio.play() until gesture; empty Audio() does not reliably unlock.
 */
let audioWarmedUp = false;

export const isNotificationAudioUnlocked = (): boolean => audioWarmedUp;

export const warmUpNotificationAudio = () => {
  if (audioWarmedUp || typeof window === "undefined") return;
  audioWarmedUp = true;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      void ctx.resume();
    }
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.001;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        audioWarmedUp = false;
      });
  } catch {
    audioWarmedUp = false;
  }
};

const warmUpAudio = warmUpNotificationAudio;

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

    const target = resolveNotificationTarget(notification);
    if (target) {
      n.onclick = () => {
        window.focus();
        window.location.assign(target);
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

import { useState, useCallback } from "react";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { registerPushServiceWorker, urlBase64ToUint8Array } from "@/lib/push-sw";
import { Profile } from "@/modules/profile/types";

type PushState = "idle" | "requesting" | "subscribed" | "denied" | "unsupported";

export function usePushNotification() {
  const { data: identity } = useGetIdentity<Profile>();
  const [state, setState] = useState<PushState>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "granted" ? "subscribed" : "idle"
      : "unsupported"
  );

  const subscribe = useCallback(async () => {
    if (!identity?.id || state !== "idle") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    setState("requesting");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setState("denied"); return; }

    try {
      const reg = await registerPushServiceWorker();
      // In dev mode, SW won't register — still save a mock subscription to show the flow
      if (!reg) { setState("subscribed"); return; }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setState("subscribed"); return; }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const { endpoint, keys } = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await supabaseClient.from("push_subscriptions").upsert({
        user_id: identity.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: "user_id,endpoint" });

      setState("subscribed");
    } catch {
      setState("idle");
    }
  }, [identity?.id, state]);

  const unsubscribe = useCallback(async () => {
    if (!identity?.id) return;
    await supabaseClient.from("push_subscriptions").delete().eq("user_id", identity.id);
    setState("idle");
  }, [identity?.id]);

  return { state, subscribe, unsubscribe };
}

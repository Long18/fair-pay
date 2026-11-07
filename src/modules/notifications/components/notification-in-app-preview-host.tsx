import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGo } from "@refinedev/core";
import { navigateToNotificationTarget } from "../utils/notification-navigation";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  NOTIFICATION_PREVIEW_EVENT,
  type NotificationPreviewDetail,
} from "../utils/notification-preview-events";
import { openNotificationPanel } from "../utils/notification-panel-open";
import {
  NOTIFICATION_PREVIEW_DURATION_MS,
  NOTIFICATION_PREVIEW_MAX_STACK,
} from "../constants";
import {
  NotificationPreviewStack,
  type NotificationPreviewStackItem,
} from "./notification-preview-stack";

type StackItem = NotificationPreviewStackItem;

export function NotificationInAppPreviewHost() {
  const go = useGo();
  const reducedMotion = useReducedMotion();
  const [stack, setStack] = useState<StackItem[]>([]);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [hostIsMobile, setHostIsMobile] = useState(false);

  const clearDismissTimer = useCallback((key: string) => {
    const timer = dismissTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(key);
    }
  }, []);

  const removeFromStack = useCallback(
    (key: string) => {
      clearDismissTimer(key);
      setStack((current) => current.filter((item) => item.key !== key));
    },
    [clearDismissTimer],
  );

  const scheduleDismiss = useCallback(
    (key: string) => {
      clearDismissTimer(key);
      const timer = setTimeout(() => removeFromStack(key), NOTIFICATION_PREVIEW_DURATION_MS);
      dismissTimersRef.current.set(key, timer);
    },
    [clearDismissTimer, removeFromStack],
  );

  const prependPreview = useCallback(
    (detail: NotificationPreviewDetail) => {
      const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${detail.notification.id}-${Date.now()}`;

      const entry: StackItem = {
        ...detail,
        key,
        reducedMotion: detail.reducedMotion || reducedMotion,
      };
      setHostIsMobile(detail.isMobile);

      setStack((current) => {
        const rest = current.filter((item) => item.notification.id !== detail.notification.id);
        return [entry, ...rest].slice(0, NOTIFICATION_PREVIEW_MAX_STACK);
      });

      scheduleDismiss(key);
    },
    [reducedMotion, scheduleDismiss],
  );

  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreviewDetail>).detail;
      if (!detail?.notification) return;
      prependPreview(detail);
    };

    window.addEventListener(NOTIFICATION_PREVIEW_EVENT, onPreview);
    const timers = dismissTimersRef.current;
    return () => {
      window.removeEventListener(NOTIFICATION_PREVIEW_EVENT, onPreview);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [prependPreview]);

  const handleActivate = (preview: StackItem) => {
    if (preview.viewLink) {
      navigateToNotificationTarget(go, preview.viewLink);
    } else {
      openNotificationPanel();
    }
    removeFromStack(preview.key);
  };

  if (typeof document === "undefined") return null;

  const isMobile = stack[0]?.isMobile ?? hostIsMobile;
  const positionClass = isMobile
    ? "left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] items-center"
    : "left-4 md:left-6 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] items-start";

  const ordered = [...stack].reverse();
  const motionReduced =
    reducedMotion || ordered.some((item) => item.reducedMotion);

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed z-[100] w-full max-w-sm",
        positionClass,
      )}
      aria-live="polite"
      aria-relevant="additions"
    >
      <NotificationPreviewStack
        items={ordered}
        reducedMotion={motionReduced}
        onActivate={handleActivate}
        onDismiss={removeFromStack}
      />
    </div>,
    document.body,
  );
}

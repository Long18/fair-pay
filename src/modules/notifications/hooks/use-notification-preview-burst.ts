import { useCallback, useEffect, useRef } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Profile } from "@/modules/profile/types";
import { Notification } from "../types";
import {
  NOTIFICATION_SOUND_DEBOUNCE_MS,
  NOTIFICATION_TOAST_DEBOUNCE_MS,
} from "../constants";
import { useNotificationSound } from "./use-notification-sound";
import { diffNewUnreadIds } from "../utils/new-unread-delta";
import { showRichNotificationPreview } from "../utils/show-rich-notification-preview";
import {
  isNotificationAudioUnlocked,
} from "../utils/browser-notifications";
import { tryConsumeWelcomePing } from "../utils/welcome-ping";

function mapNotifications(rows: Notification[]): Notification[] {
  return rows.map((n) => {
    const profile = (n as unknown as Record<string, unknown>).profiles as
      | { full_name?: string; avatar_url?: string }
      | null;
    return {
      ...n,
      actor_name: profile?.full_name ?? undefined,
      actor_avatar: profile?.avatar_url ?? undefined,
    };
  });
}

export function useNotificationPreviewBurst(options: { enabled: boolean }) {
  const { data: identity } = useGetIdentity<Profile>();
  const { play: playSound } = useNotificationSound();
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const isMobileRef = useRef(isMobile);
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const playSoundRef = useRef(playSound);
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  const { query } = useList<Notification>({
    resource: "notifications",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
    meta: {
      select: "*, profiles!notifications_actor_id_fkey(full_name, avatar_url)",
    },
    queryOptions: {
      enabled: options.enabled && !!identity?.id,
    },
  });

  const notifications = mapNotifications(query.data?.data ?? []);
  const isLoading = query.isLoading;

  const knownNotificationIdsRef = useRef<Set<string> | null>(null);
  const lastSoundPlayedAtRef = useRef(0);
  const initialWelcomePingCheckedRef = useRef(false);
  const pendingToastIdsRef = useRef<string[]>([]);
  const toastBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (isLoading || initialWelcomePingCheckedRef.current) return;
    initialWelcomePingCheckedRef.current = true;

    const unreadOnFirstFetch = notifications.filter((n) => !n.is_read).length;
    if (unreadOnFirstFetch <= 0) return;
    if (!tryConsumeWelcomePing()) return;

    if (isNotificationAudioUnlocked()) {
      lastSoundPlayedAtRef.current = Date.now();
      playSoundRef.current();
    }
  }, [isLoading, notifications]);

  const playNotificationSoundThrottled = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundPlayedAtRef.current < NOTIFICATION_SOUND_DEBOUNCE_MS) {
      return;
    }
    lastSoundPlayedAtRef.current = now;
    playSoundRef.current();
  }, []);

  const flushPendingNotificationToasts = useCallback(() => {
    toastBurstTimerRef.current = null;
    const burstIds = pendingToastIdsRef.current;
    pendingToastIdsRef.current = [];
    if (burstIds.length === 0) return;

    showRichNotificationPreview({
      notifications: notificationsRef.current,
      burstIds,
      isMobile: isMobileRef.current,
      reducedMotion: reducedMotionRef.current,
    });
  }, []);

  const queueNotificationToastBurst = useCallback(
    (newIds: readonly string[]) => {
      if (newIds.length === 0) return;
      pendingToastIdsRef.current.push(...newIds);
      if (toastBurstTimerRef.current) {
        clearTimeout(toastBurstTimerRef.current);
      }
      toastBurstTimerRef.current = setTimeout(
        flushPendingNotificationToasts,
        NOTIFICATION_TOAST_DEBOUNCE_MS,
      );
    },
    [flushPendingNotificationToasts],
  );

  useEffect(() => {
    return () => {
      if (toastBurstTimerRef.current) {
        clearTimeout(toastBurstTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    const delta = diffNewUnreadIds(knownNotificationIdsRef.current, unreadIds);
    knownNotificationIdsRef.current = new Set(unreadIds);

    if (delta.kind === "initial") return;

    if (delta.newIds.length > 0) {
      playNotificationSoundThrottled();
      queueNotificationToastBurst(delta.newIds);
    }
  }, [
    notifications,
    isLoading,
    playNotificationSoundThrottled,
    queueNotificationToastBurst,
  ]);
}

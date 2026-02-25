import { useEffect, useState, useCallback, useRef } from "react";
import { useGetIdentity, useList, useUpdate, useGo } from "@refinedev/core";
import { toast } from "sonner";
import { supabaseClient } from "@/utility";
import { Profile } from "@/modules/profile/types";
import { Notification } from "../types";
import { NotificationToast } from "../components/notification-toast";
import { useNotificationSound } from "./use-notification-sound";
import { formatDistanceToNow } from "date-fns";

/**
 * Send a browser notification if the tab is not focused and permission is granted.
 */
const sendBrowserNotification = (notification: Notification) => {
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
      tag: notification.id, // Prevents duplicate native notifications
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
const requestNotificationPermission = () => {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    window.Notification.permission !== "default"
  ) {
    return;
  }
  window.Notification.requestPermission().catch(() => {});
};

export const useNotifications = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const [unreadCount, setUnreadCount] = useState(0);
  const { play: playSound } = useNotificationSound();
  const permissionRequested = useRef(false);

  // Request browser notification permission once
  useEffect(() => {
    if (identity?.id && !permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermission();
    }
  }, [identity?.id]);

  const { query } = useList<Notification>({
    resource: "notifications",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    pagination: {
      pageSize: 50,
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const updateMutation = useUpdate();

  const notifications = query.data?.data || [];
  const isLoading = query.isLoading;

  useEffect(() => {
    if (notifications.length > 0) {
      const count = notifications.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

  // Realtime subscription via postgres_changes
  // Requires: notifications in supabase_realtime publication + REPLICA IDENTITY FULL
  useEffect(() => {
    if (!identity?.id) return;

    const channel = supabaseClient
      .channel(`notifications:${identity.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${identity.id}`,
        },
        (payload) => {
          console.log("[Notifications] Realtime INSERT received:", payload);
          const newNotification = payload.new as Notification;

          // Refetch to update React Query cache
          query.refetch();

          // Play sound
          playSound();

          // Show in-app toast
          toast(
            () => NotificationToast({ notification: newNotification }),
            {
              duration: 5000,
              action: newNotification.link
                ? {
                    label: "View",
                    onClick: () => go({ to: newNotification.link! }),
                  }
                : undefined,
            }
          );

          // Browser notification when tab is not focused
          sendBrowserNotification(newNotification);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${identity.id}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe((status, err) => {
        console.log("[Notifications] Realtime subscription status:", status, err ?? "");
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [identity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(
    (notificationId: string) => {
      updateMutation.mutate({
        resource: "notifications",
        id: notificationId,
        values: {
          is_read: true,
        },
      });
    },
    [updateMutation]
  );

  const markAllAsRead = useCallback(() => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    unreadNotifications.forEach((notification) => {
      updateMutation.mutate({
        resource: "notifications",
        id: notification.id,
        values: {
          is_read: true,
        },
      });
    });
  }, [notifications, updateMutation]);

  const getTimeAgo = useCallback((createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    getTimeAgo,
    refetch: query.refetch,
  };
};

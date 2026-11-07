import { useEffect, useState, useCallback, useRef } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import { useInstantUpdate } from "@/hooks/use-instant-mutation";
import { supabaseClient } from "@/utility";
import { Profile } from "@/modules/profile/types";
import { Notification } from "../types";
import {
  sendBrowserNotification,
  requestNotificationPermission,
} from "../utils/browser-notifications";
import { formatDistanceToNow } from "date-fns";

export const useNotifications = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const [unreadCount, setUnreadCount] = useState(0);
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
    meta: {
      select: "*, profiles!notifications_actor_id_fkey(full_name, avatar_url)",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const updateMutation = useInstantUpdate();

  // Stable ref for query.refetch — avoids stale closure in realtime effect
  const refetchRef = useRef(query.refetch);
  useEffect(() => {
    refetchRef.current = query.refetch;
  }, [query.refetch]);

  // Map joined profile data to flat actor fields
  const notifications: Notification[] = (query.data?.data || []).map((n) => {
    const profile = (n as unknown as Record<string, unknown>).profiles as { full_name?: string; avatar_url?: string } | null;
    return {
      ...n,
      actor_name: profile?.full_name ?? undefined,
      actor_avatar: profile?.avatar_url ?? undefined,
    };
  });
  const isLoading = query.isLoading;

  useEffect(() => {
    if (notifications.length > 0) {
      const count = notifications.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

  // Realtime subscription via postgres_changes + broadcast fallback
  // postgres_changes: works for trigger-based inserts (expense_added, friend_request, etc.)
  // broadcast: works for RPC-based inserts (comment, reaction, mention) via broadcast_notification_insert trigger
  useEffect(() => {
    if (!identity?.id) return;

    // Deduplicate: track recently processed notification IDs to avoid double-processing
    // when both postgres_changes and broadcast fire for the same insert
    const recentIds = new Set<string>();
    const DEDUP_TTL = 5000; // 5 seconds

    const handleNewNotification = (raw: Notification) => {
      // Deduplicate
      if (recentIds.has(raw.id)) return;
      recentIds.add(raw.id);
      setTimeout(() => recentIds.delete(raw.id), DEDUP_TTL);

      // Refetch via ref to always use the latest React Query refetch function
      refetchRef.current();

      // Browser notification when tab is not focused
      sendBrowserNotification(raw);
    };

    const channel = supabaseClient
      .channel(`notifications:${identity.id}`, {
        config: { private: true },
      })
      // Primary: postgres_changes (works for trigger-based notification inserts)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${identity.id}`,
        },
        (payload) => {
          handleNewNotification(payload.new as Notification);
        }
      )
      // Fallback: broadcast from broadcast_notification_insert() trigger
      // This catches RPC-based inserts that postgres_changes may miss
      .on(
        "broadcast",
        { event: "INSERT" },
        (payload) => {
          const record = payload.payload?.record ?? payload.payload?.new_record;
          if (record && record.user_id === identity.id) {
            handleNewNotification(record as Notification);
          }
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
          refetchRef.current();
        }
      )
      .subscribe();

    // Polling fallback: refetch every 30s to catch any notifications
    // that slip through both postgres_changes and broadcast channels.
    const pollInterval = setInterval(() => {
      refetchRef.current();
    }, 30_000);

    return () => {
      clearInterval(pollInterval);
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
        meta: { undoConfig: { enabled: false } },
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
        meta: { undoConfig: { enabled: false } },
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

import { useEffect, useState, useCallback } from "react";
import { useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { supabaseClient } from "@/utility";
import { Profile } from "@/modules/profile/types";
import { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";

export const useNotifications = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const [unreadCount, setUnreadCount] = useState(0);

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
        () => {
          query.refetch();
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
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [identity?.id, query]);

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

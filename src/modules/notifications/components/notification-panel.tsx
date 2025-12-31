import { useGo } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import { useState } from "react";

import { BellIcon } from "@/components/ui/icons";
export const NotificationPanel = () => {
  const go = useGo();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const displayNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 dark:bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <BellIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                No new notifications
              </p>
              <p className="text-xs text-muted-foreground text-center">
                You're all caught up! Check back later.
              </p>
            </div>
          ) : (
            displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={() => {
                go({ to: "/notifications" });
                setOpen(false);
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

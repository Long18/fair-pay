import { useGo } from "@refinedev/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
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
  const isMobile = useIsMobile();

  const displayNotifications = notifications.slice(0, 8);

  // On mobile, bell just navigates to /notifications page
  if (isMobile) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => go({ to: "/notifications" })}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 dark:bg-red-600 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  // Desktop: Facebook-style left-aligned popover panel
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-accent"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <BellIcon className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 dark:bg-red-600 text-[10px] font-bold text-white animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={12}
        className="w-[420px] p-0 rounded-xl shadow-xl border border-border/60 bg-popover flex flex-col max-h-[560px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-md"
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
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-4">
                <BellIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No new notifications
              </p>
              <p className="text-xs text-muted-foreground text-center">
                You&apos;re all caught up! Check back later.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer — always outside scroll, never overlapped */}
        {displayNotifications.length > 0 && (
          <div className="border-t border-border/40 p-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg"
              onClick={() => {
                go({ to: "/notifications" });
                setOpen(false);
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

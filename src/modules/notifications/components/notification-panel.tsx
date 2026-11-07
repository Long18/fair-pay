import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import { IndicatorBadge } from "@/components/ui/indicator-badge";
import { BellIcon } from "@/components/ui/icons";
import { NOTIFICATION_PANEL_OPEN_EVENT } from "../utils/notification-panel-open";

const BELL_LOOP_REPEAT_DELAY_S = 2.5;

export const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();

  const prevUnreadRef = useRef<number | null>(null);
  const [countIncreased, setCountIncreased] = useState(false);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  const bellAttentionLoop = unreadCount > 0 && !open && !reducedMotion;

  useEffect(() => {
    const openFromToast = () => handleOpenChange(true);
    window.addEventListener(NOTIFICATION_PANEL_OPEN_EVENT, openFromToast);
    return () =>
      window.removeEventListener(NOTIFICATION_PANEL_OPEN_EVENT, openFromToast);
  }, [handleOpenChange]);

  useEffect(() => {
    const prev = prevUnreadRef.current;
    if (prev === null) {
      prevUnreadRef.current = unreadCount;
      return;
    }
    prevUnreadRef.current = unreadCount;

    if (unreadCount <= prev || unreadCount === 0 || reducedMotion) {
      return;
    }

    const pulseOn = window.setTimeout(() => setCountIncreased(true), 0);
    const pulseOff = window.setTimeout(() => setCountIncreased(false), 900);

    return () => {
      clearTimeout(pulseOn);
      clearTimeout(pulseOff);
    };
  }, [unreadCount, reducedMotion]);

  const displayNotifications = notifications.slice(0, 50);

  const badgeAttention = bellAttentionLoop || countIncreased;

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      ripple={false}
      className="relative size-9 overflow-visible rounded-full hover:bg-accent"
      data-onboarding-target="notification-panel"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <motion.span
        className="inline-flex"
        aria-hidden
        animate={
          bellAttentionLoop
            ? { rotate: [0, -14, 12, -8, 6, 0] }
            : { rotate: 0 }
        }
        transition={
          bellAttentionLoop
            ? {
                duration: 0.48,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: BELL_LOOP_REPEAT_DELAY_S,
              }
            : { duration: 0.2 }
        }
      >
        <BellIcon className="size-4 md:size-5" />
      </motion.span>
      <IndicatorBadge
        count={unreadCount}
        attention={badgeAttention}
        outline
        color="danger"
      />
    </Button>
  );

  const header = (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
      <h3 className="text-lg font-bold text-foreground">Notifications</h3>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            tap();
            markAllAsRead();
          }}
        >
          Mark all as read
        </Button>
      )}
    </div>
  );

  const notificationList = isLoading ? (
    <div className="flex flex-col gap-1 p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
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
        No notifications yet
      </p>
      <p className="text-xs text-muted-foreground text-center">
        You&apos;re all caught up!
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
  );

  // Mobile: Bottom drawer (Instagram-style)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{bellButton}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerTitle className="sr-only">Notifications</DrawerTitle>
          {header}
          <ScrollArea className="flex-1 h-0 min-h-0">
            {notificationList}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Popover dropdown (Facebook-style)
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={12}
        className="w-[420px] p-0 rounded-xl shadow-xl border border-border/60 bg-popover flex flex-col max-h-[min(560px,calc(100vh-120px))] overflow-hidden"
      >
        {header}
        <ScrollArea className="flex-1 h-0 min-h-0">
          {notificationList}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

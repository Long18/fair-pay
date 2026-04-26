import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/user-display";
import { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";
import { getNotificationMeta } from "./notification-theme";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

export const NotificationItem = ({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) => {
  const go = useGo();
  const { tap } = useHaptics();
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  const handleClick = () => {
    tap();
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      go({ to: notification.link });
      onClose?.();
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-4 py-3 cursor-pointer transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        !notification.is_read
          ? "bg-primary/5 hover:bg-primary/8 dark:bg-primary/10 dark:hover:bg-primary/15"
          : "hover:bg-muted/50"
      )}
      onClick={handleClick}
      aria-label={`${notification.title}: ${notification.message}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with type badge overlay */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            {notification.actor_avatar ? (
              <AvatarImage
                src={notification.actor_avatar}
                alt={notification.actor_name || "User"}
              />
            ) : null}
            <AvatarFallback className="text-xs font-medium bg-muted">
              {getInitials(notification.actor_name)}
            </AvatarFallback>
          </Avatar>
          {/* Small type icon badge at bottom-right of avatar */}
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex items-center justify-center",
              "h-5 w-5 rounded-full border-2 border-popover",
              meta.colors.surface,
              meta.colors.border
            )}
          >
            <Icon className={cn("h-2.5 w-2.5", meta.colors.icon)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2 leading-snug">
            <span className="font-semibold">{notification.actor_name || "Someone"}</span>
            {" "}
            <span className="text-muted-foreground">{notification.message}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "text-xs",
                !notification.is_read ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Unread dot */}
        {!notification.is_read && (
          <div className="flex-shrink-0 mt-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </button>
  );
};

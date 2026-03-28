import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Notification } from "../types";
import { getNotificationMeta } from "./notification-theme";

interface NotificationToastProps {
  notification: Notification;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

export const NotificationToast = ({ notification }: NotificationToastProps) => {
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 w-full">
      {/* Avatar with type badge */}
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
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug line-clamp-2">
          <span className="font-semibold">{notification.actor_name || "Someone"}</span>
          {" "}
          <span className="text-muted-foreground">{notification.message}</span>
        </p>
        <p className="text-xs text-primary font-medium mt-1">Just now</p>
      </div>
    </div>
  );
};

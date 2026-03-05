import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";
import {
  ReceiptIcon,
  HandCoinsIcon,
  UserPlusIcon,
  UsersIcon,
  Trash2Icon,
  PencilIcon,
  LogInIcon,
  UserCheckIcon,
  XIcon,
  MessageSquareIcon,
  AtSignIcon,
} from "@/components/ui/icons";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

const getNotificationMeta = (type: Notification["type"]) => {
  switch (type) {
    case "expense_added":
      return { icon: ReceiptIcon, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" };
    case "payment_recorded":
      return { icon: HandCoinsIcon, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" };
    case "friend_request":
      return { icon: UserPlusIcon, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" };
    case "friend_accepted":
    case "added_to_group":
      return { icon: UsersIcon, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/40" };
    case "expense_updated":
      return { icon: PencilIcon, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/40" };
    case "expense_deleted":
      return { icon: Trash2Icon, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/40" };
    case "group_join_request":
      return { icon: LogInIcon, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/40" };
    case "group_join_approved":
      return { icon: UserCheckIcon, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" };
    case "group_join_rejected":
      return { icon: XIcon, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/40" };
    case "expense_comment":
      return { icon: MessageSquareIcon, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/40" };
    case "comment_mention":
      return { icon: AtSignIcon, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" };
    case "comment_reply":
      return { icon: MessageSquareIcon, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/40" };
    case "comment_reaction":
      return { icon: MessageSquareIcon, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/40" };
    default:
      return { icon: ReceiptIcon, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-900/40" };
  }
};

/** Get initials from a name for avatar fallback */
const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

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
              meta.bg
            )}
          >
            <Icon className={cn("h-2.5 w-2.5", meta.color)} />
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

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Notification } from "../types";
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

const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  expense_added: { icon: ReceiptIcon, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" },
  payment_recorded: { icon: HandCoinsIcon, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" },
  friend_request: { icon: UserPlusIcon, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" },
  friend_accepted: { icon: UsersIcon, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/40" },
  added_to_group: { icon: UsersIcon, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/40" },
  expense_updated: { icon: PencilIcon, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/40" },
  expense_deleted: { icon: Trash2Icon, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/40" },
  group_join_request: { icon: LogInIcon, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/40" },
  group_join_approved: { icon: UserCheckIcon, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" },
  group_join_rejected: { icon: XIcon, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/40" },
  comment_mention: { icon: AtSignIcon, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" },
  comment_reply: { icon: MessageSquareIcon, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/40" },
  comment_reaction: { icon: MessageSquareIcon, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/40" },
};

const defaultMeta = { icon: ReceiptIcon, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-900/40" };

interface NotificationToastProps {
  notification: Notification;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

export const NotificationToast = ({ notification }: NotificationToastProps) => {
  const meta = iconMap[notification.type] ?? defaultMeta;
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
            meta.bg
          )}
        >
          <Icon className={cn("h-2.5 w-2.5", meta.color)} />
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

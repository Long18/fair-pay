import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";

import { ReceiptIcon, HandCoinsIcon, UserPlusIcon, UsersIcon, Trash2Icon, PencilIcon } from "@/components/ui/icons";
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

const getNotificationMeta = (type: Notification['type']) => {
  switch (type) {
    case 'expense_added':
      return {
        icon: ReceiptIcon,
        iconColor: 'text-purple-600',
        iconBgColor: 'bg-purple-100',
      };
    case 'payment_recorded':
      return {
        icon: HandCoinsIcon,
        iconColor: 'text-green-600',
        iconBgColor: 'bg-green-100',
      };
    case 'friend_request':
      return {
        icon: UserPlusIcon,
        iconColor: 'text-blue-600',
        iconBgColor: 'bg-blue-100',
      };
    case 'friend_accepted':
    case 'added_to_group':
      return {
        icon: UsersIcon,
        iconColor: 'text-indigo-600',
        iconBgColor: 'bg-indigo-100',
      };
    case 'expense_updated':
      return {
        icon: PencilIcon,
        iconColor: 'text-orange-600',
        iconBgColor: 'bg-orange-100',
      };
    case 'expense_deleted':
      return {
        icon: Trash2Icon,
        iconColor: 'text-red-600',
        iconBgColor: 'bg-red-100',
      };
    default:
      return {
        icon: ReceiptIcon,
        iconColor: 'text-gray-600',
        iconBgColor: 'bg-gray-100',
      };
  }
};

export const NotificationItem = ({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) => {
  const go = useGo();
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    if (notification.link) {
      go({ to: notification.link });
      onClose?.();
    }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0",
        !notification.is_read ? "bg-blue-50/50 hover:bg-blue-100/50" : "hover:bg-muted/50"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator dot */}
        <div className="flex-shrink-0 mt-1">
          {!notification.is_read ? (
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 rounded-md p-2 flex items-center justify-center",
            meta.iconBgColor
          )}
        >
          <Icon className={cn("h-4 w-4", meta.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {notification.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

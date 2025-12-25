export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_recorded'
  | 'friend_request'
  | 'friend_accepted'
  | 'added_to_group';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationWithMeta extends Notification {
  timeAgo: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBgColor: string;
}

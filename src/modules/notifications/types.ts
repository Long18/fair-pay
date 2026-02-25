export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_recorded'
  | 'friend_request'
  | 'friend_accepted'
  | 'added_to_group'
  | 'group_join_request'
  | 'group_join_approved'
  | 'group_join_rejected'
  | 'comment_mention'
  | 'comment_reply'
  | 'comment_reaction';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  /** Joined from profiles via actor_id */
  actor_name?: string;
  actor_avatar?: string;
}

export interface NotificationWithMeta extends Notification {
  timeAgo: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBgColor: string;
}

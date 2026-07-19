export interface NotificationRow {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Raw row shape from notifications + profiles join before UI mapping. */
export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at: string;
  profiles?: { full_name?: string | null; avatar_url?: string | null } | null;
};

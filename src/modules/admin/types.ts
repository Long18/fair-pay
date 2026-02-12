export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalPayments: number;
  activeUsersLast7Days: number;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  action_type: string;
  table_name?: string;
  entity_type?: string;
  entity_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

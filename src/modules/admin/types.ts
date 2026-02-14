export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalPayments: number;
  activeUsersLast7Days: number;
  // Previous-period data for trend calculation
  prevTotalUsers: number;
  prevTotalGroups: number;
  currExpenses30d: number;
  prevExpenses30d: number;
  currPayments30d: number;
  prevPayments30d: number;
  prevActiveUsers7d: number;
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
  source: "audit_logs" | "audit_trail";
  timestamp: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  table_name: string | null;
  entity_type: string | null;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditStats {
  total: number;
  inserts: number;
  updates: number;
  deletes: number;
  today: number;
  this_week: number;
  by_table: Array<{ name: string; count: number }>;
  by_actor: Array<{ name: string; count: number }>;
}

export interface AuditFilterOptions {
  tables: string[];
  action_types: string[];
  actors: Array<{ id: string; name: string }>;
}

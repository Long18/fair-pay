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
  journey_tracking_ignored: boolean;
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

export interface UserTrackingAggregateRow {
  name: string;
  count: number;
}

export interface UserTrackingOverview {
  user_id: string;
  total_sessions: number;
  total_events: number;
  unique_pages: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  latest_entry_link: string | null;
  top_sources: UserTrackingAggregateRow[];
  top_pages: UserTrackingAggregateRow[];
  top_ctas: UserTrackingAggregateRow[];
  recent_flows: UserTrackingAggregateRow[];
}

export interface UserTrackingSessionRow {
  id: string;
  anonymous_id: string;
  user_id: string | null;
  started_at: string;
  last_seen_at: string;
  landing_path: string;
  landing_referrer: string | null;
  landing_source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  entry_link: string;
  device_type: string | null;
  locale: string | null;
  event_count: number;
}

export interface UserTrackingEventRow {
  id: string;
  session_id: string;
  user_id: string | null;
  anonymous_id: string;
  event_name: string;
  event_category: string;
  page_path: string;
  target_type: string | null;
  target_key: string | null;
  flow_name: string | null;
  step_name: string | null;
  referrer_path: string | null;
  properties: Record<string, unknown>;
  occurred_at: string;
}

export interface PaginatedAdminResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface JourneyGraphNode {
  page_path: string;
  visit_count: number;
  last_visited_at: string;
  event_types: string[];
  avg_duration_seconds: number | null;
}

export interface JourneyGraphEdge {
  source: string;
  target: string;
  frequency: number;
}

export interface JourneyGraphResponse {
  nodes: JourneyGraphNode[];
  edges: JourneyGraphEdge[];
}

export interface DeleteTrackingResponse {
  success: boolean;
  deleted_events: number;
  deleted_sessions: number;
}

// ─── API Catalog Types ───────────────────────────────────────────────────────
// Shared types for the Admin API Docs console.
// DO NOT import these from outside `src/modules/admin/api-docs/`.

export type ApiKind = 'http' | 'rpc';

export type ApiAuthLevel = 'public' | 'authenticated' | 'admin' | 'service_role';

export type ApiRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** active = confirmed in use; legacy = older, may be unused; unverified = discovered from SQL only */
export type ApiEntryStatus = 'active' | 'legacy' | 'unverified';

/** How this entry can be executed from the console */
export type ApiCallability = 'direct_http' | 'direct_rpc' | 'proxy_admin' | 'disabled';

/** Where this entry was discovered */
export type ApiProvenance = 'migration' | 'baseline' | 'dump' | 'code' | 'manual';

export interface ApiParamSpec {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  example?: unknown;
  description?: string;
}

export interface ApiResponseExample {
  status: number;
  description?: string;
  body: unknown;
}

export interface ApiCatalogEntry {
  /** Stable unique ID — slug of path or function name */
  id: string;
  kind: ApiKind;
  name: string;
  /** HTTP method (HTTP entries only) */
  method?: string;
  /** URL path (HTTP entries only) */
  path?: string;
  /** Supabase RPC function name (RPC entries only) */
  function_name?: string;
  /** Source file paths (relative to project root) */
  source_files: string[];
  auth_level: ApiAuthLevel;
  roles_allowed: string[];
  callability: ApiCallability;
  risk: ApiRiskLevel;
  /** True if a `.rpc("name")` call is found in src/ */
  used_in_code: boolean;
  status: ApiEntryStatus;
  tags: string[];
  summary: string;
  description?: string;
  params: ApiParamSpec[];
  request_body_schema?: Record<string, unknown>;
  response_examples: ApiResponseExample[];
  provenance: ApiProvenance[];
}

// ─── Execution types ─────────────────────────────────────────────────────────

export interface ApiExecutionRequest {
  operation_id: string;
  transport: 'http' | 'rpc';
  /** Full URL (http) or function name (rpc) */
  target: string;
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  rpc_args?: Record<string, unknown>;
  run_mode: ApiCallability;
}

export interface ApiExecutionResult {
  success: boolean;
  status: number;
  duration_ms: number;
  data?: unknown;
  error?: string;
  request_echo?: ApiExecutionRequest;
}

export interface ApiExecutionHistoryEntry {
  id: string;
  timestamp: string;
  operation_id: string;
  request: ApiExecutionRequest;
  result: ApiExecutionResult;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface ApiFilterState {
  search: string;
  kind: ApiKind | 'all';
  status: ApiEntryStatus | 'all';
  auth: ApiAuthLevel | 'all';
  risk: ApiRiskLevel | 'all';
  callable: 'all' | 'yes' | 'no';
  usedInCode: boolean | 'all';
  showAll: boolean; // false = only usedInCode entries
}

export const DEFAULT_FILTER_STATE: ApiFilterState = {
  search: '',
  kind: 'all',
  status: 'all',
  auth: 'all',
  risk: 'all',
  callable: 'all',
  usedInCode: 'all', // Full catalog first
  showAll: true,
};

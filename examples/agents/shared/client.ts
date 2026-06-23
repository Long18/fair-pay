/**
 * Minimal HTTP client for FairPay Agent API.
 * No SDK dependency — uses native fetch.
 */

export interface MeResponse {
  id: string;
  email: string;
  full_name?: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
}

export interface GroupsResponse {
  groups: Group[];
}

export interface GroupMember {
  id: string; // group_members.id, NOT profiles.id
  display_name: string;
  email?: string;
}

export interface GroupMembersResponse {
  members: GroupMember[];
}

export interface DuplicateCheckRequest {
  group_id: string;
  amount_vnd: number; // integer VND
  description: string;
}

export interface DuplicateCheckMatch {
  id: string;
  description: string;
  amount_vnd: number;
  created_at: string;
  similarity_score: number;
}

export interface DuplicateCheckResponse {
  matches: DuplicateCheckMatch[];
}

export interface SplitItem {
  member_id: string; // Must use group_members.id, NOT profiles.id
  amount_vnd: number; // integer VND
}

export interface PreviewRequest {
  group_id: string;
  amount_vnd: number; // integer VND, total expense amount
  description: string;
  split_method: 'equal' | 'exact'; // 'equal' = divide equally, 'exact' = use split_items
  split_items?: SplitItem[]; // Required if split_method is 'exact'
  payment_method: 'direct' | 'settlement'; // 'direct' = P2P, 'settlement' = settle via group
  notes?: string;
}

export interface PreviewResponse {
  preview_id: string;
  preview_hash: string;
  rendered: {
    description: string;
    amount_vnd: number;
    splits: Array<{
      member_id: string;
      display_name: string;
      amount_vnd: number;
    }>;
  };
}

export interface OperationStatus {
  preview_id: string;
  status: 'created' | 'confirmed' | 'committed' | 'expired' | 'failed';
  created_at: string;
  expires_at: string;
  error_code?: string;
  error_message?: string;
}

export interface ConfirmRequest {
  preview_hash: string;
}

export interface ConfirmResponse {
  confirmation_id: string;
  preview_id: string;
}

export interface CommitRequest {
  preview_id: string;
  preview_hash: string;
  confirmation_id: string;
  idempotency_key: string; // UUID to ensure idempotency on retries
}

export interface CommitResponse {
  expense_id: string;
  splits: Array<{
    member_id: string;
    amount_vnd: number;
  }>;
}

export class FairPayClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `HTTP ${response.status}: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get authenticated user profile
   */
  async me(): Promise<MeResponse> {
    return this.request('GET', '/v1/me');
  }

  /**
   * List the actor's non-archived groups
   */
  async groups(): Promise<GroupsResponse> {
    return this.request('GET', '/v1/groups');
  }

  /**
   * List registered members of a group
   */
  async members(groupId: string): Promise<GroupMembersResponse> {
    return this.request('GET', `/v1/groups/${groupId}/members`);
  }

  /**
   * Check for likely duplicate expenses
   */
  async checkDuplicates(
    req: DuplicateCheckRequest
  ): Promise<DuplicateCheckResponse> {
    return this.request('POST', '/v1/expense-duplicate-checks', req);
  }

  /**
   * Create immutable expense preview.
   * Validates, computes splits, performs duplicate check, stores server-side.
   */
  async preview(req: PreviewRequest): Promise<PreviewResponse> {
    return this.request('POST', '/v1/expenses/preview', req);
  }

  /**
   * Poll operation status (preview created, confirmed, committed, or failed/expired)
   */
  async pollStatus(previewId: string): Promise<OperationStatus> {
    return this.request('GET', `/v1/operations/${previewId}`);
  }

  /**
   * Confirm preview (called by FairPay UI, not agents).
   * Agent may call for testing, but in production the user clicks "Confirm" in the app.
   */
  async confirm(previewId: string, req: ConfirmRequest): Promise<ConfirmResponse> {
    return this.request('POST', `/v1/previews/${previewId}/confirm`, req);
  }

  /**
   * Commit expense + splits atomically.
   * Called after user confirms preview in FairPay app.
   */
  async commit(req: CommitRequest): Promise<CommitResponse> {
    return this.request('POST', '/v1/expenses/commit', req);
  }
}

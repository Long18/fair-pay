// FairPay Agent API v1 client.
//
// The deployed transport path is:
//   https://<project>.supabase.co/functions/v1/fairpay-agent-api/v1/...
//
// This client owns the URL mapping between logical routes (/v1/me) and the
// deployed path — callers use logical routes only.
//
// IMPORTANT: confirmPreview() and commitExpense() are not exposed as AI model
// tools. They are called only by the FairPay UI confirmation flow.

import type {
  AgentMe,
  AgentGroupsResponse,
  AgentGroupMembersResponse,
  AgentDuplicateCheckRequest,
  AgentDuplicateCheckResponse,
  AgentPreviewRequest,
  AgentPreviewResponse,
  AgentConfirmRequest,
  AgentConfirmResponse,
  AgentCommitRequest,
  AgentCommitResponse,
  AgentOperationResponse,
  AgentApiError,
} from './types.js'
import { FairPayApiError, RateLimitError } from './errors.js'

export interface FairPayAgentClientOptions {
  /** Supabase project URL, e.g. https://abc123.supabase.co */
  supabaseUrl: string
  /** Async callback returning the current user's session token, or null. */
  getToken: () => Promise<string | null>
  /** Optional Supabase anon key. If omitted, no apikey header is sent. */
  anonKey?: string
  /** Optional fetch override (testing/Node environments). */
  fetch?: typeof fetch
}

export class FairPayAgentClient {
  private readonly supabaseUrl: string
  private readonly getToken: () => Promise<string | null>
  private readonly anonKey?: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: FairPayAgentClientOptions) {
    this.supabaseUrl = opts.supabaseUrl
    this.getToken = opts.getToken
    this.anonKey = opts.anonKey
    this.fetchImpl = opts.fetch ?? globalThis.fetch
  }

  private async tok(): Promise<string> {
    const t = await this.getToken()
    if (!t) {
      throw new FairPayApiError(401, { code: 'NO_SESSION', message: 'Not authenticated' })
    }
    return t
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const token = await this.tok()
    const url = `${this.supabaseUrl}/functions/v1/fairpay-agent-api${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(this.anonKey ? { apikey: this.anonKey } : {}),
      ...(extraHeaders ?? {}),
    }
    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errBody = (json as AgentApiError).error ?? { code: 'UNKNOWN', message: res.statusText }
      if (res.status === 429) {
        const retryAfterRaw = res.headers.get('Retry-After')
        const retryAfterSeconds = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) || 0 : 0
        throw new RateLimitError(errBody, retryAfterSeconds)
      }
      throw new FairPayApiError(res.status, errBody)
    }
    return json as T
  }

  // -- Read tools (exposed to AI model) ----------------------------------

  getMe(): Promise<AgentMe> {
    return this.request('GET', '/v1/me')
  }

  getGroups(): Promise<AgentGroupsResponse> {
    return this.request('GET', '/v1/groups')
  }

  getGroupMembers(groupId: string): Promise<AgentGroupMembersResponse> {
    return this.request('GET', `/v1/groups/${groupId}/members`)
  }

  checkDuplicates(body: AgentDuplicateCheckRequest): Promise<AgentDuplicateCheckResponse> {
    return this.request('POST', '/v1/expense-duplicate-checks', body)
  }

  previewExpense(body: AgentPreviewRequest): Promise<AgentPreviewResponse> {
    return this.request('POST', '/v1/expenses/preview', body)
  }

  pollOperation(operationId: string): Promise<AgentOperationResponse> {
    return this.request('GET', `/v1/operations/${operationId}`)
  }

  /**
   * Convenience: poll an operation until it leaves `pending`. Caller controls
   * the interval and timeout.
   */
  async waitForCompletion(
    operationId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<AgentOperationResponse> {
    const interval = opts.intervalMs ?? 1000
    const timeout = opts.timeoutMs ?? 30_000
    const start = Date.now()
    let op = await this.pollOperation(operationId)
    while (op.status === 'pending') {
      if (Date.now() - start > timeout) {
        throw new FairPayApiError(408, {
          code: 'POLL_TIMEOUT',
          message: `Operation ${operationId} did not complete within ${timeout}ms`,
        })
      }
      await new Promise((r) => setTimeout(r, interval))
      op = await this.pollOperation(operationId)
    }
    return op
  }

  // -- UI-only methods (NOT in model tool list) --------------------------

  /** Called only by the FairPay UI confirmation click handler. */
  confirmPreview(previewId: string, body: AgentConfirmRequest): Promise<AgentConfirmResponse> {
    return this.request('POST', `/v1/previews/${previewId}/confirm`, body)
  }

  /**
   * Called only by the FairPay UI controller, after confirmPreview succeeds.
   * Requires Idempotency-Key header.
   */
  commitExpense(body: AgentCommitRequest, idempotencyKey: string): Promise<AgentCommitResponse> {
    return this.request('POST', '/v1/expenses/commit', body, { 'idempotency-key': idempotencyKey })
  }
}

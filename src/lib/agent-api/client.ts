// FairPay Agent API v1 client.
//
// The deployed transport path is:
//   https://<project>.supabase.co/functions/v1/fairpay-agent-api/v1/...
//
// This client owns the URL mapping between logical routes (/v1/me) and the
// deployed path — callers use logical routes only.
//
// IMPORTANT: confirm() and commit() are not exposed as AI model tools.
// They are called only by the FairPay UI confirmation flow.

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
} from './types'

export type { AgentApiError } from './types'
export { isAgentApiError } from './types'

export class AgentApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  constructor(status: number, err: AgentApiError['error']) {
    super(err.message)
    this.name = 'AgentApiClientError'
    this.status = status
    this.code = err.code
    this.details = err.details
  }
}

async function request<T>(
  baseUrl: string,
  token: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  // Map logical /v1/... path → deployed function path
  const url = `${baseUrl}/functions/v1/fairpay-agent-api${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    ...(extraHeaders ?? {}),
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    const errBody = (json as AgentApiError).error ?? { code: 'UNKNOWN', message: res.statusText }
    throw new AgentApiClientError(res.status, errBody)
  }
  return json as T
}

export class AgentApiClient {
  constructor(
    private readonly supabaseUrl: string,
    private readonly getToken: () => Promise<string | null>
  ) {}

  private async tok(): Promise<string> {
    const t = await this.getToken()
    if (!t) throw new AgentApiClientError(401, { code: 'NO_SESSION', message: 'Not authenticated' })
    return t
  }

  private req<T>(method: 'GET' | 'POST', path: string, body?: unknown, extra?: Record<string, string>) {
    return this.tok().then((t) => request<T>(this.supabaseUrl, t, method, path, body, extra))
  }

  // -- Read tools (exposed to AI model) ----------------------------------

  getMe(): Promise<AgentMe> {
    return this.req('GET', '/v1/me')
  }

  getGroups(): Promise<AgentGroupsResponse> {
    return this.req('GET', '/v1/groups')
  }

  getGroupMembers(groupId: string): Promise<AgentGroupMembersResponse> {
    return this.req('GET', `/v1/groups/${groupId}/members`)
  }

  checkDuplicates(body: AgentDuplicateCheckRequest): Promise<AgentDuplicateCheckResponse> {
    return this.req('POST', '/v1/expense-duplicate-checks', body)
  }

  previewExpense(body: AgentPreviewRequest): Promise<AgentPreviewResponse> {
    return this.req('POST', '/v1/expenses/preview', body)
  }

  pollOperation(previewId: string): Promise<AgentOperationResponse> {
    return this.req('GET', `/v1/operations/${previewId}`)
  }

  // -- UI-only methods (NOT in model tool list) --------------------------

  /** Called only by the FairPay UI confirmation click handler. */
  confirmPreview(previewId: string, body: AgentConfirmRequest): Promise<AgentConfirmResponse> {
    return this.req('POST', `/v1/previews/${previewId}/confirm`, body)
  }

  /**
   * Called only by the FairPay UI controller, after confirmPreview succeeds.
   * Requires Idempotency-Key header.
   */
  commitExpense(body: AgentCommitRequest, idempotencyKey: string): Promise<AgentCommitResponse> {
    return this.req('POST', '/v1/expenses/commit', body, { 'idempotency-key': idempotencyKey })
  }
}

export class AgentApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AgentApiError'
  }
}

export class AgentApiTransportClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authorization: string,
    private readonly apiKey: string
  ) {}

  async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: this.authorization,
        apikey: this.apiKey,
        'content-type': 'application/json',
        'x-fairpay-agent-source': 'internal_mcp',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok) {
      const apiError = payload?.error as { code?: string; message?: string } | undefined
      throw new AgentApiError(
        response.status,
        apiError?.code ?? 'AGENT_API_ERROR',
        apiError?.message ?? `FairPay Agent API returned HTTP ${response.status}`
      )
    }
    return payload
  }
}

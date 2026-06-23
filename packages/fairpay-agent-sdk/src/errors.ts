// Error classes for @fairpay/agent-sdk.
//
// FairPayApiError is the base class for all API errors. RateLimitError is a
// specialized subclass that carries a retry-after duration, used when the
// server returns 429.

import type { AgentApiError } from './types.js'

/**
 * Base class for all FairPay Agent API errors.
 *
 * Carries the HTTP status code, the server-side error code, the human-readable
 * message, and optional structured details from the error envelope.
 */
export class FairPayApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, err: AgentApiError['error']) {
    super(err.message)
    this.name = 'FairPayApiError'
    this.status = status
    this.code = err.code
    this.details = err.details
  }
}

/**
 * Thrown on HTTP 429 responses. Carries the retry-after hint (in seconds)
 * from the `Retry-After` header so callers can back off appropriately.
 */
export class RateLimitError extends FairPayApiError {
  readonly retryAfterSeconds: number

  constructor(err: AgentApiError['error'], retryAfterSeconds: number) {
    super(429, err)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

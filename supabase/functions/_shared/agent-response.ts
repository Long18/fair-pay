// Shared typed response + body-parse helpers for Supabase Edge Functions.
//
// Each caller passes its own CORS headers so that the three agent functions
// keep their intentionally-different CORS strategies:
//   fairpay-agent-api          → fixed single origin  (APP_URL env var)
//   fairpay-agent-mcp          → origin allowlist
//   fairpay-external-agent-api → wildcard (*)
//
// content-type: application/json is always injected by these helpers;
// callers should NOT include it in the corsHeaders they pass in.

export type CorsHeaders = Record<string, string>

export function okJson(
  data: unknown,
  corsHeaders: CorsHeaders,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

export function errJson(
  status: number,
  code: string,
  message: string,
  corsHeaders: CorsHeaders,
  details?: unknown,
  traceId?: string,
): Response {
  const body: Record<string, unknown> = {}
  if (traceId) body.trace_id = traceId
  const errBody: Record<string, unknown> = { code, message }
  if (details !== undefined) errBody.details = details
  body.error = errBody
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

export type ParseBodyResult =
  | { value: unknown; error: null }
  | { value: null; error: Response }

/**
 * Read, size-check, and JSON-parse the request body.
 * Returns { value, error: null } on success or { value: null, error: Response } on failure.
 * Empty / whitespace-only bodies are treated as {} (no-op probe) rather than an error.
 */
export async function parseBody(
  req: Request,
  corsHeaders: CorsHeaders,
  maxBytes = 32_768,
): Promise<ParseBodyResult> {
  try {
    const text = await req.text()
    if (!text || text.trim() === '') return { value: {}, error: null }
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return {
        value: null,
        error: errJson(413, 'REQUEST_TOO_LARGE', 'Payload exceeds size limit', corsHeaders),
      }
    }
    return { value: JSON.parse(text), error: null }
  } catch {
    return {
      value: null,
      error: errJson(400, 'INVALID_JSON', 'Request body is not valid JSON', corsHeaders),
    }
  }
}

/** Returns a fresh RFC 4122 trace ID for end-to-end request correlation. */
export function newTraceId(): string {
  return crypto.randomUUID()
}

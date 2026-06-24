import { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAgentApiCorsHeaders } from './_cors.ts'

// requireAuth — shared auth guard used by all handlers.
// Returns either { user, error: null } or { user: null, error: Response }.
// Call at the top of every handler, return error immediately on failure.
export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: Response }

export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: errJson(401, 'UNAUTHENTICATED', 'Not authenticated') }
  }
  return { user, error: null }
}

export function okJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getAgentApiCorsHeaders(),
  })
}

export function errJson(
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const errBody: { code: string; message: string; details?: unknown } = { code, message }
  if (details !== undefined) errBody.details = details
  return new Response(JSON.stringify({ error: errBody }), {
    status,
    headers: getAgentApiCorsHeaders(),
  })
}

type ParseBodyResult =
  | { value: unknown; error: null }
  | { value: null; error: Response }

export async function parseBody(req: Request): Promise<ParseBodyResult> {
  try {
    const text = await req.text()
    if (!text || text.trim() === '') {
      return { value: {}, error: null }
    }
    return { value: JSON.parse(text), error: null }
  } catch {
    return { value: null, error: errJson(400, 'INVALID_JSON', 'Request body is not valid JSON') }
  }
}

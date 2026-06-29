// fairpay-agent-api — FairPay Agent API v1
//
// verify_jwt=true (configured in supabase/config.toml)
// Every request carries a valid Supabase session JWT; the actor user_id is
// read exclusively from auth.getUser() — never from the request body.
//
// Route map (all prefixed /functions/v1/fairpay-agent-api):
//   GET  /v1/me
//   GET  /v1/groups
//   GET  /v1/groups/:group_id/members
//   POST /v1/expense-duplicate-checks
//   POST /v1/expenses/preview
//   POST /v1/previews/:preview_id/confirm        ← UI only, not in model tool list
//   POST /v1/expenses/commit                     ← UI only, not in model tool list
//   GET  /v1/operations/:preview_id

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleAgentApiCorsPreflight } from './_cors.ts'
import { errJson } from './response.ts'
import { handleMe } from './handlers/me.ts'
import { handleGroups, handleGroupMembers } from './handlers/groups.ts'
import { handleDuplicateCheck } from './handlers/duplicate-check.ts'
import { handlePreview } from './handlers/preview.ts'
import { handleConfirm } from './handlers/confirm.ts'
import { handleCommit } from './handlers/commit.ts'
import { handleGetOperation } from './handlers/operations.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Never use SUPABASE_SERVICE_ROLE_KEY in this function.
// All data access is request-scoped via the user's JWT.

serve(async (req: Request) => {
  // CORS preflight
  const preflightRes = handleAgentApiCorsPreflight(req)
  if (preflightRes) return preflightRes

  // Build request-scoped user client from the Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errJson(401, 'MISSING_AUTH', 'Authorization header required')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  try {
    const url = new URL(req.url)
    // Strip the Supabase function prefix to get the logical path.
    // The full path is /functions/v1/fairpay-agent-api/v1/...
    // Extract the portion starting at /v1/
    const raw = url.pathname
    const v1Idx = raw.indexOf('/v1/')
    const path = v1Idx >= 0 ? raw.slice(v1Idx) : raw
    const method = req.method

    // GET /v1/me
    if (method === 'GET' && path === '/v1/me') {
      return await handleMe(supabase)
    }

    // GET /v1/groups
    if (method === 'GET' && path === '/v1/groups') {
      return await handleGroups(supabase)
    }

    // GET /v1/groups/:group_id/members
    const membersMatch = path.match(/^\/v1\/groups\/([^/]+)\/members$/)
    if (method === 'GET' && membersMatch) {
      return await handleGroupMembers(supabase, membersMatch[1])
    }

    // POST /v1/expense-duplicate-checks
    if (method === 'POST' && path === '/v1/expense-duplicate-checks') {
      return await handleDuplicateCheck(supabase, req)
    }

    // POST /v1/expenses/preview
    if (method === 'POST' && path === '/v1/expenses/preview') {
      return await handlePreview(supabase, req)
    }

    // POST /v1/previews/:preview_id/confirm  (UI only)
    const confirmMatch = path.match(/^\/v1\/previews\/([^/]+)\/confirm$/)
    if (method === 'POST' && confirmMatch) {
      return await handleConfirm(supabase, req, confirmMatch[1])
    }

    // POST /v1/expenses/commit  (UI only)
    if (method === 'POST' && path === '/v1/expenses/commit') {
      return await handleCommit(supabase, req)
    }

    // GET /v1/operations/:preview_id
    const opMatch = path.match(/^\/v1\/operations\/([^/]+)$/)
    if (method === 'GET' && opMatch) {
      return await handleGetOperation(supabase, opMatch[1])
    }

    return errJson(404, 'NOT_FOUND', `No route: ${method} ${path}`)
  } catch (err) {
    console.error('[fairpay-agent-api] Unhandled error:', err)
    return errJson(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
})

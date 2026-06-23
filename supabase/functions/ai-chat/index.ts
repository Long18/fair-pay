import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

/** AI Chat Tool Executor — data tools only, AI via Puter.js client-side
 *
 * Phase 1A: add_expense, create_group, and record_payment are hard-disabled.
 * Group expense creation now goes through the dedicated fairpay-agent-api
 * function with preview → confirm → commit atomicity guarantees.
 */

// Legacy write tools that must not bypass the new agent write path.
// They return a structured error so any model calling them gets a clear signal.
const DISABLED_WRITE_TOOLS = new Set(['create_group', 'add_expense', 'record_payment'])

async function executeTool(
  toolName: string, args: Record<string, unknown>,
  userId: string, supabase: ReturnType<typeof createClient>
): Promise<{ result: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'get_debt_summary': {
        const { data, error } = await supabase.rpc('get_user_debts_aggregated', { p_user_id: userId })
        return error ? { result: null, error: error.message } : { result: data }
      }
      case 'get_debt_details': {
        const counterpartyId = args.counterparty_id as string
        if (!counterpartyId) return { result: null, error: 'counterparty_id is required' }
        const { data, error } = await supabase.rpc('get_user_debt_details', {
          p_user_id: userId,
          p_counterparty_id: counterpartyId,
        })
        return error ? { result: null, error: error.message } : { result: data }
      }
      case 'get_groups': {
        const { data, error } = await supabase.from('group_members')
          .select('group_id, role, groups(id, name, description, created_at)')
          .eq('user_id', userId).limit(20)
        return error ? { result: null, error: error.message } : { result: data }
      }
      case 'get_group_details': {
        const gid = args.group_id as string
        const [g, m, e] = await Promise.all([
          supabase.from('groups').select('*').eq('id', gid).single(),
          supabase.from('group_members').select('user_id, role, profiles(full_name, avatar_url)').eq('group_id', gid),
          supabase.from('expenses').select('id, description, amount, currency, expense_date, paid_by_user_id').eq('group_id', gid).order('expense_date', { ascending: false }).limit(10),
        ])
        return g.error ? { result: null, error: g.error.message } : { result: { group: g.data, members: m.data, recent_expenses: e.data } }
      }
      case 'get_expenses': {
        let q = supabase.from('expenses')
          .select('id, description, amount, currency, expense_date, category, context_type, paid_by_user_id')
          .order('expense_date', { ascending: false }).limit((args.limit as number) || 10)
        if (args.group_id) q = q.eq('group_id', args.group_id as string)
        const { data, error } = await q
        return error ? { result: null, error: error.message } : { result: data }
      }
      default:
        return { result: null, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    return { result: null, error: (err as Error).message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders() })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401, headers: getCorsHeaders(),
    })
    const token = authHeader.replace('Bearer ', '')
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: getCorsHeaders(),
    })
    const uid = user.id
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { action, tool_name, tool_args, conversation_id, confirm_action_id, reject_action_id } = await req.json()

    if (action === 'execute_tool' && tool_name) {
      // Hard-reject legacy financial write tools — route through fairpay-agent-api instead.
      if (DISABLED_WRITE_TOOLS.has(tool_name)) {
        return new Response(JSON.stringify({
          status: 'error',
          error: `Tool '${tool_name}' is no longer available. Use the FairPay Agent API ` +
            '(preview → UI confirm → commit) for group expense creation.',
          redirect: 'fairpay-agent-api',
        }), { status: 410, headers: getCorsHeaders() })
      }
      const result = await executeTool(tool_name, tool_args || {}, uid, sb)
      return new Response(JSON.stringify({ status: 'success', ...result }), {
        headers: getCorsHeaders(),
      })
    }

    if (action === 'confirm' && confirm_action_id) {
      const { data: pa } = await sb.from('ai_chat_pending_actions').select('*')
        .eq('id', confirm_action_id).eq('user_id', uid).eq('status', 'pending').single()
      if (!pa) return new Response(JSON.stringify({ error: 'Action not found or expired' }), {
        status: 404, headers: getCorsHeaders(),
      })
      if (DISABLED_WRITE_TOOLS.has(pa.tool_name)) {
        return new Response(JSON.stringify({ error: 'Legacy financial actions cannot be confirmed' }), {
          status: 410, headers: getCorsHeaders(),
        })
      }
      if (new Date(pa.expires_at) < new Date()) {
        await sb.from('ai_chat_pending_actions').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('id', pa.id)
        return new Response(JSON.stringify({ error: 'Action expired' }), {
          status: 410, headers: getCorsHeaders(),
        })
      }
      const result = await executeTool(pa.tool_name, pa.tool_args, uid, sb)
      await sb.from('ai_chat_pending_actions').update({ status: 'confirmed', resolved_at: new Date().toISOString() }).eq('id', pa.id)
      return new Response(JSON.stringify({ status: result.error ? 'failure' : 'success', ...result }), {
        headers: getCorsHeaders(),
      })
    }

    if (action === 'reject' && reject_action_id) {
      await sb.from('ai_chat_pending_actions').update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', reject_action_id).eq('user_id', uid)
      return new Response(JSON.stringify({ status: 'rejected' }), {
        headers: getCorsHeaders(),
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: getCorsHeaders(),
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(JSON.stringify({ error: 'An error occurred' }), {
      status: 500, headers: getCorsHeaders(),
    })
  }
})

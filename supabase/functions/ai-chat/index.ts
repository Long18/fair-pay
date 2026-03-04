import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** AI Chat Tool Executor — data tools only, AI via Puter.js client-side */

const CONFIRMATION_REQUIRED = new Set(['create_group', 'add_expense', 'record_payment'])

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
      case 'create_group': {
        const { data, error } = await supabase.from('groups')
          .insert({ name: args.name as string, description: (args.description as string) || null, created_by: userId })
          .select().single()
        return error ? { result: null, error: error.message } : { result: data }
      }
      case 'add_expense': {
        const ctx = args.group_id ? 'group' : 'friend'
        const { data, error } = await supabase.from('expenses').insert({
          description: args.description as string, amount: args.amount as number,
          currency: (args.currency as string) || 'VND', category: (args.category as string) || 'general',
          context_type: ctx, group_id: (args.group_id as string) || null,
          friendship_id: (args.friendship_id as string) || null,
          paid_by_user_id: userId, created_by: userId,
          expense_date: new Date().toISOString().split('T')[0],
        }).select().single()
        if (error) return { result: null, error: error.message }
        if (data) {
          await supabase.from('expense_splits').insert({
            expense_id: data.id, user_id: userId,
            split_method: (args.split_method as string) || 'equal',
            split_value: args.amount as number, computed_amount: args.amount as number,
          })
        }
        return { result: data }
      }
      case 'get_expenses': {
        let q = supabase.from('expenses')
          .select('id, description, amount, currency, expense_date, category, context_type, paid_by_user_id')
          .order('expense_date', { ascending: false }).limit((args.limit as number) || 10)
        if (args.group_id) q = q.eq('group_id', args.group_id as string)
        const { data, error } = await q
        return error ? { result: null, error: error.message } : { result: data }
      }
      case 'record_payment': {
        const ctx = args.group_id ? 'group' : 'friend'
        let friendshipId = null
        if (!args.group_id) {
          const { data: f } = await supabase.rpc('get_friendship', { user_id_1: userId, user_id_2: args.to_user_id as string })
          friendshipId = f
        }
        const { data, error } = await supabase.from('payments').insert({
          from_user: userId, to_user: args.to_user_id as string,
          amount: args.amount as number, currency: (args.currency as string) || 'VND',
          context_type: ctx, group_id: (args.group_id as string) || null,
          friendship_id: friendshipId, note: (args.note as string) || null,
          created_by: userId, payment_date: new Date().toISOString().split('T')[0],
        }).select().single()
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const token = authHeader.replace('Bearer ', '')
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const uid = user.id
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { action, tool_name, tool_args, conversation_id, confirm_action_id, reject_action_id } = await req.json()

    if (action === 'execute_tool' && tool_name) {
      if (CONFIRMATION_REQUIRED.has(tool_name)) {
        const preview = {
          summary: `${tool_name.replace(/_/g, ' ')}: ${JSON.stringify(tool_args)}`,
          fields: Object.entries(tool_args || {}).map(([k, v]: [string, unknown]) => ({ label: k, value: String(v) })),
        }
        const { data: pa } = await sb.from('ai_chat_pending_actions').insert({
          conversation_id: conversation_id || null, user_id: uid,
          tool_name, tool_args: tool_args || {}, preview,
        }).select().single()
        return new Response(JSON.stringify({ status: 'needs_confirmation', pending_action: pa }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const result = await executeTool(tool_name, tool_args || {}, uid, sb)
      return new Response(JSON.stringify({ status: 'success', ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'confirm' && confirm_action_id) {
      const { data: pa } = await sb.from('ai_chat_pending_actions').select('*')
        .eq('id', confirm_action_id).eq('user_id', uid).eq('status', 'pending').single()
      if (!pa) return new Response(JSON.stringify({ error: 'Action not found or expired' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      if (new Date(pa.expires_at) < new Date()) {
        await sb.from('ai_chat_pending_actions').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('id', pa.id)
        return new Response(JSON.stringify({ error: 'Action expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const result = await executeTool(pa.tool_name, pa.tool_args, uid, sb)
      await sb.from('ai_chat_pending_actions').update({ status: 'confirmed', resolved_at: new Date().toISOString() }).eq('id', pa.id)
      return new Response(JSON.stringify({ status: result.error ? 'failure' : 'success', ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'reject' && reject_action_id) {
      await sb.from('ai_chat_pending_actions').update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', reject_action_id).eq('user_id', uid)
      return new Response(JSON.stringify({ status: 'rejected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(JSON.stringify({ error: 'An error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

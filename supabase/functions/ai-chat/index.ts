import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Tool Definitions for OpenAI ---
const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_debt_summary',
      description: 'Get the current user debt summary: who they owe, who owes them, net balance.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_groups',
      description: 'List all groups the current user belongs to.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_group_details',
      description: 'Get details of a specific group including members and recent expenses.',
      parameters: {
        type: 'object',
        properties: { group_id: { type: 'string', description: 'UUID of the group' } },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_group',
      description: 'Create a new expense group. Requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Optional group description' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Add a new expense. Requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Group UUID (for group expenses)' },
          friendship_id: { type: 'string', description: 'Friendship UUID (for friend expenses)' },
          description: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', description: 'ISO currency code, default VND' },
          category: { type: 'string' },
          split_method: { type: 'string', enum: ['equal', 'exact'] },
        },
        required: ['description', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_expenses',
      description: 'List recent expenses, optionally filtered by group.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Filter by group UUID' },
          limit: { type: 'number', description: 'Max results, default 10' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_payment',
      description: 'Record a settlement payment. Requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          to_user_id: { type: 'string', description: 'UUID of user being paid' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          group_id: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['to_user_id', 'amount'],
      },
    },
  },
]

const CONFIRMATION_REQUIRED = new Set(['create_group', 'add_expense', 'record_payment'])
const ADMIN_TOOLS = new Set(['admin_get_metrics', 'admin_query_audit_log'])


// --- Tool Execution ---
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ result: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'get_debt_summary': {
        const { data, error } = await supabase.rpc('get_user_debts_aggregated', { p_user_id: userId })
        if (error) return { result: null, error: error.message }
        return { result: data }
      }
      case 'get_groups': {
        const { data, error } = await supabase
          .from('group_members')
          .select('group_id, role, groups(id, name, description, created_at)')
          .eq('user_id', userId)
          .limit(20)
        if (error) return { result: null, error: error.message }
        return { result: data }
      }
      case 'get_group_details': {
        const groupId = args.group_id as string
        const [groupRes, membersRes, expensesRes] = await Promise.all([
          supabase.from('groups').select('*').eq('id', groupId).single(),
          supabase.from('group_members').select('user_id, role, profiles(full_name, avatar_url)').eq('group_id', groupId),
          supabase.from('expenses').select('id, description, amount, currency, expense_date, paid_by_user_id').eq('group_id', groupId).order('expense_date', { ascending: false }).limit(10),
        ])
        if (groupRes.error) return { result: null, error: groupRes.error.message }
        return { result: { group: groupRes.data, members: membersRes.data, recent_expenses: expensesRes.data } }
      }
      case 'create_group': {
        const { data, error } = await supabase
          .from('groups')
          .insert({ name: args.name as string, description: (args.description as string) || null, created_by: userId })
          .select()
          .single()
        if (error) return { result: null, error: error.message }
        return { result: data }
      }
      case 'add_expense': {
        const contextType = args.group_id ? 'group' : 'friend'
        const expenseData = {
          description: args.description as string,
          amount: args.amount as number,
          currency: (args.currency as string) || 'VND',
          category: (args.category as string) || 'general',
          context_type: contextType,
          group_id: (args.group_id as string) || null,
          friendship_id: (args.friendship_id as string) || null,
          paid_by_user_id: userId,
          created_by: userId,
          expense_date: new Date().toISOString().split('T')[0],
        }
        const { data, error } = await supabase.from('expenses').insert(expenseData).select().single()
        if (error) return { result: null, error: error.message }
        // Create equal split for the payer (auto-settled)
        if (data) {
          await supabase.from('expense_splits').insert({
            expense_id: data.id,
            user_id: userId,
            split_method: (args.split_method as string) || 'equal',
            split_value: args.amount as number,
            computed_amount: args.amount as number,
          })
        }
        return { result: data }
      }
      case 'get_expenses': {
        let query = supabase
          .from('expenses')
          .select('id, description, amount, currency, expense_date, category, context_type, paid_by_user_id')
          .order('expense_date', { ascending: false })
          .limit((args.limit as number) || 10)
        if (args.group_id) query = query.eq('group_id', args.group_id as string)
        const { data, error } = await query
        if (error) return { result: null, error: error.message }
        return { result: data }
      }
      case 'record_payment': {
        const contextType = args.group_id ? 'group' : 'friend'
        let friendshipId = null
        if (!args.group_id) {
          const { data: friendship } = await supabase.rpc('get_friendship', {
            user_id_1: userId,
            user_id_2: args.to_user_id as string,
          })
          friendshipId = friendship
        }
        const paymentData = {
          from_user: userId,
          to_user: args.to_user_id as string,
          amount: args.amount as number,
          currency: (args.currency as string) || 'VND',
          context_type: contextType,
          group_id: (args.group_id as string) || null,
          friendship_id: friendshipId,
          note: (args.note as string) || null,
          created_by: userId,
          payment_date: new Date().toISOString().split('T')[0],
        }
        const { data, error } = await supabase.from('payments').insert(paymentData).select().single()
        if (error) return { result: null, error: error.message }
        return { result: data }
      }
      default:
        return { result: null, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    return { result: null, error: (err as Error).message }
  }
}


// --- System Prompt ---
const SYSTEM_PROMPT = `You are FairPay Assistant, an AI helper for the FairPay expense-sharing app.
You help users manage shared expenses, groups, debts, and payments via chat.

Rules:
- Be concise and friendly. Use the user's language (Vietnamese or English).
- For read-only queries (debts, groups, expenses), answer directly using tool results.
- For mutating actions (create group, add expense, record payment), ALWAYS generate a clear summary of what will be done and ask for confirmation before executing.
- Never guess monetary amounts — always ask the user to confirm.
- Format currency amounts with proper separators (e.g., 150,000 VND or $25.00).
- If a user asks something outside FairPay scope, politely redirect.
- Never reveal internal IDs to users — use names and descriptions instead.
- If you lack information to complete a request, ask clarifying questions.`

// --- Main Handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const traceId = crypto.randomUUID()

  try {
    // Auth: extract JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const body = await req.json()
    const { conversation_id, message, confirm_action_id, reject_action_id } = body as {
      conversation_id?: string; message?: string; confirm_action_id?: string; reject_action_id?: string
    }

    // --- Handle confirmation / rejection ---
    if (confirm_action_id) {
      const { data: action } = await supabaseUser
        .from('ai_chat_pending_actions').select('*')
        .eq('id', confirm_action_id).eq('user_id', userId).eq('status', 'pending').single()

      if (!action) {
        return new Response(JSON.stringify({ error: 'Action not found or expired' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (new Date(action.expires_at) < new Date()) {
        await supabaseUser.from('ai_chat_pending_actions').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('id', action.id)
        return new Response(JSON.stringify({ error: 'Action expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const result = await executeTool(action.tool_name, action.tool_args, userId, supabaseUser)
      await supabaseUser.from('ai_chat_pending_actions').update({ status: 'confirmed', resolved_at: new Date().toISOString() }).eq('id', action.id)

      const resultContent = result.error
        ? `Action failed: ${result.error}`
        : `Done! ${action.preview?.summary || 'Action completed successfully.'}`

      const { data: savedMsg } = await supabaseUser.from('ai_chat_messages').insert({
        conversation_id: action.conversation_id, role: 'assistant', content: resultContent,
        metadata: { mode: 'action', status: result.error ? 'failure' : 'success', tool_name: action.tool_name, trace_id: traceId },
      }).select().single()

      return new Response(JSON.stringify({ conversation_id: action.conversation_id, message: savedMsg, trace_id: traceId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reject_action_id) {
      await supabaseUser.from('ai_chat_pending_actions').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', reject_action_id).eq('user_id', userId)
      return new Response(JSON.stringify({ status: 'rejected', trace_id: traceId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Get or create conversation ---
    let convId = conversation_id
    if (!convId) {
      const { data: conv } = await supabaseUser.from('ai_chat_conversations').insert({ user_id: userId, title: message.slice(0, 50) }).select().single()
      convId = conv!.id
    }

    await supabaseUser.from('ai_chat_messages').insert({ conversation_id: convId, role: 'user', content: message })

    // Load history (last 20 messages)
    const { data: history } = await supabaseUser
      .from('ai_chat_messages').select('role, content')
      .eq('conversation_id', convId).order('created_at', { ascending: true }).limit(20)

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    ]

    // --- Call OpenAI ---
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages, tools: TOOL_DEFINITIONS, tool_choice: 'auto', temperature: 0.3, max_tokens: 1024,
    })

    const choice = completion.choices[0]
    let assistantContent = choice.message.content || ''
    let pendingAction = null
    const metadata: Record<string, unknown> = { mode: 'info', status: 'success', trace_id: traceId }

    // --- Handle tool calls ---
    if (choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0]
      const toolName = toolCall.function.name
      const toolArgs = JSON.parse(toolCall.function.arguments)

      if (ADMIN_TOOLS.has(toolName)) {
        const { data: isAdmin } = await supabaseAdmin.rpc('is_admin')
        if (!isAdmin) {
          assistantContent = 'Sorry, this action requires admin privileges.'
          metadata.status = 'failure'
        }
      }

      if (metadata.status !== 'failure') {
        if (CONFIRMATION_REQUIRED.has(toolName)) {
          const preview = {
            summary: `${toolName.replace(/_/g, ' ')}: ${JSON.stringify(toolArgs)}`,
            fields: Object.entries(toolArgs).map(([k, v]) => ({ label: k, value: String(v) })),
          }
          const { data: action } = await supabaseUser.from('ai_chat_pending_actions').insert({
            conversation_id: convId, user_id: userId, tool_name: toolName, tool_args: toolArgs, preview,
          }).select().single()

          pendingAction = action
          metadata.mode = 'action'
          metadata.status = 'needs_confirmation'
          metadata.pending_action_id = action?.id
          metadata.tool_name = toolName

          // Ask AI to describe the pending action naturally
          const describeMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            ...messages,
            choice.message as OpenAI.Chat.Completions.ChatCompletionMessageParam,
            { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ status: 'needs_confirmation', preview }) },
          ]
          const describeRes = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: describeMessages, temperature: 0.3, max_tokens: 512 })
          assistantContent = describeRes.choices[0].message.content || 'Please confirm this action.'
        } else {
          // Execute read-only tool directly
          const result = await executeTool(toolName, toolArgs, userId, supabaseUser)
          metadata.tool_name = toolName
          if (result.error) {
            assistantContent = `Error: ${result.error}`
            metadata.status = 'failure'
          } else {
            const resultMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
              ...messages,
              choice.message as OpenAI.Chat.Completions.ChatCompletionMessageParam,
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result.result) },
            ]
            const resultRes = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: resultMessages, temperature: 0.3, max_tokens: 1024 })
            assistantContent = resultRes.choices[0].message.content || 'Here are the results.'
          }
        }
      }
    }

    // Save assistant response
    const { data: savedMsg } = await supabaseUser.from('ai_chat_messages').insert({
      conversation_id: convId, role: 'assistant', content: assistantContent, metadata,
    }).select().single()

    return new Response(JSON.stringify({
      conversation_id: convId, message: savedMsg, pending_action: pendingAction, trace_id: traceId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.', trace_id: traceId }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

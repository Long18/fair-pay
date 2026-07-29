import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SYSTEM = `You are FairPay's in-app agent orchestrator. Reply with a single JSON object only:
{"type":"tool_call","name":"<tool>","arguments":{...}} OR {"type":"final","content":"<markdown>"}.
Use FairPay MCP tool names when calling tools. Group expenses only for writes; personal/loan must be final guidance to use Friends UI.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders() })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: getCorsHeaders(),
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Cloud orchestrator is not configured.' }), {
        status: 503,
        headers: getCorsHeaders(),
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: getCorsHeaders(),
      })
    }

    const body = await req.json() as {
      messages?: Array<{ role: string; content: string | null }>
      model?: string
    }

    const openAiMessages = [
      { role: 'system', content: SYSTEM },
      ...(body.messages ?? []).map((m) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.content ?? '',
      })),
    ]

    const model = body.model ?? 'gpt-4o-mini'
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: openAiMessages,
        temperature: 0.2,
      }),
    })

    const completionJson = await completion.json()
    if (!completion.ok) {
      return new Response(JSON.stringify({ error: completionJson.error?.message ?? 'OpenAI error' }), {
        status: 502,
        headers: getCorsHeaders(),
      })
    }

    const content = completionJson.choices?.[0]?.message?.content ?? ''
    return new Response(JSON.stringify({ message: { content } }), {
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: getCorsHeaders(),
    })
  }
})

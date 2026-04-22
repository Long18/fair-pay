import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const viewerId = url.searchParams.get('viewer_id')
  const counterpartyId = url.searchParams.get('counterparty_id')

  if (!viewerId || !counterpartyId) {
    return Response.json({ error: 'Missing viewer_id or counterparty_id' }, { status: 400 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const useKey = serviceKey || anonKey

  const result: Record<string, unknown> = {
    env: {
      VITE_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'SET' : 'MISSING',
      VITE_SUPABASE_ANON_KEY: anonKey ? 'SET' : 'MISSING',
      keyUsed: serviceKey ? 'service_role' : anonKey ? 'anon' : 'none',
    },
  }

  if (!supabaseUrl || !useKey) {
    result.error = 'Missing Supabase credentials'
    return Response.json(result)
  }

  const sb = createClient(supabaseUrl, useKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Test RPC
  const { data: rpcData, error: rpcError } = await sb.rpc('get_user_debt_details', {
    p_user_id: viewerId,
    p_counterparty_id: counterpartyId,
  })

  result.rpc = {
    error: rpcError ? { message: rpcError.message, code: rpcError.code, details: rpcError.details } : null,
    rowCount: Array.isArray(rpcData) ? rpcData.length : 0,
    firstRow: Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null,
    unsettledCount: Array.isArray(rpcData)
      ? rpcData.filter((r: any) => !r.is_settled && Number(r.remaining_amount) > 0).length
      : 0,
  }

  // Test profiles
  const { data: profiles, error: profileError } = await sb
    .from('profiles')
    .select('id, full_name')
    .in('id', [viewerId, counterpartyId])

  result.profiles = {
    error: profileError ? profileError.message : null,
    data: profiles,
  }

  return Response.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

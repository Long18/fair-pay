import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'

interface DebtDetailRow {
  user_id: string
  full_name: string
  email: string
  total_owed_to_me: string
  total_i_owe: string
  net_balance: string
  active_debt_relationships: number
  debts_by_person: unknown
  debts_by_group: unknown
  total_count: number
}

interface ApiResponse {
  success: boolean
  error?: string
  pagination?: {
    limit: number
    offset: number
    total_count: number
  }
  data?: unknown[]
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req)
  if (preflightResponse) return preflightResponse

  try {
    // Extract and validate auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header'
        } as ApiResponse),
        {
          status: 401,
          headers: getCorsHeaders()
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Initialize Supabase client with auth token — getUser() verifies the JWT server-side
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          authorization: authHeader
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        } as ApiResponse),
        {
          status: 401,
          headers: getCorsHeaders()
        }
      )
    }

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Validate pagination params
    if (limit < 1 || offset < 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid pagination parameters'
        } as ApiResponse),
        {
          status: 400,
          headers: getCorsHeaders()
        }
      )
    }

    console.log(`Fetching all users debt detailed: limit=${limit}, offset=${offset}`)

    // Call RPC function (admin check happens inside the function)
    const { data, error } = await supabase.rpc('get_all_users_debt_detailed', {
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      console.error('RPC Error:', error)

      // Check if it's an admin permission error
      if (error.message.includes('Only admins can view')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          } as ApiResponse),
          {
            status: 403,
            headers: getCorsHeaders()
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`
        } as ApiResponse),
        {
          status: 500,
          headers: getCorsHeaders()
        }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          pagination: {
            limit,
            offset,
            total_count: 0
          },
          data: []
        } as ApiResponse),
        {
          status: 200,
          headers: getCorsHeaders()
        }
      )
    }

    // Extract metadata from first row
    const firstRow = data[0] as DebtDetailRow
    const totalCount = firstRow.total_count

    // Format response
    const response: ApiResponse = {
      success: true,
      pagination: {
        limit,
        offset,
        total_count: totalCount
      },
      data: data.map((row: DebtDetailRow) => ({
        user_id: row.user_id,
        full_name: row.full_name,
        email: row.email,
        total_owed_to_me: parseFloat(row.total_owed_to_me),
        total_i_owe: parseFloat(row.total_i_owe),
        net_balance: parseFloat(row.net_balance),
        active_debt_relationships: row.active_debt_relationships,
        debts_by_person: row.debts_by_person,
        debts_by_group: row.debts_by_group
      }))
    }

    console.log(`Successfully retrieved detailed debts for ${data.length} users (total: ${totalCount})`)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: getCorsHeaders()
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${(error as Error).message}`
      } as ApiResponse),
      {
        status: 500,
        headers: getCorsHeaders()
      }
    )
  }
})

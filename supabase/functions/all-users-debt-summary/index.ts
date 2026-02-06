import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebtSummaryRow {
  user_id: string
  full_name: string
  net_balance: string
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
  data?: Array<{
    user_id: string
    full_name: string
    net_balance: number
  }>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client (anon key for public access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`Fetching all users debt summary: limit=${limit}, offset=${offset}`)

    // Call RPC function
    const { data, error } = await supabase.rpc('get_all_users_debt_summary', {
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      console.error('RPC Error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`
        } as ApiResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract metadata from first row
    const firstRow = data[0] as DebtSummaryRow
    const totalCount = firstRow.total_count

    // Format response
    const response: ApiResponse = {
      success: true,
      pagination: {
        limit,
        offset,
        total_count: totalCount
      },
      data: data.map((row: DebtSummaryRow) => ({
        user_id: row.user_id,
        full_name: row.full_name,
        net_balance: parseFloat(row.net_balance)
      }))
    }

    console.log(`Successfully retrieved ${data.length} users (total: ${totalCount})`)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

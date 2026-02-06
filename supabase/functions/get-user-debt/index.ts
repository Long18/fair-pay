import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebtResponse {
  success: boolean
  error_message?: string
  data?: {
    user_id: string
    user_name: string
    user_email: string
    total_owed_to_me: number
    total_i_owe: number
    net_balance: number
    currency: string
    debts_by_person: Array<{
      counterparty_id: string
      counterparty_name: string
      amount: number
      currency: string
      i_owe_them: boolean
      total_amount: number
      settled_amount: number
      remaining_amount: number
      transaction_count: number
      last_transaction_date: string
    }>
    debts_by_group: Array<{
      group_id: string
      group_name: string
      group_avatar_url?: string
      total_owed_to_me: number
      total_i_owe: number
      net_balance: number
      debts_in_group: Array<{
        counterparty_id: string
        counterparty_name: string
        amount: number
        currency: string
        i_owe_them: boolean
      }>
    }>
    settlement_summary: {
      total_expenses: number
      total_settled_splits: number
      total_unsettled_splits: number
      total_settled_amount: number
      total_unsettled_amount: number
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')
    const secret = url.searchParams.get('secret')

    // Validate required parameters
    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error_message: 'Missing required parameter: user_id'
        } as DebtResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!secret) {
      return new Response(
        JSON.stringify({
          success: false,
          error_message: 'Missing required parameter: secret'
        } as DebtResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error_message: 'Invalid user_id format'
        } as DebtResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with anon key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`Fetching debt data for user: ${user_id}`)

    // Call the RPC function
    const { data, error } = await supabase.rpc(
      'get_user_debt_by_secret',
      {
        p_user_id: user_id,
        p_secret_token: secret
      }
    )

    if (error) {
      console.error('RPC Error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error_message: `Database error: ${error.message}`
        } as DebtResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // data should be an array with one row
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error_message: 'No data returned from database'
        } as DebtResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = data[0]

    // Check if validation failed
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error_message: result.error_message
        } as DebtResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return success response with comprehensive debt data
    const response: DebtResponse = {
      success: true,
      data: {
        user_id: result.user_id,
        user_name: result.user_name || 'Unknown',
        user_email: result.user_email || 'Unknown',
        total_owed_to_me: Number(result.total_owed_to_me) || 0,
        total_i_owe: Number(result.total_i_owe) || 0,
        net_balance: Number(result.net_balance) || 0,
        currency: result.currency || 'USD',
        debts_by_person: result.debts_by_person || [],
        debts_by_group: result.debts_by_group || [],
        settlement_summary: result.settlement_summary || {
          total_expenses: 0,
          total_settled_splits: 0,
          total_unsettled_splits: 0,
          total_settled_amount: 0,
          total_unsettled_amount: 0
        }
      }
    }

    console.log(`Successfully retrieved debt data for user: ${user_id}`)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error_message: `Unexpected error: ${(error as Error).message}`
      } as DebtResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

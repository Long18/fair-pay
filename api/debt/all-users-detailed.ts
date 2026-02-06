import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Extract and validate auth token
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization header'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header'
      })
    }

    // Decode token to validate (basic check)
    let decoded: any
    try {
      decoded = jwtDecode(token)
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    const { limit = '50', offset = '0' } = req.query

    // Validate pagination params
    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offsetNum = parseInt(offset as string) || 0

    if (limitNum < 1 || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      })
    }

    // Initialize Supabase client with auth token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
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

    console.log(`Fetching all users debt detailed: limit=${limitNum}, offset=${offsetNum}`)

    // Call RPC function (admin check happens inside the function)
    const { data, error } = await supabase.rpc('get_all_users_debt_detailed', {
      p_limit: limitNum,
      p_offset: offsetNum
    })

    if (error) {
      console.error('RPC Error:', error)

      // Check if it's an admin permission error
      if (error.message.includes('Only admins can view')) {
        return res.status(403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      })
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total_count: 0
        },
        data: []
      })
    }

    // Extract metadata from first row
    const firstRow = data[0] as any
    const totalCount = firstRow.total_count

    // Format response
    const response = {
      success: true,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total_count: totalCount
      },
      data: data.map((row: any) => ({
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

    return res.status(200).json(response)
  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${(error as Error).message}`
    })
  }
}

import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`Fetching all users debt summary: limit=${limitNum}, offset=${offsetNum}`)

    // Call RPC function
    const { data, error } = await supabase.rpc('get_all_users_debt_summary', {
      p_limit: limitNum,
      p_offset: offsetNum
    })

    if (error) {
      console.error('RPC Error:', error)
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
        net_balance: parseFloat(row.net_balance)
      }))
    }

    console.log(`Successfully retrieved ${data.length} users (total: ${totalCount})`)

    return res.status(200).json(response)
  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${(error as Error).message}`
    })
  }
}

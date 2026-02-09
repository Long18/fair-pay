import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { limit = '50', offset = '0' } = req.query

    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offsetNum = parseInt(offset as string) || 0

    if (limitNum < 1 || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      })
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase.rpc('get_who_owes_who', {
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
        pagination: { limit: limitNum, offset: offsetNum, total_count: 0 },
        data: []
      })
    }

    const totalCount = (data[0] as any).total_count

    return res.status(200).json({
      success: true,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total_count: totalCount
      },
      data: data.map((row: any) => ({
        from_user_id: row.from_user_id,
        from_user_name: row.from_user_name,
        to_user_id: row.to_user_id,
        to_user_name: row.to_user_name,
        amount: parseFloat(row.amount)
      }))
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${(error as Error).message}`
    })
  }
}

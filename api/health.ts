// FairPay health check — Vercel edge function.
// Returns 200 so external agents can verify the domain is reachable before
// attempting API calls. No auth required.
export const config = { runtime: 'edge' }

export default function handler() {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'FairPay' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  )
}

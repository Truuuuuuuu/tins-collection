// Runs once a day via the Vercel cron in vercel.json. Supabase's free plan pauses a project after
// about a week with no activity, so this asks for one item to keep it awake. Read-only: it changes nothing.
export async function GET(request) {
  // If CRON_SECRET is set in Vercel, only Vercel's cron (which sends it) may call this.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new Response('Supabase env vars missing', { status: 500 })

  const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  return new Response(res.ok ? 'ok' : `Supabase responded ${res.status}`, { status: res.ok ? 200 : 502 })
}

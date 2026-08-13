import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Serverless function that proxies admin auth requests to Supabase.
 * This keeps the service_role key on the server side only.
 *
 * Handles:
 *   POST /api/admin-auth/users        → create user
 *   PUT  /api/admin-auth/users/:uid   → update user (e.g. password)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ message: 'Server misconfiguration: missing Supabase env vars' })
  }

  // Extract the sub-path after /api/admin-auth/
  // e.g. /api/admin-auth/users  →  /users
  // e.g. /api/admin-auth/users/abc-123  →  /users/abc-123
  const subPath = (req.url || '').replace(/^\/api\/admin-auth/, '')
  const targetUrl = `${supabaseUrl}/auth/v1/admin${subPath}`

  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  if (!allowedMethods.includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel/Serverless-Proxy' // Bypass Supabase Kong browser detection
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Proxy error' })
  }
}

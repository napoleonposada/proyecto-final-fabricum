import crypto from 'node:crypto'
import { getAuthenticatedUser, json } from '../_lib/supabaseServer.js'
import { signState } from '../_lib/crypto.js'

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { user, client } = await getAuthenticatedUser(req)
    const { data: profile, error } = await client.from('profiles').select('role').eq('id', user.id).single()
    if (error || !profile || !['ADMIN', 'GESTOR'].includes(profile.role)) return json(res, { error: 'Solo gestores pueden conectar Calendar' }, 403)
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    if (!clientId || !redirectUri) return json(res, { error: 'Google Calendar no está configurado' }, 503)
    const state = signState({ userId: user.id, nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000 })
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/calendar.events', state })
    const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    if (req.method === 'POST') return json(res, { authorizationUrl })
    res.writeHead(302, { Location: authorizationUrl })
    res.end()
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo iniciar OAuth' }, 401)
  }
}

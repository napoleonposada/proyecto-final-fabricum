import { createAdminClient, json } from '../_lib/supabaseServer.js'
import { encryptSecret, verifyState } from '../_lib/crypto.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { code, state, error: oauthError } = req.query || {}
    if (oauthError) { res.writeHead(302, { Location: `/?calendar_error=${encodeURIComponent(oauthError)}` }); return res.end() }
    if (!code || !state) return json(res, { error: 'Faltan parámetros OAuth' }, 400)
    const payload = verifyState(state)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: process.env.GOOGLE_REDIRECT_URI || '', grant_type: 'authorization_code' }),
    })
    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok || !tokens.refresh_token) throw new Error(tokens.error_description || 'Google no devolvió un refresh token')
    const admin = createAdminClient()
    const { error } = await admin.from('calendar_connections').upsert({ user_id: payload.userId, provider: 'google', calendar_id: 'primary', encrypted_refresh_token: encryptSecret(tokens.refresh_token) }, { onConflict: 'user_id,provider' })
    if (error) throw error
    const redirect = process.env.APP_URL || process.env.VITE_APP_URL || '/'
    res.writeHead(302, { Location: `${redirect}${redirect.includes('?') ? '&' : '?'}calendar=connected` }); return res.end()
  } catch (error) {
    res.writeHead(302, { Location: `/?calendar_error=${encodeURIComponent(error.message || 'No se pudo conectar Calendar')}` }); return res.end()
  }
}

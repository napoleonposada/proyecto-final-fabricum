import crypto from 'node:crypto'
import { createAdminClient, getAuthenticatedUser, json } from '../_lib/supabaseServer.js'
import { decryptSecret } from '../_lib/crypto.js'

async function getAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const data = await response.json()
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'No se pudo renovar el token de Google')
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { user } = await getAuthenticatedUser(req)
    const admin = createAdminClient()
    const { data: connection, error: connectionError } = await admin.from('calendar_connections').select('id, calendar_id, encrypted_refresh_token').eq('user_id', user.id).eq('provider', 'google').single()
    if (connectionError || !connection) return json(res, { error: 'Conecta primero tu Google Calendar personal' }, 409)
    const { contestId } = req.body || {}
    if (!contestId) return json(res, { error: 'contestId es obligatorio' }, 400)
    const { data: contest, error: contestError } = await admin.from('contests').select('id, code, title, proposal_deadline, published_at').eq('id', contestId).single()
    if (contestError || !contest) return json(res, { error: 'Concurso no encontrado' }, 404)
    const { data: milestones } = await admin.from('contest_milestones').select('id, name, due_at').eq('contest_id', contestId)
    const accessToken = await getAccessToken(decryptSecret(connection.encrypted_refresh_token))
    const events = [
      contest.proposal_deadline && { key: 'deadline', summary: `Cierre de propuestas · ${contest.code}`, start: contest.proposal_deadline, end: contest.proposal_deadline },
      contest.published_at && { key: 'published', summary: `Publicación · ${contest.code}`, start: contest.published_at, end: contest.published_at },
      ...(milestones || []).map((milestone) => ({ key: milestone.id, summary: `${milestone.name} · ${contest.code}`, start: milestone.due_at, end: milestone.due_at })),
    ].filter(Boolean)
    const synced = []
    for (const item of events) {
      const sourceHash = crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex')
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: item.summary, description: `Licitia · ${contest.title}`, start: { dateTime: item.start }, end: { dateTime: item.end } }),
      })
      const event = await response.json()
      if (!response.ok) throw new Error(event.error?.message || 'Google Calendar rechazó el evento')
      const { error: upsertError } = await admin.from('calendar_events').upsert({ connection_id: connection.id, contest_id: contest.id, google_event_id: event.id, source_hash: sourceHash, last_synced_at: new Date().toISOString() }, { onConflict: 'connection_id,google_event_id' })
      if (upsertError) throw upsertError
      synced.push(event.id)
    }
    return json(res, { ok: true, count: synced.length, eventIds: synced })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo sincronizar Calendar' }, 400)
  }
}

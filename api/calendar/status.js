import { createAdminClient, getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { user } = await getAuthenticatedUser(req)
    const admin = createAdminClient()
    const { data: connection, error } = await admin.from('calendar_connections').select('id, calendar_id').eq('user_id', user.id).eq('provider', 'google').maybeSingle()
    if (error) throw error
    return json(res, { connected: Boolean(connection), calendarId: connection?.calendar_id || null })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo consultar Calendar' }, 401)
  }
}

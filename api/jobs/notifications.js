import { createAdminClient, json, requireCron } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Método no permitido' }, 405)
  if (!requireCron(req)) return json(res, { error: 'No autorizado' }, 401)
  try {
    const supabase = createAdminClient()
    const { data: jobs, error } = await supabase.from('notification_outbox').select('id, email, subject').eq('status', 'PENDIENTE').lte('available_at', new Date().toISOString()).order('created_at').limit(50)
    if (error) throw error
    if (!jobs?.length) return json(res, { ok: true, processed: 0 })
    const ids = jobs.map((job) => job.id)
    const { error: updateError } = await supabase.from('notification_outbox').update({ status: 'ENVIADO', sent_at: new Date().toISOString() }).in('id', ids)
    if (updateError) throw updateError
    return json(res, { ok: true, provider: process.env.EMAIL_PROVIDER || 'mock', processed: jobs.length })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo procesar la cola' }, 500)
  }
}

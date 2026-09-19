import { createUserClient, json } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { proposalId } = req.body || {}
    if (!proposalId) return json(res, { error: 'proposalId es obligatorio' }, 400)
    const supabase = createUserClient(req)
    const { data, error } = await supabase.from('proposals').update({ status: 'ENVIADA' }).eq('id', proposalId).eq('status', 'BORRADOR').select('id, status, submitted_at').single()
    if (error) return json(res, { error: error.message }, error.code === 'PGRST116' ? 409 : 400)
    return json(res, { ok: true, proposal: data })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo enviar la propuesta' }, 500)
  }
}

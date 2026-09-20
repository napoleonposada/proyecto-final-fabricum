import { createAdminClient, getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { proposalId } = req.body || {}
    if (!proposalId) return json(res, { error: 'proposalId es obligatorio' }, 400)
    const { client: supabase, user } = await getAuthenticatedUser(req)
    const { data: profile, error: profileError } = await supabase.from('profiles').select('supplier_id, role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'PROVEEDOR' || !profile.supplier_id) return json(res, { error: 'La sesión no corresponde a un proveedor' }, 403)
    const { data: proposal, error: proposalError } = await supabase.from('proposals').select('id, contest_id, supplier_id, status').eq('id', proposalId).eq('supplier_id', profile.supplier_id).single()
    if (proposalError || !proposal) return json(res, { error: 'Propuesta no encontrada o sin permisos' }, 404)
    if (proposal.status !== 'BORRADOR') return json(res, { error: 'La propuesta ya fue enviada y no puede reemplazarse' }, 409)
    const { data: contest, error: contestError } = await supabase.from('contests').select('code, status, proposal_deadline').eq('id', proposal.contest_id).single()
    if (contestError || !contest) return json(res, { error: 'Concurso no encontrado o sin permisos' }, 404)
    if (contest.status !== 'ABIERTO') return json(res, { error: 'El concurso ya no está abierto para recibir propuestas' }, 409)
    if (contest.proposal_deadline && new Date(contest.proposal_deadline).getTime() <= Date.now()) return json(res, { error: 'El plazo de presentación ha vencido' }, 409)
    const { data: documents, error: documentsError } = await supabase.from('proposal_documents').select('document_type, text_validation_status').eq('proposal_id', proposalId)
    if (documentsError) return json(res, { error: documentsError.message }, 400)
    const requiredTypes = ['TECNICA', 'ECONOMICA']
    const missing = requiredTypes.filter((type) => !documents?.some((document) => document.document_type === type && document.text_validation_status === 'VALIDO'))
    if (missing.length) return json(res, { error: `Faltan documentos PDF validados: ${missing.join(' y ')}` }, 400)
    const { data, error } = await supabase.from('proposals').update({ status: 'ENVIADA' }).eq('id', proposalId).eq('status', 'BORRADOR').select('id, status, submitted_at').single()
    if (error) return json(res, { error: error.message }, error.code === 'PGRST116' ? 409 : 400)
    const admin = createAdminClient()
    const { data: staffProfiles } = await admin.from('profiles').select('id').in('role', ['ADMIN', 'GESTOR', 'EVALUADOR'])
    if (staffProfiles?.length) {
      await admin.from('notifications').insert(staffProfiles.map((staff) => ({ recipient_id: staff.id, contest_id: proposal.contest_id, kind: 'PROPUESTA_RECIBIDA', title: 'Nueva propuesta recibida', body: `Se recibió una propuesta para el concurso ${contest.code}.`, severity: 'INFO' })))
    }
    return json(res, { ok: true, proposal: data })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo enviar la propuesta' }, 500)
  }
}

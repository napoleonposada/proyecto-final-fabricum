import crypto from 'node:crypto'
import { createAdminClient, json, requireStaff } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { contestId, count = 0 } = req.body || {}
    if (!contestId || !Number.isInteger(count) || count < 1) return json(res, { error: 'contestId y count son obligatorios' }, 400)
    const provider = process.env.EMAIL_PROVIDER || 'mock'
    const { user } = await requireStaff(req)
    const supabase = createAdminClient()
    const { data: contest, error: contestError } = await supabase.from('contests').select('id, code, title, proposal_deadline').eq('id', contestId).single()
    if (contestError) throw contestError
    const { data: targets, error: targetError } = await supabase.from('contest_suppliers').select('id, supplier_id, suppliers(legal_name, supplier_contacts(id, email, is_primary))').eq('contest_id', contestId).limit(count)
    if (targetError) throw targetError
    const expiresAt = contest.proposal_deadline || new Date(Date.now() + 14 * 864e5).toISOString()
    const payloads = (targets || []).map((target) => {
      const supplier = Array.isArray(target.suppliers) ? target.suppliers[0] : target.suppliers
      const contact = supplier?.supplier_contacts?.find((item) => item.is_primary) || supplier?.supplier_contacts?.[0]
      const token = crypto.randomBytes(32).toString('base64url')
      return { contact, token, invitation: { contest_supplier_id: target.id, contact_id: contact?.id || null, token_hash: crypto.createHash('sha256').update(token).digest('hex'), expires_at: expiresAt, delivery_status: provider === 'mock' ? 'ENVIO_SIMULADO' : 'PENDIENTE' } }
    })
    const invitations = payloads.map((payload) => payload.invitation)
    if (invitations.length) {
      const { error: invitationError } = await supabase.from('invitations').insert(invitations)
      if (invitationError) throw invitationError
      const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173'
      const outbox = payloads.map((payload) => {
        return { email: payload.contact?.email || 'sin-contacto@example.invalid', subject: `Invitación ${contest.code}`, body: `Accede al portal de proveedores para presentar tu propuesta en ${contest.title}: ${baseUrl}/portal?token=${payload.token}`, status: provider === 'mock' ? 'ENVIADO' : 'PENDIENTE', sent_at: provider === 'mock' ? new Date().toISOString() : null }
      })
      const { error: outboxError } = await supabase.from('notification_outbox').insert(outbox)
      if (outboxError) throw outboxError
    }
    return json(res, { ok: true, provider, status: provider === 'mock' ? 'ENVIO_SIMULADO' : 'EN_COLA', count: invitations.length, contest, createdBy: user.id, reference: crypto.randomUUID() }, 202)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo procesar la invitación' }, 500)
  }
}

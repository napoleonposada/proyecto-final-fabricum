import crypto from 'node:crypto'
import { createAdminClient, json, requireStaff } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { contestId, supplierIds = [] } = req.body || {}
    const selectedSupplierIds = [...new Set(Array.isArray(supplierIds) ? supplierIds.filter((id) => typeof id === 'string' && id) : [])]
    if (!contestId || !selectedSupplierIds.length) return json(res, { error: 'Selecciona al menos un proveedor para invitar' }, 400)
    if (selectedSupplierIds.length > 500) return json(res, { error: 'No puedes invitar a más de 500 proveedores en un solo envío' }, 400)
    const provider = process.env.EMAIL_PROVIDER || 'mock'
    const { user } = await requireStaff(req)
    const supabase = createAdminClient()
    const { data: contest, error: contestError } = await supabase.from('contests').select('id, code, title, status, proposal_deadline').eq('id', contestId).single()
    if (contestError) throw contestError
    if (!['BORRADOR', 'ABIERTO'].includes(contest.status)) return json(res, { error: 'Solo puedes invitar proveedores en concursos en borrador o abiertos' }, 409)
    const { data: suppliers, error: supplierError } = await supabase.from('suppliers').select('id, legal_name, active, supplier_contacts(id, email, is_primary)').in('id', selectedSupplierIds)
    if (supplierError) throw supplierError
    const supplierById = Object.fromEntries((suppliers || []).map((supplier) => [supplier.id, supplier]))
    const invalidSupplier = selectedSupplierIds.find((supplierId) => !supplierById[supplierId] || !supplierById[supplierId].active)
    if (invalidSupplier) return json(res, { error: 'Uno de los proveedores seleccionados no existe o está inactivo' }, 400)
    const contactBySupplier = Object.fromEntries((suppliers || []).map((supplier) => {
      const contact = supplier.supplier_contacts?.find((item) => item.is_primary) || supplier.supplier_contacts?.[0]
      return [supplier.id, contact]
    }))
    const withoutEmail = selectedSupplierIds.find((supplierId) => !contactBySupplier[supplierId]?.email)
    if (withoutEmail) return json(res, { error: `El proveedor ${supplierById[withoutEmail].legal_name} no tiene un contacto comercial con correo registrado` }, 400)

    const { data: existingRows, error: existingError } = await supabase.from('contest_suppliers').select('id, supplier_id').eq('contest_id', contestId).in('supplier_id', selectedSupplierIds)
    if (existingError) throw existingError
    const existingBySupplier = Object.fromEntries((existingRows || []).map((row) => [row.supplier_id, row]))
    const missingSupplierIds = selectedSupplierIds.filter((supplierId) => !existingBySupplier[supplierId])
    if (missingSupplierIds.length) {
      const { error: participantError } = await supabase.from('contest_suppliers').insert(missingSupplierIds.map((supplierId) => ({ contest_id: contestId, supplier_id: supplierId, invited_by: user.id })))
      if (participantError) throw participantError
    }
    const { data: targets, error: targetError } = await supabase.from('contest_suppliers').select('id, supplier_id').eq('contest_id', contestId).in('supplier_id', selectedSupplierIds)
    if (targetError) throw targetError
    const targetBySupplier = Object.fromEntries((targets || []).map((target) => [target.supplier_id, target]))
    const targetIds = (targets || []).map((target) => target.id)
    const { data: previousInvitations, error: previousError } = targetIds.length
      ? await supabase.from('invitations').select('contest_supplier_id').in('contest_supplier_id', targetIds).is('revoked_at', null)
      : { data: [], error: null }
    if (previousError) throw previousError
    const alreadyInvitedIds = new Set((previousInvitations || []).map((invitation) => invitation.contest_supplier_id))
    const targetsToInvite = selectedSupplierIds.map((supplierId) => targetBySupplier[supplierId]).filter((target) => target && !alreadyInvitedIds.has(target.id))
    const expiresAt = contest.proposal_deadline || new Date(Date.now() + 14 * 864e5).toISOString()
    const payloads = targetsToInvite.map((target) => {
      const contact = contactBySupplier[target.supplier_id]
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
    return json(res, { ok: true, provider, status: provider === 'mock' ? 'ENVIO_SIMULADO' : 'EN_COLA', count: invitations.length, alreadyInvitedCount: selectedSupplierIds.length - invitations.length, contest, createdBy: user.id, reference: crypto.randomUUID() }, 202)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo procesar la invitación' }, 500)
  }
}

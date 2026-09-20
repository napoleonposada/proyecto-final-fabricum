import { getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { contestId, totalAmount, currencyCode = 'PEN', taxesIncluded = true, technicalSummary = '' } = req.body || {}
    if (!contestId || !Number.isFinite(Number(totalAmount))) return json(res, { error: 'contestId y totalAmount son obligatorios' }, 400)
    const { client, user } = await getAuthenticatedUser(req)
    const { data: profile, error: profileError } = await client.from('profiles').select('supplier_id, role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'PROVEEDOR' || !profile.supplier_id) return json(res, { error: 'La sesión no corresponde a un proveedor' }, 403)
    const { data: contest, error: contestError } = await client.from('contests').select('id, status, reference_budget, currency_code, proposal_deadline').eq('id', contestId).single()
    if (contestError || !contest) return json(res, { error: 'Concurso no encontrado o sin permisos' }, 404)
    if (contest.status !== 'ABIERTO') return json(res, { error: 'El concurso no está abierto para recibir propuestas' }, 409)
    if (contest.proposal_deadline && new Date(contest.proposal_deadline).getTime() <= Date.now()) return json(res, { error: 'El plazo de presentación ha vencido' }, 409)
    if (String(currencyCode).toUpperCase() !== contest.currency_code) return json(res, { error: 'La moneda no coincide con las bases del concurso' }, 400)
    if (!Boolean(taxesIncluded)) return json(res, { error: 'El precio debe incluir impuestos' }, 400)
    if (Number(totalAmount) > Number(contest.reference_budget)) return json(res, { error: 'La propuesta supera el presupuesto referencial' }, 400)
    const { data: invitation, error: invitationError } = await client.from('contest_suppliers').select('id').eq('contest_id', contestId).eq('supplier_id', profile.supplier_id).maybeSingle()
    if (invitationError || !invitation) return json(res, { error: 'No estás invitado a este concurso' }, 403)
    const { data: existing, error: existingError } = await client.from('proposals').select('id, contest_id, status, created_at').eq('contest_id', contestId).eq('supplier_id', profile.supplier_id).maybeSingle()
    if (existingError) return json(res, { error: existingError.message }, 400)
    if (existing?.status && existing.status !== 'BORRADOR') return json(res, { error: 'La propuesta ya fue enviada y no puede reemplazarse' }, 409)
    if (existing) {
      const { data, error } = await client.from('proposals').update({ total_amount: Number(totalAmount), currency_code: currencyCode, taxes_included: Boolean(taxesIncluded), technical_summary: technicalSummary }).eq('id', existing.id).eq('status', 'BORRADOR').select('id, contest_id, status, created_at').single()
      if (error) return json(res, { error: error.message }, 400)
      return json(res, { ok: true, proposal: data }, 200)
    }
    const { data, error } = await client.from('proposals').insert({ contest_id: contestId, supplier_id: profile.supplier_id, status: 'BORRADOR', total_amount: Number(totalAmount), currency_code: currencyCode, taxes_included: Boolean(taxesIncluded), technical_summary: technicalSummary }).select('id, contest_id, status, created_at').single()
    if (error) return json(res, { error: error.message }, 400)
    return json(res, { ok: true, proposal: data }, 201)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo crear el borrador' }, error.message === 'Sesión no autenticada' ? 401 : 400)
  }
}

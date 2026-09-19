import { getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { contestId, totalAmount, currencyCode = 'PEN', taxesIncluded = true, technicalSummary = '' } = req.body || {}
    if (!contestId || !Number.isFinite(Number(totalAmount))) return json(res, { error: 'contestId y totalAmount son obligatorios' }, 400)
    const { client, user } = await getAuthenticatedUser(req)
    const { data: profile, error: profileError } = await client.from('profiles').select('supplier_id, role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'PROVEEDOR' || !profile.supplier_id) return json(res, { error: 'La sesión no corresponde a un proveedor' }, 403)
    const { data, error } = await client.from('proposals').insert({ contest_id: contestId, supplier_id: profile.supplier_id, status: 'BORRADOR', total_amount: Number(totalAmount), currency_code: currencyCode, taxes_included: Boolean(taxesIncluded), technical_summary: technicalSummary }).select('id, contest_id, status, created_at').single()
    if (error) return json(res, { error: error.message }, 400)
    return json(res, { ok: true, proposal: data }, 201)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo crear el borrador' }, error.message === 'Sesión no autenticada' ? 401 : 400)
  }
}

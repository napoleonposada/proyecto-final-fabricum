import crypto from 'node:crypto'
import { createAdminClient, getAuthenticatedUser, json, requireStaff } from '../_lib/supabaseServer.js'

const buckets = { contest: 'contest-documents', proposal: 'proposal-documents' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { documentType, fileName } = req.body || {}
    if (!buckets[documentType] || !fileName || !String(fileName).toLowerCase().endsWith('.pdf')) {
      return json(res, { error: 'documentType y un nombre PDF son obligatorios' }, 400)
    }

    let user
    if (documentType === 'contest') ({ user } = await requireStaff(req))
    else ({ user } = await getAuthenticatedUser(req))

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(buckets[documentType]).createSignedUploadUrl(path)
    if (error) throw error
    return json(res, { ok: true, bucket: buckets[documentType], path, token: data.token, signedUrl: data.signedUrl }, 201)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo preparar la carga' }, error.message === 'Sesión no autenticada' ? 401 : 400)
  }
}

import { createAdminClient, getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

const bucketByType = { contest: 'contest-documents', proposal: 'proposal-documents' }
const tableByType = { contest: 'contest_documents', proposal: 'proposal_documents' }

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const documentType = String(req.query?.documentType || '')
    const documentId = String(req.query?.documentId || '')
    if (!bucketByType[documentType] || !documentId) return json(res, { error: 'documentType y documentId son obligatorios' }, 400)
    const { client } = await getAuthenticatedUser(req)
    const { data: document, error } = await client.from(tableByType[documentType]).select('id, storage_path').eq('id', documentId).single()
    if (error || !document) return json(res, { error: 'Documento no encontrado o sin permisos' }, 404)
    const admin = createAdminClient()
    const { data, error: signedError } = await admin.storage.from(bucketByType[documentType]).createSignedUrl(document.storage_path, 300)
    if (signedError) throw signedError
    return json(res, { ok: true, url: data.signedUrl, expiresIn: 300 })
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo generar la URL firmada' }, error.message === 'Sesión no autenticada' ? 401 : 400)
  }
}

import { createAdminClient, getAuthenticatedUser, json } from '../_lib/supabaseServer.js'

const bucketByType = { contest: 'contest-documents', proposal: 'proposal-documents' }
const tableByType = { contest: 'contest_documents', proposal: 'proposal_documents' }

async function readDocument(req, documentType, documentId, storagePath) {
  const { client } = await getAuthenticatedUser(req)
  if (!documentId && documentType === 'contest' && storagePath) {
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', (await client.auth.getUser()).data.user.id).single()
    if (profileError || !['ADMIN', 'GESTOR', 'EVALUADOR', 'AUDITOR'].includes(profile?.role)) throw new Error('Se requiere un usuario gestor')
    return { client, table: 'contest_documents', row: { storage_path: storagePath } }
  }
  const table = tableByType[documentType]
  const { data, error } = await client.from(table).select('id, storage_path').eq('id', documentId).single()
  if (error || !data) throw new Error('Documento no encontrado o sin permisos')
  return { client, table, row: data }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Método no permitido' }, 405)
  try {
    const { documentType, documentId, storagePath } = req.body || {}
    if (!bucketByType[documentType] || (!documentId && !storagePath)) return json(res, { error: 'documentType y documentId o storagePath son obligatorios' }, 400)
    const { table, row } = await readDocument(req, documentType, documentId, storagePath)
    const admin = createAdminClient()
    // Cargar pdf-parse bajo demanda para no romper la inicialización de la
    // función serverless en solicitudes que no procesan documentos.
    const { PDFParse } = await import('pdf-parse')
    const { data: file, error: downloadError } = await admin.storage.from(bucketByType[documentType]).download(row.storage_path)
    if (downloadError) throw downloadError
    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) })
    const result = await parser.getText()
    await parser.destroy()
    const extractedText = String(result.text || '').replace(/\s+/g, ' ').trim()
    const pages = Number(result.total || result.pages?.length || 1)
    const minimumCharacters = Math.max(30, pages * 10)
    const scanned = extractedText.length < minimumCharacters
    const status = scanned ? 'ESCANEADO' : 'VALIDO'
    const update = documentType === 'contest'
      ? { text_validation_status: status, extracted_text: scanned ? null : extractedText }
      : { text_validation_status: status }
    if (documentId) {
      const { error: updateError } = await admin.from(table).update(update).eq('id', documentId)
      if (updateError) throw updateError
    }
    return json(res, { ok: !scanned, status, pages, characters: extractedText.length, reason: scanned ? 'El PDF no contiene una capa de texto seleccionable; parece escaneado.' : 'Texto extraído correctamente.' }, scanned ? 422 : 200)
  } catch (error) {
    return json(res, { error: error.message || 'No se pudo validar el PDF', status: 'INVALIDO' }, 400)
  }
}

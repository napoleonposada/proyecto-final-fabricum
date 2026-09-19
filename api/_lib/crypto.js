import crypto from 'node:crypto'

function keyBytes() {
  const source = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
  if (!source) throw new Error('CALENDAR_TOKEN_ENCRYPTION_KEY no está configurada')
  const decoded = Buffer.from(source, 'base64')
  return decoded.length === 32 ? decoded : crypto.createHash('sha256').update(source).digest()
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.')
}

export function decryptSecret(value) {
  const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.')
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Token cifrado inválido')
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8')
}

export function signState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', keyBytes()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export function verifyState(value) {
  const [encoded, signature] = String(value || '').split('.')
  if (!encoded || !signature) throw new Error('Estado OAuth inválido')
  const expected = crypto.createHmac('sha256', keyBytes()).update(encoded).digest('base64url')
  if (signature.length !== expected.length) throw new Error('Estado OAuth no coincide')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Estado OAuth no coincide')
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  if (!payload.exp || payload.exp < Date.now()) throw new Error('Estado OAuth expirado')
  return payload
}

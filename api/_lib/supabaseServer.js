import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export function createUserClient(req) {
  if (!url || !publishableKey) throw new Error('Supabase no está configurado')
  const auth = req.headers.authorization || ''
  return createClient(url, publishableKey, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createAdminClient() {
  if (!url || !secretKey) throw new Error('SUPABASE_SECRET_KEY no está configurada')
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function getAuthenticatedUser(req) {
  const client = createUserClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) throw new Error('Sesión no autenticada')
  return { client, user: data.user }
}

export async function requireStaff(req) {
  const { client, user } = await getAuthenticatedUser(req)
  const { data: profile, error } = await client.from('profiles').select('id, role, full_name').eq('id', user.id).single()
  if (error || !profile || !['ADMIN', 'GESTOR', 'EVALUADOR', 'AUDITOR'].includes(profile.role)) throw new Error('Se requiere un usuario gestor')
  return { client, user, profile }
}

export function json(res, body, status = 200) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body))
}

export function requireCron(req) {
  const expected = process.env.CRON_SECRET
  return Boolean(expected && req.headers.authorization === `Bearer ${expected}`)
}

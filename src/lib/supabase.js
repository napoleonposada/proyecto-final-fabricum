import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const demoMode = String(import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false'

export const isDemoMode = demoMode || !url || !key
export const supabase = !isDemoMode ? createClient(url, key) : null

export async function getCurrentUser() {
  if (isDemoMode) return { id: 'demo-manager', role: 'GESTOR', full_name: 'María Salazar' }
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function getCurrentProfile(userId) {
  if (isDemoMode) return { id: userId || 'demo-manager', role: 'GESTOR', full_name: 'María Salazar', supplier_id: null }
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, supplier_id').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

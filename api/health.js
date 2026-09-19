export default function handler(req, res) {
  res.status(200).json({ ok: true, service: 'licitia', demo: process.env.VITE_DEMO_MODE === 'true' || !process.env.SUPABASE_URL, emailProvider: process.env.EMAIL_PROVIDER || 'mock', timestamp: new Date().toISOString() })
}

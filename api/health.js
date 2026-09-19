export default function handler(req, res) {
  res.status(200).json({ ok: true, service: 'licitia', demo: process.env.EMAIL_PROVIDER === 'mock' || !process.env.SUPABASE_URL, timestamp: new Date().toISOString() })
}

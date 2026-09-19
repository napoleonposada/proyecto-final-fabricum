const now = new Date()
const isoIn = (days, hours = 0) => new Date(now.getTime() + ((days * 24 + hours) * 60 * 60 * 1000)).toISOString()

export const initialDemoState = {
  contests: [
    {
      id: 'c-014', code: 'CMP-2026-014', title: 'Servicio de mantenimiento integral',
      status: 'EN_EVALUACION', statusLabel: 'En evaluación', category: 'Servicios generales',
      budget: 185000, currency: 'PEN', deadline: isoIn(-2, 3), invited: 12, submitted: 8,
      progress: 76, manager: 'María Salazar', bases: 'Bases_Mantenimiento_2026_v2.pdf',
      requirements: 8, aiReady: 6, milestones: [
        { label: 'Publicación', date: '04 sep 2026', done: true },
        { label: 'Consultas', date: '09 sep 2026', done: true },
        { label: 'Cierre de propuestas', date: '17 sep 2026', done: true },
        { label: 'Adjudicación', date: '24 sep 2026', done: false },
      ],
      offers: [
        { supplier: 'Servicios Andinos S.A.C.', amount: 142000, result: 'APTA', reason: 'Cumple los 8 requisitos obligatorios.', review: 'Pendiente' },
        { supplier: 'Grupo Norte E.I.R.L.', amount: 151500, result: 'APTA', reason: 'Cumple requisitos; evidencia completa.', review: 'Confirmada' },
        { supplier: 'Mantenimiento Delta S.R.L.', amount: 168900, result: 'NO_APTA', reason: 'No acredita experiencia mínima.', review: 'Pendiente' },
        { supplier: 'Soluciones 360 S.A.C.', amount: 181200, result: 'APTA', reason: 'Cumple con observación en el plan de continuidad.', review: 'Pendiente' },
      ],
    },
    {
      id: 'c-015', code: 'CMP-2026-015', title: 'Implementación de plataforma de compras',
      status: 'ABIERTO', statusLabel: 'Abierto', category: 'Tecnología',
      budget: 320000, currency: 'PEN', deadline: isoIn(4, 6), invited: 18, submitted: 5,
      progress: 43, manager: 'María Salazar', bases: 'Bases_Plataforma_Compras_2026.pdf',
      requirements: 11, aiReady: 0, milestones: [
        { label: 'Publicación', date: '12 sep 2026', done: true },
        { label: 'Consultas', date: '19 sep 2026', done: false },
        { label: 'Cierre de propuestas', date: '23 sep 2026', done: false },
        { label: 'Adjudicación', date: '30 sep 2026', done: false },
      ], offers: [],
    },
    {
      id: 'c-013', code: 'CMP-2026-013', title: 'Suministro de equipos de protección',
      status: 'ADJUDICADO', statusLabel: 'Adjudicado', category: 'Suministros',
      budget: 95000, currency: 'PEN', deadline: isoIn(-18), invited: 9, submitted: 7,
      progress: 100, manager: 'María Salazar', bases: 'Bases_EPP_2026.pdf',
      requirements: 6, aiReady: 7, milestones: [
        { label: 'Publicación', date: '14 ago 2026', done: true },
        { label: 'Cierre de propuestas', date: '27 ago 2026', done: true },
        { label: 'Adjudicación', date: '02 sep 2026', done: true },
        { label: 'Contrato', date: '08 sep 2026', done: true },
      ], offers: [],
    },
  ],
  notifications: [
    { id: 'n1', type: 'warning', title: 'Adjudicación próxima', body: 'CMP-2026-014 tiene un hito en 5 días.', time: 'Hace 18 min', unread: true },
    { id: 'n2', type: 'info', title: 'Evaluaciones listas', body: '6 propuestas de mantenimiento están listas para revisión.', time: 'Hace 1 h', unread: true },
    { id: 'n3', type: 'success', title: 'Envío simulado completado', body: '18 invitaciones de CMP-2026-015 fueron procesadas.', time: 'Ayer', unread: false },
    { id: 'n4', type: 'info', title: 'Calendar conectado', body: 'Tu calendario personal está sincronizado.', time: 'Ayer', unread: false },
  ],
  activity: [
    { title: 'Se cerró la recepción de propuestas', detail: 'CMP-2026-014 · 17 sep 2026, 18:00', icon: 'lock', tone: 'purple' },
    { title: 'Invitaciones simuladas enviadas', detail: 'CMP-2026-015 · 18 proveedores', icon: 'send', tone: 'blue' },
    { title: 'Bases actualizadas', detail: 'CMP-2026-014 · versión 2', icon: 'file', tone: 'orange' },
  ],
}

export function formatCurrency(amount, currency = 'PEN') {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function cloneDemoState() {
  return JSON.parse(JSON.stringify(initialDemoState))
}

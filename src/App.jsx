import React, { useEffect, useState } from 'react'
import { formatCurrency, cloneDemoState } from './lib/demoData.js'
import { getCurrentProfile, getCurrentUser, isDemoMode, supabase } from './lib/supabase.js'

const navItems = [
  { id: 'dashboard', label: 'Resumen', icon: 'grid' },
  { id: 'contests', label: 'Concursos', icon: 'briefcase' },
  { id: 'suppliers', label: 'Proveedores', icon: 'users' },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell' },
  { id: 'portal', label: 'Portal proveedor', icon: 'file' },
]

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.48a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2h.48A1.7 1.7 0 0 0 8.04 11a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.42-1.42.06.06A1.7 1.7 0 0 0 11 8.04 1.7 1.7 0 0 0 12.03 6.5V6h2v.48A1.7 1.7 0 0 0 15.06 8a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06A1.7 1.7 0 0 0 18.04 11c.18.6.73 1.03 1.36 1.03H20v2h-.48A1.7 1.7 0 0 0 19.4 15Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function StatusPill({ status }) {
  const labels = { ABIERTO: 'Abierto', EN_EVALUACION: 'En evaluación', ADJUDICADO: 'Adjudicado', BORRADOR: 'Borrador', CERRADO: 'Cerrado' }
  return <span className={`status-pill status-${status.toLowerCase()}`}><span className="status-dot" />{labels[status] || status}</span>
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'
}

async function loadRemoteState() {
  const [contestsResult, suppliersResult, participantsResult, proposalsResult, notificationsResult, documentsResult, milestonesResult] = await Promise.all([
    supabase.from('contests').select('id, code, title, status, reference_budget, currency_code, proposal_deadline'),
    supabase.from('suppliers').select('id, legal_name, tags, active, supplier_contacts(full_name, email, is_primary)'),
    supabase.from('contest_suppliers').select('contest_id, supplier_id'),
    supabase.from('proposals').select('id, contest_id, supplier_id, status, total_amount, submitted_at'),
    supabase.from('notifications').select('id, kind, title, body, severity, read_at, created_at').order('created_at', { ascending: false }),
    supabase.from('contest_documents').select('contest_id, storage_path, version, text_validation_status').order('version', { ascending: false }),
    supabase.from('contest_milestones').select('contest_id, name, due_at, milestone_type').order('due_at'),
  ])
  const firstError = [contestsResult, suppliersResult, participantsResult, proposalsResult, notificationsResult, documentsResult, milestonesResult].find((item) => item.error)
  if (firstError) throw firstError.error
  const suppliers = (suppliersResult.data || []).map((supplier) => ({ id: supplier.id, name: supplier.legal_name, email: supplier.supplier_contacts?.find((contact) => contact.is_primary)?.email || supplier.supplier_contacts?.[0]?.email || '—', segment: supplier.tags?.[0] || 'General', active: supplier.active }))
  const suppliersById = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]))
  const invitedByContest = {}
  for (const participant of participantsResult.data || []) invitedByContest[participant.contest_id] = (invitedByContest[participant.contest_id] || 0) + 1
  const documentsByContest = {}
  for (const document of documentsResult.data || []) documentsByContest[document.contest_id] ||= document
  const milestonesByContest = {}
  for (const milestone of milestonesResult.data || []) (milestonesByContest[milestone.contest_id] ||= []).push({ label: milestone.name, date: formatDate(milestone.due_at), dueAt: milestone.due_at, milestoneType: milestone.milestone_type, done: new Date(milestone.due_at) < new Date() })
  const proposalsByContest = {}
  for (const proposal of proposalsResult.data || []) (proposalsByContest[proposal.contest_id] ||= []).push({ ...proposal, supplier: suppliersById[proposal.supplier_id]?.name || 'Proveedor', amount: Number(proposal.total_amount), result: proposal.status === 'NO_APTA' ? 'NO_APTA' : proposal.status === 'APTA' ? 'APTA' : 'PENDIENTE', reason: 'Revisión pendiente de la evaluación IA.', review: 'Pendiente' })
  const contests = (contestsResult.data || []).map((contest) => {
    const offers = proposalsByContest[contest.id] || []
    const invited = invitedByContest[contest.id] || 0
    return { id: contest.id, code: contest.code, title: contest.title, status: contest.status, statusLabel: contest.status, category: 'Proceso de contratación', budget: Number(contest.reference_budget), currency: contest.currency_code, deadline: contest.proposal_deadline || new Date().toISOString(), invited, submitted: offers.length, progress: invited ? Math.min(100, Math.round(offers.length / invited * 100)) : 0, manager: 'Gestor autenticado', bases: documentsByContest[contest.id]?.storage_path?.split('/').pop() || 'Bases pendientes de carga', requirements: 0, aiReady: offers.filter((offer) => offer.result !== 'PENDIENTE').length, milestones: milestonesByContest[contest.id] || [], offers }
  })
  const notifications = (notificationsResult.data || []).map((notification) => ({ id: notification.id, type: notification.severity?.toLowerCase() === 'warning' ? 'warning' : notification.severity?.toLowerCase() === 'critical' ? 'warning' : 'info', title: notification.title, body: notification.body, time: formatDate(notification.created_at), unread: !notification.read_at }))
  return { contests, suppliers, notifications, activity: [] }
}

function App() {
  const [state, setState] = useState(cloneDemoState)
  const [auth, setAuth] = useState(() => isDemoMode ? { loading: false, user: { id: 'demo-manager', full_name: 'María Salazar' }, profile: { id: 'demo-manager', full_name: 'María Salazar', role: 'GESTOR', supplier_id: null }, error: null } : { loading: true, user: null, profile: null, error: null })
  const [section, setSection] = useState('dashboard')
  const [selectedId, setSelectedId] = useState('c-014')
  const [detailTab, setDetailTab] = useState('resumen')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (isDemoMode) return undefined
    let active = true
    getCurrentUser().then(async (user) => {
      if (!active) return
      if (!user) return setAuth({ loading: false, user: null, profile: null, error: 'Inicia sesión para acceder al área de compras.' })
      let profile
      try { profile = await getCurrentProfile(user.id) } catch (profileError) { return setAuth({ loading: false, user: null, profile: null, error: `No se pudo cargar tu perfil: ${profileError.message}` }) }
      setAuth({ loading: false, user, profile, error: null })
      try {
        const remote = await loadRemoteState()
        if (active && remote.contests.length) {
          setState(remote)
          setSelectedId(remote.contests[0].id)
        }
      } catch (error) {
        if (active) setToast({ message: `No se pudieron cargar los datos de Supabase: ${error.message}`, tone: 'error' })
      }
    }).catch((error) => active && setAuth({ loading: false, user: null, profile: null, error: error.message }))
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && active) setAuth({ loading: false, user: null, profile: null, error: 'La sesión expiró. Vuelve a iniciar sesión.' })
    })
    return () => { active = false; subscription.data.subscription.unsubscribe() }
  }, [])

  const selectedContest = state.contests.find((contest) => contest.id === selectedId) || state.contests[0]
  const isSupplier = auth.profile?.role === 'PROVEEDOR' && Boolean(auth.profile?.supplier_id)
  const unread = state.notifications.filter((notification) => notification.unread).length

  useEffect(() => {
    if (!isSupplier && section === 'portal') setSection('dashboard')
  }, [isSupplier, section])

  const notify = (message, tone = 'success') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3200)
  }

  const publishContest = async () => {
    if (!isDemoMode) {
      const { error } = await supabase.from('contests').update({ status: 'ABIERTO', published_at: new Date().toISOString() }).eq('id', selectedId)
      if (error) return notify(error.message, 'error')
    }
    setState((current) => ({ ...current, contests: current.contests.map((c) => c.id === selectedId ? { ...c, status: 'ABIERTO', statusLabel: 'Abierto' } : c) }))
    notify('El concurso quedó publicado y listo para invitar proveedores.')
  }

  const createContest = async (form) => {
    const milestones = (form.milestones || []).filter((milestone) => milestone.name && milestone.dueAt).map((milestone) => ({ ...milestone, dueAt: new Date(milestone.dueAt).toISOString() }))
    const deadlineMilestone = milestones.find((milestone) => milestone.milestoneType === 'CIERRE') || milestones.find((milestone) => milestone.name.toLowerCase().includes('cierre'))
    if (!isDemoMode) {
      const { data, error } = await supabase.from('contests').insert({ code: `CMP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`, title: form.title, status: 'BORRADOR', reference_budget: Number(form.budget), currency_code: 'PEN', tax_included: true, proposal_deadline: deadlineMilestone?.dueAt || null, created_by: auth.user.id }).select('id, code, title, status, reference_budget, currency_code, proposal_deadline').single()
      if (error) return notify(error.message, 'error')
      if (milestones.length) {
        const { error: milestoneError } = await supabase.from('contest_milestones').insert(milestones.map((milestone) => ({ contest_id: data.id, name: milestone.name, milestone_type: milestone.milestoneType, due_at: milestone.dueAt, starts_at: milestone.startsAt ? new Date(milestone.startsAt).toISOString() : null })))
        if (milestoneError) return notify(`Concurso creado, pero no se pudo guardar el cronograma: ${milestoneError.message}`, 'error')
      }
      if (form.basesFile) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }
          const uploadResponse = await fetch('/api/documents/upload-url', { method: 'POST', headers, body: JSON.stringify({ documentType: 'contest', fileName: form.basesFile.name }) })
          const upload = await uploadResponse.json()
          if (!uploadResponse.ok) throw new Error(upload.error || 'No se pudo preparar el archivo')
          const { error: storageError } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, form.basesFile)
          if (storageError) throw storageError
          const validationResponse = await fetch('/api/documents/validate-pdf', { method: 'POST', headers, body: JSON.stringify({ documentType: 'contest', storagePath: upload.path }) })
          const validation = await validationResponse.json()
          if (!validationResponse.ok) { await supabase.storage.from(upload.bucket).remove([upload.path]); throw new Error(validation.reason || validation.error || 'El PDF fue rechazado') }
          const digest = await crypto.subtle.digest('SHA-256', await form.basesFile.arrayBuffer())
          const sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
          const { error: documentError } = await supabase.from('contest_documents').insert({ contest_id: data.id, document_type: 'BASES', version: 1, storage_path: upload.path, sha256, text_validation_status: validation.status, created_by: auth.user.id })
          if (documentError) throw documentError
        } catch (documentError) { notify(`Borrador creado, pero las bases no se pudieron validar: ${documentError.message}`, 'error') }
      }
      setState((current) => ({ ...current, contests: [{ id: data.id, code: data.code, title: data.title, status: data.status, statusLabel: 'Borrador', category: form.category, budget: Number(data.reference_budget), currency: data.currency_code, deadline: data.proposal_deadline || new Date(Date.now() + 14 * 864e5).toISOString(), invited: 0, submitted: 0, progress: 0, manager: auth.user.full_name || 'Gestor autenticado', bases: form.bases || 'Pendiente de carga', requirements: 0, aiReady: 0, milestones: milestones.map((milestone) => ({ label: milestone.name, date: formatDate(milestone.dueAt), dueAt: milestone.dueAt, milestoneType: milestone.milestoneType, done: false })), offers: [] }, ...current.contests] }))
      setModal(null); setSection('contests'); return notify('Borrador persistido en Supabase.')
    }
    const id = `c-${Date.now()}`
    setState((current) => ({
      ...current,
      contests: [{ id, code: `CMP-2026-${String(current.contests.length + 16).padStart(3, '0')}`, title: form.title, status: 'BORRADOR', statusLabel: 'Borrador', category: form.category, budget: Number(form.budget), currency: 'PEN', deadline: deadlineMilestone?.dueAt || new Date(Date.now() + 14 * 864e5).toISOString(), invited: 0, submitted: 0, progress: 8, manager: 'María Salazar', bases: form.bases || 'Pendiente de carga', requirements: 0, aiReady: 0, milestones: milestones.map((milestone) => ({ label: milestone.name, date: formatDate(milestone.dueAt), dueAt: milestone.dueAt, milestoneType: milestone.milestoneType, done: false })), offers: [] }, ...current.contests],
    }))
    setModal(null)
    setSection('contests')
    notify('Borrador creado. Completa las bases y el cronograma para publicar.')
  }

  const updateDraftContest = async (form) => {
    const milestones = (form.milestones || []).filter((milestone) => milestone.name && milestone.dueAt).map((milestone) => ({ ...milestone, dueAt: new Date(milestone.dueAt).toISOString() }))
    const deadlineMilestone = milestones.find((milestone) => milestone.milestoneType === 'CIERRE') || milestones.find((milestone) => milestone.name.toLowerCase().includes('cierre'))
    if (!isDemoMode) {
      const { error } = await supabase.from('contests').update({ title: form.title, reference_budget: Number(form.budget), proposal_deadline: deadlineMilestone?.dueAt || null }).eq('id', selectedId).eq('status', 'BORRADOR')
      if (error) return notify(error.message, 'error')
      const { error: deleteMilestonesError } = await supabase.from('contest_milestones').delete().eq('contest_id', selectedId)
      if (deleteMilestonesError) return notify(`No se pudo actualizar el cronograma: ${deleteMilestonesError.message}`, 'error')
      if (milestones.length) {
        const { error: milestoneError } = await supabase.from('contest_milestones').insert(milestones.map((milestone) => ({ contest_id: selectedId, name: milestone.name, milestone_type: milestone.milestoneType, due_at: milestone.dueAt, starts_at: milestone.startsAt ? new Date(milestone.startsAt).toISOString() : null })))
        if (milestoneError) return notify(`No se pudo guardar el cronograma: ${milestoneError.message}`, 'error')
      }
      if (form.basesFile) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }
          const uploadResponse = await fetch('/api/documents/upload-url', { method: 'POST', headers, body: JSON.stringify({ documentType: 'contest', fileName: form.basesFile.name }) })
          const upload = await uploadResponse.json()
          if (!uploadResponse.ok) throw new Error(upload.error || 'No se pudo preparar el archivo')
          const { error: storageError } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, form.basesFile)
          if (storageError) throw storageError
          const validationResponse = await fetch('/api/documents/validate-pdf', { method: 'POST', headers, body: JSON.stringify({ documentType: 'contest', storagePath: upload.path }) })
          const validation = await validationResponse.json()
          if (!validationResponse.ok) { await supabase.storage.from(upload.bucket).remove([upload.path]); throw new Error(validation.reason || validation.error || 'El PDF fue rechazado') }
          const digest = await crypto.subtle.digest('SHA-256', await form.basesFile.arrayBuffer())
          const sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
          const { data: latest } = await supabase.from('contest_documents').select('version').eq('contest_id', selectedId).eq('document_type', 'BASES').order('version', { ascending: false }).limit(1).maybeSingle()
          const { error: documentError } = await supabase.from('contest_documents').insert({ contest_id: selectedId, document_type: 'BASES', version: (latest?.version || 0) + 1, storage_path: upload.path, sha256, text_validation_status: validation.status, created_by: auth.user.id })
          if (documentError) throw documentError
        } catch (documentError) { return notify(`El borrador se actualizó, pero las bases no se pudieron sustituir: ${documentError.message}`, 'error') }
      }
    }
    setState((current) => ({ ...current, contests: current.contests.map((contest) => contest.id === selectedId ? { ...contest, title: form.title, budget: Number(form.budget), deadline: deadlineMilestone?.dueAt || contest.deadline, bases: form.bases || contest.bases, milestones: milestones.map((milestone) => ({ label: milestone.name, date: formatDate(milestone.dueAt), dueAt: milestone.dueAt, milestoneType: milestone.milestoneType, done: new Date(milestone.dueAt) < new Date() })) } : contest) }))
    setModal(null)
    notify('Borrador actualizado correctamente.')
  }

  const sendInvitations = async (count) => {
    if (!isDemoMode) {
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/invitations/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ contestId: selectedId, count }) })
      const payload = await response.json()
      if (!response.ok) return notify(payload.error || 'No se pudo procesar el envío', 'error')
    }
    setState((current) => ({
      ...current,
      contests: current.contests.map((c) => c.id === selectedId ? { ...c, invited: c.invited + count } : c),
      activity: [{ title: 'Invitaciones simuladas enviadas', detail: `${selectedContest.code} · ${count} proveedores`, icon: 'send', tone: 'blue' }, ...current.activity],
      notifications: [{ id: `n-${Date.now()}`, type: 'success', title: 'Envío simulado completado', body: `${count} invitaciones de ${selectedContest.code} fueron procesadas.`, time: 'Ahora', unread: true }, ...current.notifications],
    }))
    setModal(null)
    notify(`Se simularon ${count} invitaciones correctamente.`)
  }

  const markRead = async (id) => {
    if (!isDemoMode) await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setState((current) => ({ ...current, notifications: current.notifications.map((n) => n.id === id ? { ...n, unread: false } : n) }))
  }

  if (auth.loading) return <AuthLoading />
  if (!isDemoMode && !auth.user) return <AuthScreen error={auth.error} onLogin={async (email, password) => { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; const profile = await getCurrentProfile(data.user.id); setAuth({ loading: false, user: data.user, profile, error: null }) }} onRegister={async (fullName, email, password) => { const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }); if (error) throw error; if (data.session && data.user) { const profile = await getCurrentProfile(data.user.id); setAuth({ loading: false, user: data.user, profile, error: null }) }; return data }} />

  return (
    <div className="app-shell">
      <Sidebar section={section} setSection={setSection} unread={unread} isSupplier={isSupplier} />
      <main className="main-content">
        <Topbar unread={unread} demo={isDemoMode} onNotifications={() => setSection('notifications')} />
        <div className="content-wrap">
          {section === 'dashboard' && <DashboardView state={state} onNew={() => setModal('create')} onOpen={(id) => { setSelectedId(id); setSection('contests'); setDetailTab('resumen') }} />}
          {section === 'contests' && <ContestWorkspace contests={state.contests} selected={selectedContest} selectedId={selectedId} setSelectedId={setSelectedId} detailTab={detailTab} setDetailTab={setDetailTab} onNew={() => setModal('create')} onInvite={() => setModal('invite')} onPublish={publishContest} onEdit={() => setModal('edit')} onNotify={notify} />}
          {section === 'suppliers' && <SuppliersView suppliers={state.suppliers} onInvite={() => { setSection('contests'); setModal('invite') }} />}
          {section === 'notifications' && <NotificationsView notifications={state.notifications} onRead={markRead} />}
          {section === 'portal' && isSupplier && <SupplierPortal contest={state.contests.find((contest) => contest.status === 'ABIERTO') || state.contests[1]} onNotify={notify} />}
        </div>
      </main>
      {modal === 'create' && <CreateContestModal onClose={() => setModal(null)} onSubmit={createContest} />}
      {modal === 'edit' && selectedContest?.status === 'BORRADOR' && <CreateContestModal mode="edit" initialContest={selectedContest} onClose={() => setModal(null)} onSubmit={updateDraftContest} />}
      {modal === 'invite' && <InviteModal contest={selectedContest} onClose={() => setModal(null)} onSubmit={sendInvitations} />}
      {toast && <div className={`toast toast-${toast.tone}`}><Icon name="check" size={16} />{toast.message}</div>}
    </div>
  )
}

function Sidebar({ section, setSection, unread, isSupplier }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">L</div><div><strong>Licitia</strong><span>Procurement OS</span></div></div>
    <div className="workspace-switcher"><div className="workspace-avatar">F</div><div><strong>Fabricum</strong><span>Área de compras</span></div><span className="chevron">⌄</span></div>
    <p className="nav-label">Espacio de trabajo</p>
    <nav className="side-nav">
      {navItems.filter((item) => item.id !== 'portal' || isSupplier).map((item) => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'notifications' && unread > 0 && <b className="nav-badge">{unread}</b>}</button>)}
    </nav>
    <div className="sidebar-spacer" />
    <div className="calendar-connect"><div className="calendar-icon"><Icon name="calendar" size={17} /></div><div><strong>Calendar</strong><span>Conectado</span></div><span className="online-dot" /></div>
    <button className="nav-item muted"><Icon name="settings" /><span>Configuración</span></button>
    <div className="user-card"><div className="user-avatar">MS</div><div><strong>María Salazar</strong><span>Gestora</span></div><span className="user-more">•••</span></div>
  </aside>
}

function Topbar({ unread, demo, onNotifications }) {
  return <header className="topbar"><div className="breadcrumb"><span>Área de compras</span><span className="slash">/</span><strong>Resumen</strong></div><div className="topbar-actions">{demo && <span className="demo-badge"><span className="demo-dot" />Modo demostración</span>}<button className="icon-button" onClick={onNotifications} aria-label="Notificaciones"><Icon name="bell" size={19} />{unread > 0 && <span className="notification-dot" />}</button><button className="help-button">?</button></div></header>
}

function DashboardView({ state, onNew, onOpen }) {
  const openCount = state.contests.filter((c) => c.status === 'ABIERTO').length
  return <>
    <div className="page-heading"><div><p className="eyebrow">Sábado, 19 de septiembre de 2026</p><h1>Buenos días, María <span className="wave">✦</span></h1><p className="page-subtitle">Este es el estado de tus procesos de contratación.</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" size={17} />Nuevo concurso</button></div>
    <div className="metrics-grid">
      <MetricCard label="Concursos activos" value={openCount + 1} note="1 requiere atención" tone="purple" icon="briefcase" />
      <MetricCard label="Propuestas recibidas" value="20" note="+12% vs. mes anterior" tone="blue" icon="file" />
      <MetricCard label="Por evaluar" value="6" note="CMP-2026-014" tone="orange" icon="clock" />
      <MetricCard label="Próximo vencimiento" value="5 días" note="Adjudicación · CMP-2026-014" tone="green" icon="calendar" />
    </div>
    <div className="dashboard-grid">
      <section className="panel panel-wide"><div className="panel-header"><div><h2>Concursos recientes</h2><p>Un vistazo a tus procesos en curso.</p></div><button className="text-button" onClick={() => onOpen(state.contests[0].id)}>Ver todos <Icon name="arrow" size={15} /></button></div><div className="contest-table"><div className="table-head"><span>Concurso</span><span>Estado</span><span>Propuestas</span><span>Avance</span><span /></div>{state.contests.slice(0, 3).map((contest) => <button className="table-row" key={contest.id} onClick={() => onOpen(contest.id)}><div className="contest-name"><div className="contest-icon"><Icon name="briefcase" size={16} /></div><div><strong>{contest.title}</strong><span>{contest.code} · {contest.category}</span></div></div><StatusPill status={contest.status} /><span className="proposals-count"><strong>{contest.submitted}</strong> / {contest.invited}</span><div className="mini-progress"><div><span style={{ width: `${contest.progress}%` }} /></div><small>{contest.progress}%</small></div><Icon name="arrow" size={16} /></button>)}</div></section>
      <section className="panel"><div className="panel-header"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados.</p></div></div><ActivityList items={state.activity} /></section>
    </div>
    <section className="panel timeline-panel"><div className="panel-header"><div><h2>Próximos hitos</h2><p>Fechas importantes de tus concursos.</p></div><button className="text-button">Abrir Calendar <Icon name="external" size={14} /></button></div><div className="timeline"><div className="timeline-line" />{state.contests.slice(0, 2).map((contest) => <div className="timeline-item" key={contest.id}><div className="timeline-date"><strong>{contest.milestones.find((m) => !m.done)?.date || '—'}</strong><span>{contest.code}</span></div><div className="timeline-marker" /><div><strong>{contest.milestones.find((m) => !m.done)?.label || 'Sin pendientes'}</strong><span>{contest.title}</span></div><span className="timeline-days">En {contest.id === 'c-014' ? '5 días' : '4 días'}</span></div>)}</div></section>
  </>
}

function MetricCard({ label, value, note, tone, icon }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon name={icon} size={18} /></div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small className={tone === 'green' ? 'positive' : ''}>{note}</small></div><span className="metric-arrow">↗</span></div>
}

function ActivityList({ items }) {
  return <div className="activity-list">{items.map((item, index) => <div className="activity-item" key={`${item.title}-${index}`}><div className={`activity-icon ${item.tone}`}><Icon name={item.icon} size={15} /></div><div><strong>{item.title}</strong><span>{item.detail}</span></div><span className="activity-time">{index === 0 ? 'Ahora' : 'Ayer'}</span></div>)}</div>
}

function ContestWorkspace({ contests, selected, selectedId, setSelectedId, detailTab, setDetailTab, onNew, onInvite, onPublish, onEdit, onNotify }) {
  const [query, setQuery] = useState('')
  const filtered = contests.filter((contest) => contest.title.toLowerCase().includes(query.toLowerCase()) || contest.code.toLowerCase().includes(query.toLowerCase()))
  return <div className="workspace-grid"><section className="contest-list-panel"><div className="page-heading compact"><div><p className="eyebrow">Gestión de procesos</p><h1>Concursos</h1><p className="page-subtitle">Administra concursos, propuestas y adjudicaciones.</p></div><button className="primary-button" onClick={onNew}><Icon name="plus" size={17} />Nuevo</button></div><div className="list-toolbar"><div className="search-field"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar concurso..." /></div><button className="filter-button">Todos <span>⌄</span></button></div><div className="contest-list">{filtered.map((contest) => <button key={contest.id} className={`contest-list-item ${selectedId === contest.id ? 'selected' : ''}`} onClick={() => setSelectedId(contest.id)}><div className="contest-list-top"><span className="contest-code">{contest.code}</span><StatusPill status={contest.status} /></div><strong>{contest.title}</strong><span className="contest-list-category">{contest.category}</span><div className="contest-list-meta"><span><Icon name="users" size={13} />{contest.invited} invitados</span><span><Icon name="file" size={13} />{contest.submitted} propuestas</span></div></button>)}</div></section><section className="detail-panel"><ContestDetail contest={selected} detailTab={detailTab} setDetailTab={setDetailTab} onInvite={onInvite} onPublish={onPublish} onEdit={onEdit} onNotify={onNotify} /></section></div>
}

function ContestDetail({ contest, detailTab, setDetailTab, onInvite, onPublish, onEdit, onNotify }) {
  const tabs = [['resumen', 'Resumen'], ['propuestas', 'Propuestas'], ['evaluacion', 'Evaluación IA'], ['ranking', 'Ranking económico'], ['auditoria', 'Auditoría']]
  return <><div className="detail-heading"><div><div className="detail-code"><span>{contest.code}</span><StatusPill status={contest.status} /></div><h1>{contest.title}</h1><p>{contest.category} · Responsable: {contest.manager}</p></div><div className="detail-actions">{contest.status === 'BORRADOR' ? <><button className="secondary-button" onClick={onEdit}>Editar borrador</button><button className="primary-button" onClick={onPublish}>Publicar concurso</button></> : <button className="secondary-button" onClick={onInvite}><Icon name="send" size={15} />Invitar proveedores</button>}<button className="more-button">•••</button></div></div><div className="detail-tabs">{tabs.map(([id, label]) => <button key={id} className={detailTab === id ? 'active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'propuestas' && <span className="tab-count">{contest.submitted}</span>}{id === 'evaluacion' && contest.aiReady > 0 && <span className="tab-count purple-count">{contest.aiReady}</span>}</button>)}</div>{detailTab === 'resumen' && <Overview contest={contest} onNotify={onNotify} />}{detailTab === 'propuestas' && <Proposals contest={contest} />}{detailTab === 'evaluacion' && <Evaluation contest={contest} onNotify={onNotify} />}{detailTab === 'ranking' && <Ranking contest={contest} />}{detailTab === 'auditoria' && <AuditLog contest={contest} />}</>
}

function Overview({ contest, onNotify }) {
  const remaining = Math.ceil((new Date(contest.deadline).getTime() - Date.now()) / 864e5)
  return <div className="detail-body"><div className="overview-cards"><div className="overview-stat"><span>Presupuesto referencial</span><strong>{formatCurrency(contest.budget, contest.currency)}</strong><small>Impuestos incluidos · {contest.currency}</small></div><div className="overview-stat"><span>Recepción de propuestas</span><strong>{remaining > 0 ? `En ${remaining} días` : 'Cerrada'}</strong><small>{remaining > 0 ? '23 sep 2026, 18:00' : '17 sep 2026, 18:00'}</small></div><div className="overview-stat"><span>Participación</span><strong>{contest.submitted} <em>/ {contest.invited}</em></strong><small>{contest.invited ? Math.round(contest.submitted / contest.invited * 100) : 0}% de proveedores</small></div></div><div className="overview-grid"><section className="inner-panel"><div className="inner-heading"><div><h3>Documentos del concurso</h3><p>Versiones aprobadas y disponibles.</p></div><button className="icon-text-button"><Icon name="download" size={15} />Descargar</button></div><div className="document-row"><div className="document-icon"><Icon name="file" size={18} /></div><div><strong>{contest.bases}</strong><span>PDF · Versión 2 · Texto validado</span></div><span className="doc-status"><Icon name="check" size={14} />Válido</span></div></section><section className="inner-panel"><div className="inner-heading"><div><h3>Cronograma</h3><p>Hitos principales del proceso.</p></div><button className="icon-text-button" onClick={() => onNotify('Las fechas se sincronizarán con tu Calendar.') }><Icon name="calendar" size={15} />Calendar</button></div><div className="milestone-list">{contest.milestones.map((milestone) => <div className={`milestone-row ${milestone.done ? 'done' : ''}`} key={milestone.label}><span className="milestone-check">{milestone.done && <Icon name="check" size={12} />}</span><div><strong>{milestone.label}</strong><span>{milestone.date}</span></div></div>)}</div></section></div><section className="attention-callout"><div className="callout-icon"><Icon name="clock" size={17} /></div><div><strong>{contest.status === 'EN_EVALUACION' ? `${contest.aiReady} evaluaciones listas para revisión` : 'Próximo hito: cierre de propuestas'}</strong><span>{contest.status === 'EN_EVALUACION' ? 'Revisa el resultado de la IA y confirma la admisibilidad de cada propuesta.' : 'Recuerda que las propuestas se sellan automáticamente al llegar la fecha límite.'}</span></div><button className="text-button" onClick={() => onNotify('Se abrió el centro de notificaciones.')}>Ver notificaciones <Icon name="arrow" size={14} /></button></section></div>
}

function Proposals({ contest }) {
  const closed = contest.status === 'EN_EVALUACION' || contest.status === 'ADJUDICADO' || contest.status === 'CERRADO'
  return <div className="detail-body"><div className="section-title-row"><div><h2>Propuestas recibidas</h2><p>{closed ? 'La recepción está cerrada. Los documentos están disponibles para revisión.' : 'Las propuestas se mantienen ocultas hasta el cierre del concurso.'}</p></div><span className="sealed-label"><Icon name="lock" size={14} />{closed ? 'Recepción cerrada' : 'Recepción sellada'}</span></div>{!closed && <div className="sealed-empty"><div className="sealed-art"><Icon name="lock" size={24} /></div><h3>Las propuestas están selladas</h3><p>Podrás consultar los documentos e importes cuando finalice el plazo de presentación.</p><div className="sealed-counter"><span>Propuestas recibidas</span><strong>{contest.submitted}</strong></div></div>}{closed && <div className="proposal-table"><div className="table-head"><span>Proveedor</span><span>Envío</span><span>Documentos</span><span>Estado</span><span /></div>{(contest.offers.length ? contest.offers : [{ supplier: 'Propuestas registradas', amount: 0, result: 'APTA', reason: '', review: 'Pendiente' }]).map((offer) => <div className="table-row proposal-row" key={offer.supplier}><div className="contest-name"><div className="supplier-avatar">{offer.supplier.slice(0, 1)}</div><div><strong>{offer.supplier}</strong><span>Enviada el 17 sep 2026 · 17:{Math.floor(Math.random() * 50 + 10)}</span></div></div><span className="doc-checks"><Icon name="check" size={13} />Técnica <Icon name="check" size={13} />Económica</span><span className="review-status"><span className="status-dot" />{offer.review}</span><button className="ghost-action">Abrir <Icon name="arrow" size={14} /></button></div>)}</div>}</div>
}

function Evaluation({ contest, onNotify }) {
  if (contest.status === 'ABIERTO' || contest.status === 'BORRADOR') return <div className="detail-body"><div className="sealed-empty evaluation-locked"><div className="sealed-art soft"><Icon name="lock" size={24} /></div><h3>Evaluación disponible al cierre</h3><p>El agente de IA comenzará después del vencimiento del plazo, cuando las propuestas sean abiertas.</p><span className="muted-note"><Icon name="clock" size={14} />Cierre previsto: 23 sep 2026, 18:00</span></div></div>
  return <div className="detail-body"><div className="section-title-row"><div><h2>Evaluación previa</h2><p>Resultado de Ollama Cloud pendiente de confirmación humana.</p></div><button className="secondary-button" onClick={() => onNotify('Las evaluaciones pendientes se procesarán en segundo plano.')}><Icon name="external" size={15} />Ver guía</button></div><div className="ai-summary"><div className="ai-summary-icon">✦</div><div><strong>Agente de evaluación completado</strong><span>Modelo: gpt-oss:120b · Prompt v1.0 · 19 sep 2026, 09:42</span></div><div className="ai-summary-stat"><strong>{contest.aiReady}</strong><span>listas para revisar</span></div></div><div className="evaluation-list">{contest.offers.map((offer) => <div className="evaluation-row" key={offer.supplier}><div className="supplier-avatar">{offer.supplier.slice(0, 1)}</div><div className="evaluation-supplier"><strong>{offer.supplier}</strong><span>{offer.reason}</span></div><span className={`ai-result ${offer.result === 'APTA' ? 'apta' : 'no-apta'}`}><span />{offer.result === 'APTA' ? 'APTA' : 'NO APTA'}</span><span className="review-chip">{offer.review === 'Confirmada' ? <><Icon name="check" size={13} />Confirmada</> : 'Pendiente'}</span><button className="review-button" onClick={() => onNotify(`Se abrió la propuesta de ${offer.supplier}.`)}>Revisar <Icon name="arrow" size={14} /></button></div>)}</div><div className="ai-footnote"><span>✦</span><p>La clasificación es una preevaluación. Descarga la propuesta, verifica la evidencia y confirma el resultado para continuar con el ranking económico.</p></div></div>
}

function Ranking({ contest }) {
  const admitted = contest.offers.filter((offer) => offer.result === 'APTA').sort((a, b) => a.amount - b.amount)
  const amounts = admitted.map((offer) => offer.amount)
  const average = amounts.length ? amounts.reduce((total, amount) => total + amount, 0) / amounts.length : 0
  return <div className="detail-body"><div className="section-title-row"><div><h2>Ranking económico</h2><p>Solo incluye propuestas aptas y dentro del presupuesto.</p></div><span className="sealed-label success"><Icon name="check" size={14} />Precios con impuestos</span></div><div className="economic-cards"><div><span>Mínimo admitido</span><strong>{formatCurrency(amounts[0] || 0)}</strong></div><div><span>Promedio admitido</span><strong>{formatCurrency(average)}</strong></div><div><span>Máximo admitido</span><strong>{formatCurrency(amounts[amounts.length - 1] || 0)}</strong></div><div><span>Presupuesto</span><strong>{formatCurrency(contest.budget)}</strong></div></div><div className="ranking-table"><div className="table-head"><span>#</span><span>Proveedor</span><span>Monto total</span><span>Distancia al presupuesto</span><span>Estado</span></div>{admitted.map((offer, index) => <div className="ranking-row" key={offer.supplier}><strong className="rank-number">{String(index + 1).padStart(2, '0')}</strong><div className="contest-name"><div className="supplier-avatar">{offer.supplier.slice(0, 1)}</div><strong>{offer.supplier}</strong></div><strong>{formatCurrency(offer.amount)}</strong><span className="budget-distance">-{formatCurrency(contest.budget - offer.amount)}</span><span className="ai-result apta"><span />Admitida</span></div>)}{!admitted.length && <div className="empty-table">Aún no hay propuestas admitidas para mostrar.</div>}</div></div>
}

function AuditLog({ contest }) {
  return <div className="detail-body"><div className="section-title-row"><div><h2>Auditoría del expediente</h2><p>Cada acción conserva usuario, fecha y hora de servidor.</p></div><button className="icon-text-button"><Icon name="download" size={15} />Exportar</button></div><div className="audit-list"><AuditItem time="17 sep 2026 · 18:00:00" title="Recepción de propuestas cerrada" detail={`${contest.submitted} propuestas selladas automáticamente`} tone="purple" /><AuditItem time="17 sep 2026 · 17:42:18" title="Propuesta registrada" detail="Servicios Andinos S.A.C. · comprobante emitido" tone="blue" /><AuditItem time="12 sep 2026 · 10:14:06" title="Bases actualizadas" detail={`${contest.bases} · hash verificado`} tone="orange" /><AuditItem time="04 sep 2026 · 09:00:00" title="Concurso publicado" detail="Invitaciones habilitadas para proveedores seleccionados" tone="green" /></div></div>
}

function AuditItem({ time, title, detail, tone }) { return <div className="audit-item"><div className={`audit-dot ${tone}`} /><div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div> }

function SuppliersView({ suppliers: remoteSuppliers = [], onInvite }) {
  const demoSuppliers = [['Servicios Andinos S.A.C.', 'contacto@andinos.pe', 'Servicios generales', '12 concursos'], ['Grupo Norte E.I.R.L.', 'comercial@gruponorte.pe', 'Tecnología', '7 concursos'], ['Mantenimiento Delta S.R.L.', 'ventas@delta.pe', 'Servicios generales', '4 concursos'], ['Soluciones 360 S.A.C.', 'hola@soluciones360.pe', 'Tecnología', '9 concursos']]
  const suppliers = remoteSuppliers.length ? remoteSuppliers.map((supplier) => [supplier.name, supplier.email, supplier.segment, supplier.active ? 'Activo' : 'Inactivo']) : demoSuppliers
  return <><div className="page-heading"><div><p className="eyebrow">Directorio comercial</p><h1>Proveedores</h1><p className="page-subtitle">Contactos comerciales y segmentos para tus invitaciones.</p></div><button className="primary-button" onClick={onInvite}><Icon name="send" size={16} />Invitar a concurso</button></div><section className="panel suppliers-panel"><div className="list-toolbar"><div className="search-field"><Icon name="search" size={16} /><input placeholder="Buscar proveedor o contacto..." /></div><button className="filter-button">Todos los segmentos <span>⌄</span></button></div><div className="supplier-table"><div className="table-head"><span>Proveedor</span><span>Contacto comercial</span><span>Segmento</span><span>Participación</span><span>Estado</span></div>{suppliers.map(([name, email, segment, participation]) => <div className="table-row supplier-row" key={name}><div className="contest-name"><div className="supplier-avatar">{name.slice(0, 1)}</div><strong>{name}</strong></div><span>{email}</span><span className="tag">{segment}</span><span>{participation}</span><span className="active-label"><span />{remoteSuppliers.length ? participation : 'Activo'}</span></div>)}</div></section></>
}

function NotificationsView({ notifications, onRead }) {
  return <><div className="page-heading"><div><p className="eyebrow">Seguimiento</p><h1>Notificaciones</h1><p className="page-subtitle">Hitos, vencimientos y actividad de tus concursos.</p></div><button className="secondary-button"><Icon name="check" size={15} />Marcar todo como leído</button></div><section className="panel notifications-panel"><div className="notification-filters"><button className="active">Todas <span>{notifications.length}</span></button><button>No leídas <span>{notifications.filter((n) => n.unread).length}</span></button><button>Críticas</button></div><div className="full-notification-list">{notifications.map((notification) => <button className={`full-notification ${notification.unread ? 'unread' : ''}`} key={notification.id} onClick={() => onRead(notification.id)}><div className={`notification-type ${notification.type}`}><Icon name={notification.type === 'warning' ? 'clock' : notification.type === 'success' ? 'check' : 'bell'} size={17} /></div><div><strong>{notification.title}</strong><span>{notification.body}</span></div><time>{notification.time}</time>{notification.unread && <span className="unread-dot" />}</button>)}</div></section></>
}

function SupplierPortal({ contest: activeContest, onNotify }) {
  const [submitted, setSubmittedState] = useState(false)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const contest = activeContest || { id: 'c-015', code: 'CMP-2026-015', title: 'Implementación de plataforma de compras', category: 'Tecnología', deadline: new Date(Date.now() + 4 * 864e5).toISOString(), currency: 'PEN' }
  const submitProposal = async () => {
    if (isDemoMode) return setSubmittedState(true)
    setSubmitting(true); setSubmitError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }
      const draftResponse = await fetch('/api/proposals/create', { method: 'POST', headers, body: JSON.stringify({ contestId: contest.id, totalAmount: 142000, currencyCode: contest.currency || 'PEN', taxesIncluded: true, technicalSummary: 'Propuesta técnica validada por el portal.' }) })
      const draft = await draftResponse.json()
      if (!draftResponse.ok) throw new Error(draft.error || 'No se pudo crear el borrador')
      const finalResponse = await fetch('/api/proposals/finalize', { method: 'POST', headers, body: JSON.stringify({ proposalId: draft.proposal.id }) })
      const final = await finalResponse.json()
      if (!finalResponse.ok) throw new Error(final.error || 'No se pudo enviar la propuesta')
      setSubmittedState(true)
    } catch (error) { setSubmitError(error.message) } finally { setSubmitting(false) }
  }
  const setSubmitted = (value) => { if (value === true && !isDemoMode) return submitProposal(); setSubmittedState(value) }
  useEffect(() => { if (submitError) onNotify(submitError, 'error') }, [submitError])
  return <><div className="page-heading"><div><p className="eyebrow">Acceso de proveedor · demostración</p><h1>Portal proveedor</h1><p className="page-subtitle">Presenta tu propuesta de forma segura y recibe tu comprobante.</p></div><span className="supplier-session"><span />Sesión autenticada</span></div><section className="portal-card"><div className="portal-card-header"><div><div className="detail-code"><span>CMP-2026-015</span><StatusPill status="ABIERTO" /></div><h2>Implementación de plataforma de compras</h2><p>Área de Tecnología · Fabricum</p></div><div className="portal-deadline"><span>Plazo de entrega</span><strong>23 sep 2026, 18:00</strong><small>Faltan 4 días</small></div></div><div className="portal-body"><div className="portal-stepper">{[['1', 'Datos'], ['2', 'Técnica'], ['3', 'Económica'], ['4', 'Confirmar']].map(([number, label], index) => <div className={`portal-step ${step > index ? 'done' : ''} ${step === index + 1 ? 'current' : ''}`} key={number}><span>{step > index + 1 ? <Icon name="check" size={12} /> : number}</span><strong>{label}</strong></div>)}</div>{submitted ? <div className="receipt-card"><div className="receipt-check"><Icon name="check" size={25} /></div><h3>Propuesta enviada correctamente</h3><p>Tu propuesta fue sellada con fecha y hora de servidor. No es posible reemplazarla.</p><div className="receipt-number"><span>Comprobante</span><strong>REC-2026-015-008</strong><small>19 sep 2026 · 09:58:41 (America/Lima)</small></div><button className="secondary-button" onClick={() => onNotify('El comprobante está listo para descargar.') }><Icon name="download" size={15} />Descargar comprobante</button></div> : <div className="portal-form-area"><div className="portal-form-main"><h3>{step === 1 ? 'Datos de presentación' : step === 2 ? 'Propuesta técnica' : step === 3 ? 'Oferta económica' : 'Confirmación final'}</h3><p className="form-help">{step === 1 ? 'Confirma los datos de la empresa que presentará la propuesta.' : step === 2 ? 'Carga un PDF con texto seleccionable. Los escaneos serán rechazados.' : step === 3 ? 'El monto debe estar en PEN e incluir todos los impuestos.' : 'Revisa la información antes del envío definitivo.'}</p>{step === 1 && <div className="portal-fields"><label>Empresa<input value="Servicios Andinos S.A.C." readOnly /></label><label>Contacto comercial<input value="Ana Torres · ana@andinos.pe" readOnly /></label></div>}{step === 2 && <div className="upload-box portal-upload"><Icon name="file" size={21} /><div><strong>Propuesta_tecnica.pdf</strong><span>PDF · 2.4 MB · Texto validado</span></div><span className="doc-status"><Icon name="check" size={13} />Válido</span></div>}{step === 3 && <div className="portal-fields"><label>Monto total con impuestos<input value="142000" readOnly /><small>Moneda fijada por el concurso: PEN</small></label><label className="check-line"><input type="checkbox" checked readOnly /> Confirmo que el precio incluye impuestos</label></div>}{step === 4 && <div className="final-review"><div><span>Propuesta técnica</span><strong>Propuesta_tecnica.pdf · Válida</strong></div><div><span>Oferta económica</span><strong>S/ 142,000 · Impuestos incluidos</strong></div><div className="final-warning"><Icon name="lock" size={15} /><span>Después de enviar no podrás modificar ni reemplazar tu propuesta.</span></div></div>}<div className="portal-actions">{step > 1 && <button className="secondary-button" onClick={() => setStep(step - 1)}>Atrás</button>}<button className="primary-button" onClick={() => step < 4 ? setStep(step + 1) : setSubmitted(true)}>{step < 4 ? 'Continuar' : 'Enviar propuesta'} <Icon name="arrow" size={15} /></button></div></div><aside className="portal-side"><h4>Documentos del concurso</h4><div className="portal-document"><Icon name="file" size={16} /><div><strong>Bases_Plataforma_Compras.pdf</strong><span>Versión 1 · 3.8 MB</span></div><Icon name="download" size={15} /></div><div className="portal-help"><span>i</span><p>¿Tienes dudas? Revisa las bases antes de enviar tu propuesta.</p></div></aside></div>}</div></section></>
}

function Modal({ title, subtitle, children, onClose, wide = false }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${wide ? 'modal-wide' : ''}`}><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button></div>{children}</div></div> }

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const defaultMilestones = [
  { name: 'Publicación', milestoneType: 'PUBLICACION', dueAt: '' },
  { name: 'Consultas', milestoneType: 'CONSULTAS', dueAt: '' },
  { name: 'Cierre de propuestas', milestoneType: 'CIERRE', dueAt: '' },
  { name: 'Adjudicación', milestoneType: 'ADJUDICACION', dueAt: '' },
]

function CreateContestModal({ onClose, onSubmit, mode = 'create', initialContest }) {
  const initialMilestones = initialContest?.milestones?.length
    ? initialContest.milestones.map((milestone) => ({ name: milestone.label, milestoneType: milestone.milestoneType || 'ENTREGABLE', dueAt: toDateTimeLocal(milestone.dueAt) }))
    : defaultMilestones
  const [form, setForm] = useState({ title: initialContest?.title || '', category: initialContest?.category || 'Servicios generales', budget: initialContest?.budget || '', bases: initialContest?.bases || '', basesFile: null, milestones: initialMilestones })
  const [fileError, setFileError] = useState(null)
  const chooseFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setFileError('Solo se aceptan archivos PDF.')
    setFileError(null); setForm({ ...form, bases: file.name, basesFile: file })
  }
  return <Modal title={mode === 'edit' ? 'Editar borrador' : 'Nuevo concurso'} subtitle={mode === 'edit' ? 'Mientras el concurso siga en borrador puedes ajustar el presupuesto, cronograma y versión de las bases.' : 'Crea un borrador y completa el expediente antes de publicar.'} onClose={onClose} wide><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}><label>Nombre del concurso<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Servicio de limpieza" /></label><div className="form-row"><label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Servicios generales</option><option>Tecnología</option><option>Suministros</option><option>Consultoría</option></select></label><label>Presupuesto referencial<input required type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} placeholder="0" /><small>Moneda: PEN · impuestos incluidos</small></label></div><fieldset className="schedule-fieldset"><legend>Cronograma del concurso</legend><p className="form-help">Define las fechas y horas de cada hito. El cierre determina automáticamente el plazo de recepción.</p>{form.milestones.map((milestone, index) => <div className="schedule-row" key={`${milestone.milestoneType}-${index}`}><input aria-label={`Nombre del hito ${index + 1}`} value={milestone.name} onChange={(event) => setForm({ ...form, milestones: form.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} /><input aria-label={`Fecha del hito ${index + 1}`} type="datetime-local" value={milestone.dueAt} required={milestone.milestoneType === 'CIERRE'} onChange={(event) => setForm({ ...form, milestones: form.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, dueAt: event.target.value } : item) })} />{form.milestones.length > 1 && <button type="button" className="icon-button" aria-label="Quitar hito" onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, itemIndex) => itemIndex !== index) })}><Icon name="close" size={15} /></button>}</div>)}<button type="button" className="text-button" onClick={() => setForm({ ...form, milestones: [...form.milestones, { name: '', milestoneType: 'ENTREGABLE', dueAt: '' }] })}><Icon name="plus" size={14} />Agregar hito</button></fieldset><label>Bases del concurso <span className="label-note">PDF con texto seleccionable · {mode === 'edit' ? 'puedes cargar una nueva versión' : 'los escaneos serán rechazados'}</span><div className="upload-box"><Icon name="file" size={20} /><div><strong>{form.bases || 'Selecciona un PDF'}</strong><span>{fileError || (form.basesFile ? 'Listo para validar al guardar.' : mode === 'edit' ? 'Conserva la versión actual si no seleccionas otro archivo.' : 'Los documentos escaneados serán rechazados automáticamente.')}</span></div><input type="file" accept="application/pdf,.pdf" onChange={chooseFile} /></div></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{mode === 'edit' ? 'Guardar cambios' : 'Crear borrador'} <Icon name="arrow" size={15} /></button></div></form></Modal>
}

function LegacyCreateContestModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', category: 'Servicios generales', budget: '', bases: '' })
  return <Modal title="Nuevo concurso" subtitle="Crea un borrador y completa el expediente antes de publicar." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}><label>Nombre del concurso<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Servicio de limpieza" /></label><div className="form-row"><label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Servicios generales</option><option>Tecnología</option><option>Suministros</option><option>Consultoría</option></select></label><label>Presupuesto referencial<input required type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} placeholder="0" /><small>Moneda: PEN · impuestos incluidos</small></label></div><label>Bases del concurso <span className="label-note">PDF con texto seleccionable</span><div className="upload-box"><Icon name="file" size={20} /><div><strong>Arrastra el PDF aquí</strong><span>Los documentos escaneados serán rechazados.</span></div><button type="button" className="secondary-button">Seleccionar archivo</button></div></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">Crear borrador <Icon name="arrow" size={15} /></button></div></form></Modal>
}

function InviteModal({ contest, onClose, onSubmit }) {
  const [count, setCount] = useState(12)
  return <Modal title="Invitar proveedores" subtitle={`${contest.code} · envío simulado para demostración`} onClose={onClose}><div className="invite-summary"><div className="invite-icon"><Icon name="send" size={22} /></div><div><strong>Envío seguro y segmentado</strong><span>Cada proveedor recibirá un enlace de un solo uso con fecha de vencimiento.</span></div></div><div className="segment-selector"><span>Segmento seleccionado</span><button className="segment-choice"><span className="segment-dot" />Proveedores de {contest.category}<span>⌄</span></button></div><div className="invite-count"><span>Contactos a invitar</span><strong>{count}</strong><div className="count-controls"><button onClick={() => setCount(Math.max(1, count - 1))}>−</button><button onClick={() => setCount(count + 1)}>+</button></div></div><div className="simulation-note"><span>i</span><p>El correo no se enviará externamente. Se generará un registro en la bandeja de simulación para revisar la plantilla y el enlace.</p></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={() => onSubmit(count)}>Simular envío <Icon name="send" size={15} /></button></div></Modal>
}

function AuthLoading() {
  return <div className="auth-screen"><div className="auth-card"><div className="brand-mark">L</div><h1>Cargando Licitia</h1><p>Comprobando tu sesión segura…</p></div></div>
}

function AuthScreen({ error, onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(error)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(null)
    try {
      if (mode === 'login') await onLogin(form.email, form.password)
      else {
        const result = await onRegister(form.fullName, form.email, form.password)
        if (result?.session) setMessage('Cuenta creada. Iniciando sesión…')
        else setMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.')
        setMode('login')
      }
    } catch (loginError) { setMessage(loginError.message || (mode === 'login' ? 'No se pudo iniciar sesión' : 'No se pudo crear la cuenta')) } finally { setBusy(false) }
  }
  return <div className="auth-screen"><div className="auth-card"><div className="auth-brand"><div className="brand-mark">L</div><div><strong>Licitia</strong><span>Procurement OS</span></div></div><p className="eyebrow">Área de compras · Fabricum</p><h1>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1><p className="page-subtitle">{mode === 'login' ? 'Accede al expediente de concursos y propuestas.' : 'Registra tus datos para solicitar acceso al portal.'}</p><form onSubmit={submit} className="auth-form">{mode === 'register' && <label>Nombre completo<input type="text" required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>}<label>Correo electrónico<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Contraseña<input type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{message && <p className="auth-error">{message}</p>}<button className="primary-button" disabled={busy}>{busy ? (mode === 'login' ? 'Validando…' : 'Creando…') : (mode === 'login' ? 'Entrar' : 'Crear cuenta')} <Icon name="arrow" size={15} /></button></form><button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null) }}>{mode === 'login' ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia sesión'}</button>{mode === 'register' && <p className="auth-note">Las cuentas nuevas quedan como usuarios internos hasta que un gestor las vincule a un proveedor registrado.</p>}</div></div>
}

export default App

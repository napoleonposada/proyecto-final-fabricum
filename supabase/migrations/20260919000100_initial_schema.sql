-- Licitia: single-company procurement workflow.
-- All timestamps are timezone-aware and default to the database clock.

create extension if not exists pgcrypto;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  tax_id text,
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'GESTOR' check (role in ('ADMIN', 'GESTOR', 'EVALUADOR', 'AUDITOR', 'PROVEEDOR')),
  supplier_id uuid references public.suppliers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  status text not null default 'BORRADOR' check (status in ('BORRADOR', 'PUBLICADO', 'ABIERTO', 'CERRADO', 'EN_EVALUACION', 'ADJUDICADO', 'CANCELADO')),
  reference_budget numeric(18,2) not null check (reference_budget >= 0),
  currency_code text not null default 'PEN' check (currency_code ~ '^[A-Z]{3}$'),
  tax_included boolean not null default true,
  proposal_deadline timestamptz,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contest_documents (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  document_type text not null default 'BASES' check (document_type in ('BASES', 'ADDENDUM')),
  version integer not null default 1 check (version > 0),
  storage_path text not null,
  sha256 text not null,
  extracted_text text,
  text_validation_status text not null default 'PENDIENTE' check (text_validation_status in ('PENDIENTE', 'VALIDO', 'ESCANEADO', 'INVALIDO')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (contest_id, document_type, version)
);

create table if not exists public.contest_milestones (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  name text not null,
  milestone_type text not null check (milestone_type in ('PUBLICACION', 'CONSULTAS', 'CIERRE', 'EVALUACION', 'ADJUDICACION', 'CONTRATO', 'ENTREGABLE')),
  starts_at timestamptz,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contest_requirements (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  code text not null,
  description text not null,
  is_mandatory boolean not null default true,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contest_id, code)
);

create table if not exists public.contest_suppliers (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (contest_id, supplier_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  contest_supplier_id uuid not null references public.contest_suppliers(id) on delete cascade,
  contact_id uuid references public.supplier_contacts(id),
  token_hash text not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  delivery_status text not null default 'PENDIENTE' check (delivery_status in ('PENDIENTE', 'ENVIO_SIMULADO', 'ENTREGADO', 'REBOTE', 'ERROR')),
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  status text not null default 'BORRADOR' check (status in ('BORRADOR', 'ENVIADA', 'NO_ADMITIDA', 'APTA', 'NO_APTA')),
  technical_summary text,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  total_amount numeric(18,2) not null check (total_amount >= 0),
  taxes_included boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, supplier_id)
);

create table if not exists public.proposal_documents (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  document_type text not null check (document_type in ('TECNICA', 'ECONOMICA')),
  storage_path text not null,
  sha256 text not null,
  text_validation_status text not null default 'PENDIENTE' check (text_validation_status in ('PENDIENTE', 'VALIDO', 'ESCANEADO', 'INVALIDO')),
  created_at timestamptz not null default now(),
  unique (proposal_id, document_type)
);

create table if not exists public.proposal_answers (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  requirement_id uuid not null references public.contest_requirements(id),
  answer text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, requirement_id)
);

create table if not exists public.ai_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  result text check (result in ('APTA', 'NO_APTA')),
  processing_status text not null default 'PENDIENTE' check (processing_status in ('PENDIENTE', 'PROCESANDO', 'COMPLETADA', 'REVISION_MANUAL', 'ERROR')),
  rationale text,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_evaluation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_evaluation_runs(id) on delete cascade,
  requirement_id uuid not null references public.contest_requirements(id),
  result text not null check (result in ('CUMPLE', 'NO_CUMPLE', 'NO_DETERMINADO')),
  evidence text,
  page_number integer,
  created_at timestamptz not null default now()
);

create table if not exists public.human_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_evaluation_runs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('APTA', 'NO_APTA')),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id),
  proposal_id uuid not null references public.proposals(id),
  contract_number text,
  status text not null default 'BORRADOR' check (status in ('BORRADOR', 'VIGENTE', 'FINALIZADO', 'CANCELADO')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_id)
);

create table if not exists public.contract_milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name text not null,
  due_at timestamptz not null,
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'VENCIDO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  contest_id uuid references public.contests(id),
  kind text not null,
  title text not null,
  body text not null,
  severity text not null default 'INFO' check (severity in ('INFO', 'WARNING', 'CRITICAL')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id),
  email text not null,
  subject text not null,
  body text not null,
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ERROR')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'google',
  calendar_id text not null,
  encrypted_refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  contest_id uuid references public.contests(id),
  contract_milestone_id uuid references public.contract_milestones(id),
  google_event_id text not null,
  source_hash text not null,
  last_synced_at timestamptz not null default now(),
  unique (connection_id, google_event_id)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create schema if not exists private;
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create index if not exists contest_suppliers_contest_idx on public.contest_suppliers (contest_id);
create index if not exists contest_suppliers_supplier_idx on public.contest_suppliers (supplier_id);
create index if not exists proposals_contest_idx on public.proposals (contest_id);
create index if not exists proposals_supplier_idx on public.proposals (supplier_id);
create index if not exists proposals_status_idx on public.proposals (contest_id, status);
create index if not exists proposal_documents_proposal_idx on public.proposal_documents (proposal_id);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notification_outbox_pending_idx on public.notification_outbox (status, available_at);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['suppliers','profiles','supplier_contacts','contests','contest_milestones','contracts','contract_milestones','calendar_connections','proposals'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.enforce_proposal_submission()
returns trigger language plpgsql as $$
declare
  contest_row public.contests%rowtype;
begin
  if old.status = 'ENVIADA' and new.status <> old.status then
    raise exception 'La propuesta enviada es inmutable';
  end if;

  if new.status = 'ENVIADA' and old.status = 'BORRADOR' then
    select * into contest_row from public.contests where id = new.contest_id for update;
    if contest_row.proposal_deadline is null or clock_timestamp() > contest_row.proposal_deadline then
      raise exception 'El plazo de presentación ha vencido';
    end if;
    if new.currency_code <> contest_row.currency_code then
      raise exception 'La moneda no coincide con las bases del concurso';
    end if;
    if new.taxes_included is not true then
      raise exception 'El precio debe incluir impuestos';
    end if;
    if new.total_amount > contest_row.reference_budget then
      raise exception 'La propuesta supera el presupuesto referencial';
    end if;
    new.submitted_at = clock_timestamp();
  end if;
  return new;
end;
$$;

drop trigger if exists proposals_submission_guard on public.proposals;
create trigger proposals_submission_guard before update on public.proposals
for each row execute function public.enforce_proposal_submission();

-- Only authenticated users can use the Data API. RLS remains the authorization layer.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['suppliers','profiles','supplier_contacts','contests','contest_documents','contest_milestones','contest_requirements','contest_suppliers','invitations','proposals','proposal_documents','proposal_answers','ai_evaluation_runs','ai_evaluation_items','human_reviews','contracts','contract_milestones','notifications','notification_outbox','calendar_connections','calendar_events','audit_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Staff helper. It is SECURITY INVOKER and only reads the caller's own profile.
create or replace function public.is_staff()
returns boolean language sql stable security invoker as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('ADMIN', 'GESTOR', 'EVALUADOR', 'AUDITOR')
  );
$$;

create policy profiles_self_select on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy suppliers_staff_select on public.suppliers for select to authenticated using ((select public.is_staff()));
create policy suppliers_staff_write on public.suppliers for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contests_staff_all on public.contests for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contest_documents_staff_all on public.contest_documents for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contest_milestones_staff_all on public.contest_milestones for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contest_requirements_staff_all on public.contest_requirements for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contest_suppliers_staff_all on public.contest_suppliers for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contest_suppliers_provider_select on public.contest_suppliers for select to authenticated
using (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())));
create policy contests_provider_select on public.contests for select to authenticated
using (exists (select 1 from public.contest_suppliers cs where cs.contest_id = id and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))));
create policy contest_documents_provider_select on public.contest_documents for select to authenticated
using (exists (select 1 from public.contest_suppliers cs where cs.contest_id = contest_id and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))));
create policy contest_milestones_provider_select on public.contest_milestones for select to authenticated
using (exists (select 1 from public.contest_suppliers cs where cs.contest_id = contest_id and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))));
create policy supplier_contacts_provider_select on public.supplier_contacts for select to authenticated
using (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())));
create policy invitations_staff_all on public.invitations for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy proposals_staff_after_close on public.proposals for select to authenticated
using ((select public.is_staff()) and exists (
  select 1 from public.contests c where c.id = contest_id and c.proposal_deadline is not null and clock_timestamp() >= c.proposal_deadline
));
create policy proposals_supplier_select on public.proposals for select to authenticated
using (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())));
create policy proposals_supplier_insert on public.proposals for insert to authenticated
with check (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())) and status = 'BORRADOR');
create policy proposals_supplier_update_draft on public.proposals for update to authenticated
using (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())) and status = 'BORRADOR')
with check (supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid())));

create policy proposal_documents_staff_after_close on public.proposal_documents for select to authenticated
using (exists (select 1 from public.proposals p join public.contests c on c.id = p.contest_id where p.id = proposal_id and (select public.is_staff()) and c.proposal_deadline is not null and clock_timestamp() >= c.proposal_deadline));
create policy proposal_documents_supplier on public.proposal_documents for all to authenticated
using (exists (select 1 from public.proposals p where p.id = proposal_id and p.supplier_id = (select pr.supplier_id from public.profiles pr where pr.id = (select auth.uid())) and p.status = 'BORRADOR'))
with check (exists (select 1 from public.proposals p where p.id = proposal_id and p.supplier_id = (select pr.supplier_id from public.profiles pr where pr.id = (select auth.uid())) and p.status = 'BORRADOR'));
create policy proposal_answers_supplier on public.proposal_answers for all to authenticated
using (exists (select 1 from public.proposals p where p.id = proposal_id and p.supplier_id = (select pr.supplier_id from public.profiles pr where pr.id = (select auth.uid())) and p.status = 'BORRADOR'))
with check (exists (select 1 from public.proposals p where p.id = proposal_id and p.supplier_id = (select pr.supplier_id from public.profiles pr where pr.id = (select auth.uid())) and p.status = 'BORRADOR'));

create policy ai_runs_staff_after_close on public.ai_evaluation_runs for select to authenticated using ((select public.is_staff()) and exists (
  select 1 from public.proposals p join public.contests c on c.id = p.contest_id
  where p.id = proposal_id and c.proposal_deadline is not null and clock_timestamp() >= c.proposal_deadline
));
create policy ai_items_staff_after_close on public.ai_evaluation_items for select to authenticated using ((select public.is_staff()) and exists (
  select 1 from public.ai_evaluation_runs r join public.proposals p on p.id = r.proposal_id join public.contests c on c.id = p.contest_id
  where r.id = run_id and c.proposal_deadline is not null and clock_timestamp() >= c.proposal_deadline
));
create policy reviews_staff_all on public.human_reviews for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contracts_staff_all on public.contracts for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contract_milestones_staff_all on public.contract_milestones for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy notifications_self on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_self_update on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy calendar_connections_self_insert on public.calendar_connections for insert to authenticated with check (user_id = (select auth.uid()));
create policy calendar_connections_self_update on public.calendar_connections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy calendar_connections_self_delete on public.calendar_connections for delete to authenticated using (user_id = (select auth.uid()));
create policy calendar_events_self on public.calendar_events for select to authenticated using (exists (select 1 from public.calendar_connections c where c.id = connection_id and c.user_id = (select auth.uid())));

-- The outbox and audit log are server-owned. No browser role receives policies.

-- Private file buckets. Managers upload through the authenticated client; server
-- functions issue signed URLs for controlled downloads after the contest closes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contest-documents', 'contest-documents', false, null, array['application/pdf']::text[]),
  ('proposal-documents', 'proposal-documents', false, null, array['application/pdf']::text[])
on conflict (id) do update set public = excluded.public, allowed_mime_types = excluded.allowed_mime_types;

create policy contest_documents_storage_staff_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'contest-documents' and (select public.is_staff()));
create policy contest_documents_storage_staff_select on storage.objects
for select to authenticated
using (bucket_id = 'contest-documents' and (select public.is_staff()));
create policy contest_documents_storage_staff_update on storage.objects
for update to authenticated
using (bucket_id = 'contest-documents' and (select public.is_staff()))
with check (bucket_id = 'contest-documents' and (select public.is_staff()));
create policy contest_documents_storage_staff_delete on storage.objects
for delete to authenticated
using (bucket_id = 'contest-documents' and (select public.is_staff()));

create policy proposal_documents_storage_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'proposal-documents' and owner_id = (select auth.uid())::text);
create policy proposal_documents_storage_owner_select on storage.objects
for select to authenticated
using (bucket_id = 'proposal-documents' and (owner_id = (select auth.uid())::text or (select public.is_staff())));
create policy proposal_documents_storage_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'proposal-documents' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'proposal-documents' and owner_id = (select auth.uid())::text);
create policy proposal_documents_storage_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'proposal-documents' and owner_id = (select auth.uid())::text);

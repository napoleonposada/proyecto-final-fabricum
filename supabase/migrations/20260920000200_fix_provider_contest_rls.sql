-- Corrige las referencias a la fila externa en las políticas RLS del portal proveedor.
-- Sin calificar la columna, PostgreSQL resolvía contest_id/id contra el alias interno cs.

drop policy if exists contests_provider_select on public.contests;
create policy contests_provider_select on public.contests for select to authenticated
using (exists (
  select 1
  from public.contest_suppliers cs
  where cs.contest_id = public.contests.id
    and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))
));

drop policy if exists contest_documents_provider_select on public.contest_documents;
create policy contest_documents_provider_select on public.contest_documents for select to authenticated
using (exists (
  select 1
  from public.contest_suppliers cs
  where cs.contest_id = public.contest_documents.contest_id
    and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))
));

drop policy if exists contest_milestones_provider_select on public.contest_milestones;
create policy contest_milestones_provider_select on public.contest_milestones for select to authenticated
using (exists (
  select 1
  from public.contest_suppliers cs
  where cs.contest_id = public.contest_milestones.contest_id
    and cs.supplier_id = (select p.supplier_id from public.profiles p where p.id = (select auth.uid()))
));

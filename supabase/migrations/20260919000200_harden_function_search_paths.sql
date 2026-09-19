-- Harden function resolution against search_path injection.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.enforce_proposal_submission() set search_path = public, pg_temp;
alter function public.is_staff() set search_path = public, pg_temp;
alter function private.handle_new_user() set search_path = public, private, pg_temp;

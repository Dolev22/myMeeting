-- Supabase projects normally get baseline table grants for anon/authenticated/
-- service_role via its own bootstrap. This project's tables were created over
-- a direct Postgres connection, so grant them explicitly (RLS policies still
-- apply on top of these grants — this only clears the table-level ACL).

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.profiles,
  public.leads,
  public.lead_notes,
  public.meetings,
  public.deals
to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

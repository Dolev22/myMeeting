-- Removes unrelated tables that pre-existed in this Supabase project
-- (a different, unrelated CRM template schema) before installing myMeeting's
-- own schema. Confirmed with the project owner that this data is not needed.

drop table if exists public.tasks cascade;
drop table if exists public.deals cascade;
drop table if exists public.contacts cascade;
drop table if exists public.companies cascade;

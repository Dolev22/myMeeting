-- myMeeting CRM V2: tasks (follow-up items linked to a lead)
-- Mirrors the meetings/deals table shape and RLS pattern from 0001_init.sql.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  name text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  assigned_to text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_lead_id_idx on public.tasks (lead_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);

alter table public.tasks enable row level security;

drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 0002_grants.sql set default privileges for future tables in this schema,
-- but grant explicitly too in case that doesn't carry over for this table.
grant select, insert, update, delete on public.tasks to authenticated, service_role;

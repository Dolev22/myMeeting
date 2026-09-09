-- myMeeting CRM: conversations (logged calls/conversations linked to a lead)
-- Mirrors the meetings/tasks table shape and RLS pattern from 0001_init.sql
-- and 0006_tasks.sql. `transcription` exists now so a future AI feature can
-- fill it in; no AI call happens from this migration or the app code yet.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  occurred_at timestamptz not null,
  duration_minutes int not null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  notes text,
  transcription text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists conversations_lead_id_idx on public.conversations (lead_id);
create index if not exists conversations_occurred_at_idx on public.conversations (occurred_at);

alter table public.conversations enable row level security;

drop policy if exists "conversations_all_own" on public.conversations;
create policy "conversations_all_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- 0002_grants.sql set default privileges for future tables in this schema,
-- but grant explicitly too in case that doesn't carry over for this table.
grant select, insert, update, delete on public.conversations to authenticated, service_role;

-- AI Website Analysis feature: a lead can carry a website URL, and each
-- analysis run against it is stored (not just the latest) for history.

alter table public.leads add column if not exists website text;

create table if not exists public.ai_website_analyses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  summary text not null,
  findings text not null,
  recommendations text not null,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_website_analyses_lead_id_idx
  on public.ai_website_analyses (lead_id);
create index if not exists ai_website_analyses_user_id_idx
  on public.ai_website_analyses (user_id);

alter table public.ai_website_analyses enable row level security;

drop policy if exists "ai_website_analyses_all_own" on public.ai_website_analyses;
create policy "ai_website_analyses_all_own" on public.ai_website_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_website_analyses
  to authenticated, service_role;

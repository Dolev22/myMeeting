-- myMeeting CRM: initial schema (profiles, leads, lead_notes, meetings, deals)
-- Matches docs/plan.md section 4. Only the tables the current UI uses are
-- created here; integration_events / ai_meeting_insights / ai_website_analyses
-- are added when the Cal.com and AI features are built.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  locale text not null default 'he' check (locale in ('he', 'en')),
  cal_com_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep `updated_at` current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  company text,
  source text not null check (source in ('website', 'referral', 'cold_call', 'social_media', 'cal_com', 'other')),
  status text not null default 'new_lead' check (status in ('new_lead', 'meeting_scheduled', 'meeting_completed', 'deal_closed', 'deal_lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads (user_id);

alter table public.leads enable row level security;

create policy "leads_all_own" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_notes
-- ---------------------------------------------------------------------------
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_id_idx on public.lead_notes (lead_id);
create index if not exists lead_notes_user_id_idx on public.lead_notes (user_id);

alter table public.lead_notes enable row level security;

create policy "lead_notes_all_own" on public.lead_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null,
  method text not null check (method in ('in_person', 'phone', 'zoom', 'google_meet', 'cal_com', 'other')),
  location_or_link text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'canceled', 'no_show')),
  notes text,
  cal_com_booking_uid text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_user_id_idx on public.meetings (user_id);
create index if not exists meetings_lead_id_idx on public.meetings (lead_id);

alter table public.meetings enable row level security;

create policy "meetings_all_own" on public.meetings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  value numeric not null default 0,
  currency text not null default 'ILS',
  product_or_service text,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_user_id_idx on public.deals (user_id);
create index if not exists deals_lead_id_idx on public.deals (lead_id);

alter table public.deals enable row level security;

create policy "deals_all_own" on public.deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

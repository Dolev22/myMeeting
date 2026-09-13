-- myMeeting CRM: WhatsApp integration (Module 9 - Step 6)
--
-- Adds a WhatsApp source for leads, a per-business "connected number" on
-- profiles (mirrors profiles.cal_com_username's role of resolving which CRM
-- account an inbound webhook event belongs to — see docs on the Cal.com
-- webhook in app/api/webhooks/cal-com/route.ts), and a conversation/message
-- pair modeling a WhatsApp thread. This is a distinct shape from
-- `conversations` (a single logged call/meeting record) since a WhatsApp
-- thread accumulates many individual messages over time.

alter table public.leads
  drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
    check (source in ('website', 'referral', 'cold_call', 'social_media', 'cal_com', 'whatsapp', 'other'));

alter table public.integration_events
  drop constraint if exists integration_events_source_check;
alter table public.integration_events
  add constraint integration_events_source_check
    check (source in ('cal_com', 'whatsapp'));

-- The WhatsApp number this CRM account is "connected" to. In mock mode this
-- is a deterministic placeholder auto-assigned on first use (see
-- lib/whatsapp/business-number.ts); with a real WasenderAPI session this
-- would be the actual connected business number, resolved by the webhook
-- exactly the same way.
alter table public.profiles
  add column if not exists whatsapp_phone_number text unique;

-- ---------------------------------------------------------------------------
-- whatsapp_conversations
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  phone_number text not null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_message_direction text check (last_message_direction in ('incoming', 'outgoing')),
  unread boolean not null default false,
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, phone_number)
);

create index if not exists whatsapp_conversations_user_id_idx on public.whatsapp_conversations (user_id);
create index if not exists whatsapp_conversations_lead_id_idx on public.whatsapp_conversations (lead_id);
create index if not exists whatsapp_conversations_last_message_at_idx
  on public.whatsapp_conversations (last_message_at desc);

alter table public.whatsapp_conversations enable row level security;

drop policy if exists "whatsapp_conversations_all_own" on public.whatsapp_conversations;
create policy "whatsapp_conversations_all_own" on public.whatsapp_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists whatsapp_conversations_set_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_set_updated_at
  before update on public.whatsapp_conversations
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.whatsapp_conversations to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- whatsapp_messages
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing')),
  is_ai_generated boolean not null default false,
  body text not null,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_id_idx
  on public.whatsapp_messages (conversation_id, created_at);
create index if not exists whatsapp_messages_user_id_idx on public.whatsapp_messages (user_id);
-- Idempotency: a redelivered webhook event (same provider message id) must
-- not create a second row. Partial index since a manually-sent message from
-- the mock provider always gets a generated id, but a future real provider
-- might occasionally omit one.
create unique index if not exists whatsapp_messages_provider_message_id_idx
  on public.whatsapp_messages (conversation_id, provider_message_id)
  where provider_message_id is not null;

alter table public.whatsapp_messages enable row level security;

drop policy if exists "whatsapp_messages_all_own" on public.whatsapp_messages;
create policy "whatsapp_messages_all_own" on public.whatsapp_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.whatsapp_messages to authenticated, service_role;

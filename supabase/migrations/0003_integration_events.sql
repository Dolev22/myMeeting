-- integration_events: logs every raw inbound webhook payload (Cal.com for
-- now) for debugging/replay. Matches docs/plan.md section 4. Only the
-- service role (used by the webhook route handler, which has no logged-in
-- user) touches this table — no RLS policies needed for end users since it
-- is never queried by the app on their behalf.

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('cal_com')),
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  received_at timestamptz not null default now()
);

create index if not exists integration_events_received_at_idx
  on public.integration_events (received_at desc);

alter table public.integration_events enable row level security;
-- No policies: only the service role (which bypasses RLS) reads/writes this
-- table, so it is inaccessible to every anon/authenticated request.

grant select, insert, update, delete on public.integration_events to service_role;

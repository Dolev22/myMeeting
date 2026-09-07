# myMeeting

A CRM for small businesses to manage leads, meetings, and deals, with a
Hebrew/RTL-first UI (English/LTR ready). Full architecture in
[`docs/plan.md`](./docs/plan.md).

## Current status

The app is backed by a real **Supabase** project — Postgres, Auth, and Row
Level Security. Cal.com and the AI features are **not connected yet**.

**Built:**
- Leads: list with search/filter, create, edit, delete, status changes, internal notes.
- Meetings: list (upcoming/past), create, edit, delete, linked to a lead.
- Deals: list, create, edit, delete, linked to a lead; marking a deal won/lost updates the lead's status.
- Dashboard with key counts and upcoming meetings.
- Hebrew (default, RTL) / English (LTR) toggle, fully translated UI.
- Real authentication via **Supabase Auth** (email/password sign-up and sign-in), with **Row Level Security** enforcing that every user only ever sees their own leads/meetings/deals/notes — enforced by the database itself, not application code. Two demo accounts are seeded for testing isolation (see below).

**Not built yet** (see `docs/plan.md` for the design):
- Cal.com webhook integration.
- AI Meeting Summary & Follow-Up feature.
- AI Website Analysis module.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the login screen. Use one of the
**demo accounts** shown on the login page (`dana@example.com` /
`yossi@example.com`, password `demo1234`) or sign up with a new email.

### Database setup (for a fresh Supabase project)

1. Run the migrations in `supabase/migrations/` in order (`0001_init.sql` then
   `0002_grants.sql`) against your project — via the SQL Editor, or any
   Postgres client pointed at your project's connection string.
2. Seed the two demo accounts and sample data:
   ```bash
   node --env-file=.env.local scripts/seed-demo-data.mjs
   ```
   Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (see below). Safe to
   re-run — it skips users/data that already exist.

## Project structure

- `app/(auth)` — login/signup, backed by Supabase Auth.
- `app/(dashboard)` — the CRM itself, guarded by the Supabase session.
- `lib/supabase/` — browser/server Supabase client factories.
- `lib/repo/*` — data-access functions (Supabase queries), filtered by `userId` as defense-in-depth on top of RLS.
- `lib/actions/*` — Next.js Server Actions (form handlers), validated with Zod.
- `lib/i18n/*` — Hebrew/English dictionaries and locale context.
- `supabase/migrations/` — SQL schema (tables, RLS policies, triggers).
- `scripts/seed-demo-data.mjs` — one-off dev seed script (uses the service role key; never run in production).
- `proxy.ts` — refreshes the Supabase session cookie on every request (Next.js 16's renamed `middleware.ts`).
- `docs/plan.md` — the full system plan and architecture.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Project Settings → API. Safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — same page. Server-only; used by the seed script. Never expose this to the client or commit it.

`ANTHROPIC_API_KEY` and `CAL_COM_WEBHOOK_SECRET` are listed for the next build
phases and aren't used yet.

# myMeeting

A CRM for small businesses to manage leads, meetings, and deals, with a
Hebrew/RTL-first UI (English/LTR ready). Full architecture in
[`docs/plan.md`](./docs/plan.md).

## ▶ [Open Live Demo](https://my-meeting-two.vercel.app/demo)

**<https://my-meeting-two.vercel.app/demo>** — no sign-up, no password.

The demo is the same UI running on **synthetic sample data stored locally in
your browser** (`localStorage`). You can add, edit and delete leads, meetings,
deals, tasks, calls and WhatsApp threads; changes stay in your browser only,
and "Reset demo data" in the sidebar restores the sample set. The demo makes
no database, AI-provider or messaging requests, so it works even when the
backend is offline. The **full application** (sign-in at `/login`) stores data
in Supabase (Postgres + Auth + Row Level Security).

## Current status

### Works against Supabase (the full application)

- Email/password authentication (Supabase Auth) and per-user data isolation
  enforced by **Row Level Security** in the database.
- Leads: list with search/filter, create, edit, delete, status changes, internal notes.
- Meetings: list (upcoming/past), create, edit, delete, linked to a lead.
- Deals: list, create, edit, delete; marking a deal won/lost updates the lead's status.
- Tasks: list with due filters, create, edit, complete, delete.
- Conversations (call log) per lead, with transcript, analysis and audio upload
  to a private Supabase Storage bucket.
- Dashboard with key counts and upcoming meetings.
- Cal.com webhook (`/api/webhooks/cal-com`): verifies the request signature,
  logs every event to `integration_events`, and creates/updates meetings.
- Hebrew (default, RTL) / English (LTR) toggle, fully translated UI.

### Simulated / mock workflows — what "AI" means here

No large-language-model API is called anywhere in this project.

| Feature | What actually runs |
| --- | --- |
| **AI Website Analysis** | A local, deterministic report generator (`lib/ai/website-analysis-core.ts`). It does **not** fetch or read the lead's website; the report is assembled from prepared content, selected deterministically by a hash of the lead's URL and name. |
| **AI Conversation Analysis** | A local rule-based analyzer (`lib/ai/conversation-analysis-core.ts`): keyword/pattern matching over the transcript produces the summary, sentiment, objections and suggested tasks. |
| **Audio transcription** | Provider switch `TRANSCRIPTION_PROVIDER`. `mock` (used in the deployed app) returns a prepared sample transcript chosen by filename — the audio is not transcribed. `openai` calls OpenAI Whisper (`lib/ai/whisper.ts`); that code path exists but is not enabled in the deployment. |
| **WhatsApp** | Provider switch `WHATSAPP_PROVIDER`. `mock` (default) simulates incoming messages through the app's own webhook and "sends" nothing. Replies and summaries are local rule-based generators. A `wasender` provider class exists but has **never been tested against a live account** and its request shape is unverified. |

**Anthropic / Claude API: not implemented.** There is no Anthropic SDK
dependency and no code path that calls it; setting `ANTHROPIC_API_KEY` enables
nothing. `docs/plan.md` describes an LLM-backed design that was not built.

### Demo mode vs. the full application

| | Demo (`/demo`) | Full application |
| --- | --- | --- |
| Data | Synthetic fixtures (`lib/demo/seed.ts`), in the visitor's browser | Supabase Postgres, per user, RLS |
| Sign-in | None | Supabase Auth |
| Mutations | Local functions (`lib/demo/repo.ts`) | Server Actions (`lib/actions/*`) |
| Mock engines | Same modules, run in the browser | Same modules, run on the server |
| Audio upload | File is validated, not uploaded | Uploaded to Supabase Storage |

Demo mode is not an authentication state: it sets no cookie or session, and
nothing under `/demo` calls a Server Action or the database. Every non-demo
route still requires a Supabase session.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Enter Demo** (or go straight to
http://localhost:3000/demo). That is all a fresh clone needs: **no `.env.local`,
no credentials and no external services** — the demo runs entirely in the
browser. Without Supabase configured, the sign-in form reports that the
service is unavailable and every non-demo route redirects to `/login`.

To run the full application, configure a Supabase project (below), then sign
in with one of the seeded demo accounts shown on the login page
(`dana@example.com` / `yossi@example.com`, password `demo1234`) or sign up.

### Database setup (for a fresh Supabase project)

1. Run the migrations in `supabase/migrations/` in order against your
   project — via the SQL Editor, or any Postgres client pointed at your
   project's connection string.
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
- `proxy.ts` — refreshes the Supabase session cookie on every request (Next.js 16's renamed `middleware.ts`); skips `/demo`.
- `app/demo`, `components/demo`, `lib/demo` — the browser-local demo mode (routes, shell, fixtures, local data layer).
- `lib/ai/*`, `lib/whatsapp/*` — the local analysis engines and the transcription / WhatsApp provider switches.
- `docs/plan.md` — the full system plan and architecture.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Project Settings → API. Safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — same page. Server-only; used by the seed script. Never expose this to the client or commit it.

- `CAL_COM_WEBHOOK_SECRET` — verifies Cal.com webhook signatures.
- `TRANSCRIPTION_PROVIDER` — `mock` or `openai`; `OPENAI_API_KEY` is only read when it is `openai`. Server-only.
- `WHATSAPP_PROVIDER`, `WHATSAPP_WEBHOOK_SECRET` — see below.

None of these are needed for `/demo`. There is no `ANTHROPIC_API_KEY`
integration (see "Current status").

## WhatsApp integration (mock)

A full WhatsApp inbox (`/whatsapp`) is built against a provider abstraction
(`lib/whatsapp/`) so it can run entirely without a real WhatsApp number or
Wasender account — set `WHATSAPP_PROVIDER=mock` (the default) in
`.env.local`, plus any `WHATSAPP_WEBHOOK_SECRET` value. "Simulate Incoming
WhatsApp" on that page posts a real `message-received` event through
`/api/whatsapp/webhook`, which creates/updates a Lead + conversation and
triggers an automatic local rule-based reply — no external API calls, no OpenAI/
Wasender credentials required. `lib/whatsapp/wasender-provider.ts` is an untested placeholder for a real
provider; do not rely on it without verifying it against WasenderAPI's docs.

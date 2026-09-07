# myMeeting — CRM System Plan & Architecture

> **Implementation status:** the app runs on a real Supabase project — Postgres schema and RLS in `supabase/migrations/`, Supabase Auth wired into `lib/session.ts` / `lib/actions/auth.ts`, and `lib/repo/*` querying Postgres directly (mapped to/from the camelCase domain types in `lib/types.ts`). Cal.com and the AI features are **not yet connected** — see `README.md` for what's built vs. pending.

## Context

myMeeting is a CRM for a small business to manage leads, meetings, deals, and users, with Hebrew/RTL as the primary UI language (English/LTR supported later), and one external integration (Cal.com, via webhook) so scheduled meetings sync automatically into the CRM. This is a **greenfield project** — the working directory is currently empty, so this plan defines the system from scratch rather than adapting existing code.

Decisions locked in during planning (confirmed with the user):
- **Deals are a separate entity** from Leads, linked by foreign key, so deal value/history can be tracked distinctly from the lead record.
- **No admin/manager role** — strict per-user data isolation. Every user (including the business owner) only ever sees their own leads, meetings, deals, and notes. No cross-user visibility exists in v1.
- **Backend is Supabase-based** (Postgres + Auth + Row Level Security + Edge Functions), matching the tooling already available in this environment.
- **User accounts are created via self-service sign-up** (no invite-only/admin provisioning flow needed).

---

## 1. System Architecture

```
┌─────────────────────────────┐
│        Browser (User)        │
│  Next.js App (React, RTL)    │
└──────────────┬───────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────┐        ┌─────────────────────┐
│   Next.js App (Vercel)       │        │   Cal.com (external) │
│  - Server Components/Actions │        │   sends webhook on   │
│  - Route Handlers (thin API) │        │   booking events     │
│  - Auth middleware           │        └──────────┬───────────┘
└──────────────┬───────────────┘                   │
               │ Supabase JS client (RLS-enforced)  │ HTTPS POST
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase Project                       │
│  - Postgres DB (leads, meetings, deals, notes, profiles, ...) │
│  - Row Level Security (per-user isolation, auth.uid())        │
│  - Auth (email/password, session/JWT)                         │
│  - Edge Functions:                                             │
│      · cal-com-webhook  (verifies signature, upserts meeting) │
│      · ai-meeting-insights (calls Claude API, server-side)    │
│      · ai-website-analysis (fetch + scrape + Claude API)      │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
      ┌─────────────────┐
      │  Claude API       │  (Anthropic) — AI features only,
      │  (Anthropic)       │  called only from server-side code
      └─────────────────┘
```

**Why this shape:** the browser never talks to Postgres or third-party APIs directly. All data access goes through Supabase's client (protected by RLS) or through Next.js server code / Edge Functions, so secrets (Anthropic API key, Cal.com webhook secret) never reach the client bundle.

---

## 2. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js (App Router) + React + TypeScript** | Server components keep secrets server-side by default; built-in routing/middleware fits auth guarding; large ecosystem. |
| Styling/UI | **Tailwind CSS + shadcn/ui (Radix primitives)** | Utility classes map cleanly to CSS logical properties for RTL; Radix components are unopinionated about direction and behave correctly under `dir="rtl"`. |
| i18n/RTL | **next-intl** (or Next's built-in i18n routing) with `he.json`/`en.json` message catalogs | Decouples all UI strings from code now, so English/LTR is a translation + `dir` toggle later, not a rewrite. |
| Backend | **Supabase** (Postgres, Auth, Row Level Security, Edge Functions) | One system covers DB + auth + authorization (RLS) + serverless functions for the webhook and AI calls; matches tooling already provisioned in this environment. |
| ORM/data access | **Supabase JS client** with generated TypeScript types (`supabase gen types`) | Avoids a second schema-mapping layer (e.g. Prisma) on top of Supabase; types stay in sync with actual DB schema. |
| Validation | **Zod** on all server actions/route handlers | Single source of truth for input shape, shared between form and server validation. |
| AI | **Anthropic Claude API** | Used server-side only (Edge Functions) for meeting insight generation and website analysis. |
| Hosting | **Vercel** (frontend) + **Supabase Cloud** (DB/Auth/Functions) | Both integrate natively with Next.js/Supabase tooling; minimal infra to operate for a small business. |
| Secrets | **`.env.local`** (Next.js, git-ignored) + **Supabase Function secrets** | Anthropic API key, Cal.com webhook secret, and Supabase service role key never appear in client code or version control. |

---

## 3. Project / Folder Structure

```
myMeeting/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # auth-guarded shell, locale/dir provider
│   │   ├── leads/
│   │   │   ├── page.tsx               # list + search/filter
│   │   │   └── [id]/page.tsx          # detail: info, notes, linked meetings/deals
│   │   ├── meetings/
│   │   │   ├── page.tsx               # upcoming/past views
│   │   │   └── [id]/page.tsx
│   │   └── deals/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── api/
│   │   ├── webhooks/cal-com/route.ts  # thin passthrough or direct handler
│   │   └── ai/
│   │       ├── meeting-insights/route.ts
│   │       └── website-analysis/route.ts
│   └── layout.tsx                     # <html lang/dir> based on locale
├── components/
│   ├── ui/                            # shadcn primitives
│   ├── leads/
│   ├── meetings/
│   └── deals/
├── lib/
│   ├── supabase/client.ts             # browser client
│   ├── supabase/server.ts             # server client (cookies-based session)
│   ├── ai/claude.ts                   # server-only Claude API wrapper
│   └── validation/                    # zod schemas
├── messages/
│   ├── he.json
│   └── en.json
├── middleware.ts                      # auth guard + locale detection
├── supabase/
│   ├── migrations/*.sql
│   └── functions/
│       ├── cal-com-webhook/index.ts
│       ├── ai-meeting-insights/index.ts
│       └── ai-website-analysis/index.ts
├── types/database.ts                  # generated from Supabase schema
├── .env.local.example
└── package.json
```

---

## 4. Database Schema

All tables live in Postgres (`public` schema) via Supabase. `profiles` extends Supabase's built-in `auth.users`. Every user-owned table carries its own `user_id` column (rather than relying on joins) so Row Level Security policies stay simple and fast.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | = `auth.users.id` |
| full_name | text | |
| email | text | mirrors auth email |
| phone | text, nullable | |
| locale | text, default `'he'` | `'he'` or `'en'` |
| cal_com_username | text, nullable | maps incoming Cal.com bookings to this user |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `leads`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | owner (indexed) |
| name | text | required |
| phone | text | |
| email | text | |
| company | text | |
| source | enum(`website`, `referral`, `cold_call`, `social_media`, `cal_com`, `other`) | |
| status | enum(`new_lead`, `meeting_scheduled`, `meeting_completed`, `deal_closed`, `deal_lost`) default `new_lead` | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `lead_notes`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| lead_id | uuid, FK → leads.id, on delete cascade | |
| user_id | uuid, FK → profiles.id | author/owner |
| content | text | |
| created_at | timestamptz | |

*(Modeled as its own table, not a single `notes` field, so a lead can accumulate a timestamped history of internal notes.)*

### `meetings`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| lead_id | uuid, FK → leads.id, on delete cascade | |
| user_id | uuid, FK → profiles.id | owner |
| title | text | |
| scheduled_at | timestamptz | |
| duration_minutes | int | |
| method | enum(`in_person`, `phone`, `zoom`, `google_meet`, `cal_com`, `other`) | |
| location_or_link | text | address, phone, or meeting URL |
| status | enum(`scheduled`, `completed`, `canceled`, `no_show`) default `scheduled` | |
| notes | text | |
| cal_com_booking_uid | text, nullable, unique | set when created via webhook; enables idempotent upsert |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `deals`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| lead_id | uuid, FK → leads.id | |
| user_id | uuid, FK → profiles.id | owner |
| title | text | |
| value | numeric | |
| currency | text, default `'ILS'` | |
| product_or_service | text | |
| status | enum(`open`, `won`, `lost`) default `open` | |
| close_date | date, nullable | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `integration_events`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| source | enum(`cal_com`) | extensible for future integrations |
| event_type | text | e.g. `booking.created` |
| payload | jsonb | raw webhook body, for debugging/replay |
| processed | boolean, default false | |
| error | text, nullable | |
| received_at | timestamptz | |

### `ai_meeting_insights`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| meeting_id | uuid, FK → meetings.id, unique | one insight set per meeting |
| user_id | uuid, FK → profiles.id | |
| summary | text | |
| suggested_next_action | text | |
| follow_up_draft | text | draft email/message |
| created_at | timestamptz | |

### `ai_website_analyses`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| lead_id | uuid, FK → leads.id, nullable | optional link to a customer |
| url | text | |
| summary | text | business summary |
| products_services | text | |
| opportunities | text | suggested sales/business opportunities |
| raw_response | jsonb | full model output, for auditing |
| created_at | timestamptz | |

**Relationships:** `profiles 1—N leads`, `leads 1—N lead_notes`, `leads 1—N meetings`, `leads 1—N deals`, `meetings 1—1 ai_meeting_insights`, `profiles 1—N ai_website_analyses` (optionally attached to a `lead`).

**Row Level Security:** every table above (except `integration_events`, which only Edge Functions touch via the service role) gets `SELECT/INSERT/UPDATE/DELETE` policies of the form `user_id = auth.uid()`. This is the sole authorization mechanism — no in-app role checks needed given the strict-isolation decision, but the schema leaves room to add a `role` column to `profiles` later without breaking anything if oversight becomes a future requirement.

---

## 5. API / Endpoints

Most reads/writes happen directly through the Supabase client from server components/actions (protected by RLS), not hand-written REST endpoints. A handful of Next.js Route Handlers and Supabase Edge Functions exist for business logic that needs to run server-side:

**Auth** (Supabase Auth, via client SDK)
- Sign up, sign in, sign out, password reset — standard Supabase Auth flows, no custom endpoints needed.

**Leads** (server actions backed by Supabase client + RLS)
- List leads (search by name/phone/email/company, filter by status/source, paginated)
- Create / read / update (incl. status transitions) / delete a lead
- Add / list internal notes on a lead

**Meetings**
- List meetings (filter: upcoming vs. past, by lead)
- Create / read / update / delete a meeting

**Deals**
- List / create / read / update / delete a deal

**Webhook (Edge Function)**
- `POST /functions/v1/cal-com-webhook` — receives Cal.com booking events, verifies HMAC signature, matches/creates a lead, upserts a meeting (idempotent via `cal_com_booking_uid`), logs the raw event to `integration_events`.

**AI (Edge Functions, called from server actions/route handlers — never directly from the browser)**
- `POST /functions/v1/ai-meeting-insights` — body `{ meeting_id }`; reads meeting notes, calls Claude, stores/returns summary + next action + follow-up draft.
- `POST /functions/v1/ai-website-analysis` — body `{ url, lead_id? }`; fetches and extracts page text, calls Claude, stores/returns business summary + products/services + opportunities.

---

## 6. Authentication & Authorization

- **Authentication:** Supabase Auth, email + password, self-service sign-up (email confirmation recommended but optional to enable). Session managed via `@supabase/ssr` cookies; `middleware.ts` redirects unauthenticated requests away from any `(dashboard)` route to `/login`.
- **Authorization:** enforced entirely at the database layer via **Row Level Security** — every query, whether from a server component, server action, or Edge Function using the user's JWT, is automatically scoped to `auth.uid()`. The app code never needs to (and never should) manually filter by user — RLS makes cross-user data leaks a schema-level guarantee rather than an app-logic responsibility.
- Edge Functions that must act outside a user's session (the Cal.com webhook, which has no logged-in user) use the Supabase **service role key** (server-side secret only) and explicitly set the correct `user_id` when inserting rows, based on the `cal_com_username` → `profiles` mapping.

---

## 7. Hebrew / RTL & Future i18n

- Default locale `he`, UI direction `rtl`; `<html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>` set at the root layout based on the active locale.
- All UI strings live in `messages/he.json` / `messages/en.json` from day one via next-intl — no hardcoded strings in components — so adding English later is a translation + toggle, not a refactor.
- Styling uses CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) via Tailwind's logical-property utilities instead of physical `left`/`right`, so layouts flip correctly under either direction automatically.
- Dates, times, and numbers formatted via the `Intl` API against the active locale.
- v1 ships Hebrew content only; English translation files can be filled in later without architecture changes.

---

## 8. Cal.com Integration (Webhook)

1. Each user configures their Cal.com account's webhook to point at the `cal-com-webhook` Edge Function URL, and records their `cal_com_username` in their profile (so incoming events can be attributed to the right CRM user).
2. Cal.com sends `booking.created` / `booking.rescheduled` / `booking.cancelled` events, signed with a shared secret (`CAL_COM_WEBHOOK_SECRET`, stored as a Supabase Function secret).
3. The function verifies the signature, looks up the owning user by `cal_com_username`, then:
   - **`booking.created`**: matches an existing lead by email/phone for that user, or creates a new one (`source = 'cal_com'`); creates a `meetings` row (`method = 'cal_com'`, `status = 'scheduled'`, `cal_com_booking_uid` set).
   - **`booking.rescheduled`**: updates `scheduled_at` on the matching meeting (via `cal_com_booking_uid`).
   - **`booking.cancelled`**: sets that meeting's `status = 'canceled'`.
4. `cal_com_booking_uid` is unique, so re-delivered webhooks upsert rather than duplicate.
5. Every raw payload is logged to `integration_events` for debugging and manual replay if processing fails.

---

## 9. AI Features

### Chosen AI feature: AI Meeting Summary & Follow-Up Suggestions
When a rep marks a meeting **completed** and has entered meeting notes, they can trigger (or it auto-triggers) a Claude call that reads the notes and produces: a short summary, a suggested next action (e.g. "send proposal," "schedule follow-up in 3 days," "mark deal lost"), and a draft follow-up email/message. This targets a concrete small-business failure mode — deals quietly dying because no one follows up — by turning raw meeting notes into an actionable next step in seconds. Results are stored in `ai_meeting_insights` and shown on the meeting/lead detail view.

### Bonus module: AI Website Analysis
- User enters a customer's website URL (optionally attached to a lead).
- Server-side (Edge Function) fetches the page, extracts readable text (stripping nav/boilerplate), optionally follows one "About"/"Services" link.
- Sends the extracted text to Claude with a structured prompt requesting: a business summary, a list of products/services, and possible business/sales opportunities relevant to what the CRM user sells.
- Result stored in `ai_website_analyses`; shown in the UI with an option to copy opportunities into the lead's notes.
- Known limitation to document: JS-rendered sites with no server-side content won't extract well without a headless browser — noted as a future enhancement, not solved in v1.

---

## 10. Main Application Flows

1. **Onboarding:** user signs up → profile row auto-created → lands on empty Leads dashboard (Hebrew, RTL) → optionally sets `cal_com_username`.
2. **Lead lifecycle:** create lead (`new_lead`) → add notes as contact happens → schedule a meeting (status → `meeting_scheduled`) → mark meeting completed (status → `meeting_completed`) → optionally run AI meeting insights → create a deal and mark it `won`/`lost` (lead status → `deal_closed`/`deal_lost`).
3. **Meeting via Cal.com:** customer books through the rep's Cal.com link → webhook fires → lead matched/created + meeting created automatically → rep sees it appear on their Meetings dashboard without manual entry.
4. **Website research:** rep pastes a prospect's URL (from a lead's detail page or standalone) → AI analysis runs → summary/opportunities shown and optionally copied into the lead's notes.
5. **Daily use:** rep opens Meetings dashboard, filters Upcoming vs. Past, reviews today's meetings, jumps to linked lead for context before each call.

---

## 11. Development Order

1. Supabase project setup: schema migrations for all tables, enums, RLS policies.
2. Auth (sign-up/sign-in/sign-out, middleware guard) + i18n/RTL app shell (Hebrew default, `dir="rtl"`, message catalog structure in place).
3. Leads: CRUD, search/filter, notes.
4. Meetings: CRUD, linked to leads, upcoming/past views.
5. Deals: CRUD, linked to leads.
6. Cal.com webhook integration (Edge Function + signature verification + upsert logic).
7. AI Meeting Summary & Follow-Up feature.
8. AI Website Analysis module.
9. Polish pass: empty states, loading/error states, responsive layout check under RTL, basic reporting (counts by status), security review, deploy.

---

## 12. Expected Technical Challenges & Solutions

| Challenge | Solution |
|---|---|
| RTL layout bugs (icons, spacing, form fields flipping incorrectly) | Use CSS logical properties everywhere from the start; test every screen under `dir="rtl"` as it's built, not at the end. |
| Matching Cal.com bookings to the correct lead when emails differ slightly (typos, aliases) | Match on email first, fall back to phone if provided; when no match, create a new lead rather than silently dropping the booking; allow manual re-linking in the UI. |
| Webhook reliability (retries, out-of-order delivery, duplicate events) | HMAC signature verification, `cal_com_booking_uid` uniqueness for idempotent upserts, raw payload logging in `integration_events` for replay/debugging. |
| Keeping AI calls (and their cost/latency) off the critical path | Trigger AI generation as an explicit user action (button) rather than blocking the save flow; show a loading state; cache the result in the DB so it's not regenerated on every view. |
| Preventing SSRF via user-submitted website URLs (AI Website Analysis) | Server-side fetch blocks private/internal IP ranges, `localhost`, and non-`http(s)` schemes before requesting the URL. |
| Ensuring per-user isolation is airtight, not just app-level | Enforce exclusively via Postgres RLS (not app-code filtering), and write negative tests confirming user A cannot read/write user B's rows even via direct API calls. |

---

## 13. Security Considerations

- Row Level Security on every user-owned table; authorization never relies on client-supplied `user_id`.
- All secrets (`ANTHROPIC_API_KEY`, `CAL_COM_WEBHOOK_SECRET`, Supabase service role key) live in `.env.local` (git-ignored, with a committed `.env.local.example` listing required keys) and in Supabase Function secrets — never hardcoded, never sent to the client.
- Cal.com webhook requests are signature-verified before any processing.
- All server-side inputs (forms, route handlers, Edge Functions) validated with Zod before touching the database.
- AI Website Analysis fetch path guarded against SSRF (block internal IP ranges/schemes) and given a size/time limit to avoid abuse.
- HTTPS enforced end-to-end (default on Vercel + Supabase).
- Standard Supabase Auth password rules apply; email verification recommended before allowing sign-in.

---

## 14. Key Assumptions & Design Decisions

- Single business, multiple internal staff accounts, **no cross-user visibility** in v1 (explicitly chosen over an admin/oversight role); the schema is left open to add a `role` column later if that changes.
- Deals are explicitly created by the user (not fully auto-generated) when a lead is being converted; moving a lead's status to `deal_closed`/`deal_lost` is the trigger point in the UI to create/finalize the linked deal.
- Default currency `ILS`, stored per-deal to allow flexibility later.
- Cal.com is used one-way (bookings → CRM) for meeting sync in v1; no two-way calendar management.
- v1 ships fully in Hebrew; the English/LTR translation is an architecture-ready future addition, not part of initial launch content.

---

## 15. Verification (once implementation begins)

- Run Supabase migrations locally (`supabase db reset`) and confirm RLS policies block cross-user access with two test accounts.
- Exercise each CRUD flow (leads, meetings, deals, notes) through the UI in Hebrew/RTL and confirm layout correctness.
- Send test Cal.com webhook payloads (created/rescheduled/cancelled) and confirm correct lead/meeting upserts and idempotency on redelivery.
- Trigger both AI features against sample data and confirm outputs are stored and rendered, and that no AI/Cal.com secret ever appears in client-side network requests.

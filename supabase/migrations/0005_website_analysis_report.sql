-- Switches ai_website_analyses to store a structured multi-section report
-- (overview, SEO/UX/mobile issues, opportunities, recommendations, executive
-- summary) as JSONB instead of three flat text columns, matching the
-- richer local demo-analysis generator. No production data existed yet in
-- these columns, so this is a clean replace rather than a backfill.

alter table public.ai_website_analyses drop column if exists summary;
alter table public.ai_website_analyses drop column if exists findings;
alter table public.ai_website_analyses drop column if exists recommendations;

alter table public.ai_website_analyses
  add column if not exists report jsonb not null default '{}'::jsonb;

alter table public.ai_website_analyses alter column report drop default;

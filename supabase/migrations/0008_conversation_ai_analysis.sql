-- myMeeting CRM: AI Conversation Analysis
-- Adds structured AI analysis storage to conversations (transcription ->
-- analysis, mirroring the ai_website_analyses.report JSONB pattern from
-- 0004/0005) and links tasks back to the conversation/analysis that
-- generated them, so "Create Tasks" can be made idempotent.

alter table public.conversations
  add column if not exists analysis jsonb,
  add column if not exists analyzed_at timestamptz;

alter table public.tasks
  add column if not exists source_conversation_id uuid
    references public.conversations (id) on delete set null;

create index if not exists tasks_source_conversation_id_idx
  on public.tasks (source_conversation_id);

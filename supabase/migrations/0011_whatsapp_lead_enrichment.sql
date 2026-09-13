-- myMeeting CRM: automatic lead enrichment from WhatsApp conversations
--
-- Lets a Task be traced back to the WhatsApp conversation that generated it
-- (mirrors tasks.source_conversation_id -> conversations, added in
-- 0008_conversation_ai_analysis.sql, for the equivalent call-log flow) so
-- the automatic enrichment in lib/whatsapp/lead-enrichment.ts can check
-- "were tasks already created for this conversation?" and stay idempotent
-- across multiple incoming messages instead of creating duplicates.

alter table public.tasks
  add column if not exists source_whatsapp_conversation_id uuid
    references public.whatsapp_conversations (id) on delete set null;

create index if not exists tasks_source_whatsapp_conversation_id_idx
  on public.tasks (source_whatsapp_conversation_id);

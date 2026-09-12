-- myMeeting CRM: audio upload for AI Conversation Analysis
-- Adds audio file metadata to conversations (the file itself lives in
-- Supabase Storage, never in Postgres) and creates a private storage
-- bucket with per-user RLS policies, mirroring the folder-per-user
-- convention (`{auth.uid()}/...`) so a user can only read/write their own
-- uploaded audio.

alter table public.conversations
  add column if not exists audio_path text,
  add column if not exists audio_original_filename text,
  add column if not exists audio_uploaded_at timestamptz;

insert into storage.buckets (id, name, public)
values ('audio-files', 'audio-files', false)
on conflict (id) do nothing;

drop policy if exists "audio_files_insert_own" on storage.objects;
create policy "audio_files_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_files_select_own" on storage.objects;
create policy "audio_files_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_files_update_own" on storage.objects;
create policy "audio_files_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'audio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'audio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_files_delete_own" on storage.objects;
create policy "audio_files_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audio-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapConversation } from "@/lib/repo/mappers";
import type { Conversation, ConversationAnalysis, ConversationDirection } from "@/lib/types";

// Every function takes `userId` explicitly and filters on it as
// defense-in-depth, but the real authorization boundary is the Postgres
// Row Level Security policy on `conversations` (`auth.uid() = user_id`).

export async function listConversations(
  userId: string,
  leadId: string
): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapConversation);
}

export async function getConversation(userId: string, id: string): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapConversation(data) : null;
}

export interface ConversationInput {
  leadId: string;
  occurredAt: string;
  durationMinutes: number;
  direction: ConversationDirection;
  notes?: string;
  transcription?: string;
}

export async function createConversation(
  userId: string,
  input: ConversationInput
): Promise<Conversation> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      occurred_at: input.occurredAt,
      duration_minutes: input.durationMinutes,
      direction: input.direction,
      notes: input.notes,
      transcription: input.transcription,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapConversation(data);
}

export async function updateConversationTranscription(
  userId: string,
  id: string,
  transcription: string
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ transcription })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapConversation(data) : null;
}

export async function saveConversationAudioMetadata(
  userId: string,
  id: string,
  input: { audioPath: string; audioOriginalFilename: string }
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({
      audio_path: input.audioPath,
      audio_original_filename: input.audioOriginalFilename,
      audio_uploaded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapConversation(data) : null;
}

export async function saveConversationAnalysis(
  userId: string,
  id: string,
  analysis: ConversationAnalysis
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ analysis, analyzed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapConversation(data) : null;
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("conversations")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

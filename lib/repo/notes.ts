import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapLeadNote } from "@/lib/repo/mappers";
import type { LeadNote } from "@/lib/types";

export async function listNotes(userId: string, leadId: string): Promise<LeadNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLeadNote);
}

export async function addNote(
  userId: string,
  leadId: string,
  content: string
): Promise<LeadNote> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_notes")
    .insert({ user_id: userId, lead_id: leadId, content })
    .select("*")
    .single();
  if (error) throw error;
  return mapLeadNote(data);
}

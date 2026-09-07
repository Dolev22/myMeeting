import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapMeeting } from "@/lib/repo/mappers";
import type { Meeting, MeetingMethod, MeetingStatus } from "@/lib/types";

export interface MeetingFilters {
  when?: "upcoming" | "past" | "all";
  leadId?: string;
}

export async function listMeetings(
  userId: string,
  filters: MeetingFilters = {}
): Promise<Meeting[]> {
  const supabase = await createClient();
  let query = supabase.from("meetings").select("*").eq("user_id", userId);

  if (filters.leadId) {
    query = query.eq("lead_id", filters.leadId);
  }

  const nowIso = new Date().toISOString();
  if (filters.when === "upcoming") {
    query = query.gte("scheduled_at", nowIso).order("scheduled_at", { ascending: true });
  } else if (filters.when === "past") {
    query = query.lt("scheduled_at", nowIso).order("scheduled_at", { ascending: false });
  } else {
    query = query.order("scheduled_at", { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapMeeting);
}

export async function getMeeting(userId: string, id: string): Promise<Meeting | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapMeeting(data) : null;
}

export interface MeetingInput {
  leadId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  method: MeetingMethod;
  locationOrLink?: string;
  status?: MeetingStatus;
  notes?: string;
}

export async function createMeeting(userId: string, input: MeetingInput): Promise<Meeting> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      title: input.title,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      method: input.method,
      location_or_link: input.locationOrLink,
      status: input.status ?? "scheduled",
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMeeting(data);
}

export async function updateMeeting(
  userId: string,
  id: string,
  input: Partial<MeetingInput>
): Promise<Meeting | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .update({
      lead_id: input.leadId,
      title: input.title,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      method: input.method,
      location_or_link: input.locationOrLink,
      status: input.status,
      notes: input.notes,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapMeeting(data) : null;
}

export async function deleteMeeting(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("meetings")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

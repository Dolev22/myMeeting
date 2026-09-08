import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapLead } from "@/lib/repo/mappers";
import type { Lead, LeadSource, LeadStatus } from "@/lib/types";

// Every function takes `userId` explicitly and filters on it as
// defense-in-depth, but the real authorization boundary is the Postgres
// Row Level Security policy on `leads` (`auth.uid() = user_id`) — a request
// for another user's row is rejected by the database itself, not by this
// filter.

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "all";
}

export async function listLeads(userId: string, filters: LeadFilters = {}): Promise<Lead[]> {
  const supabase = await createClient();
  let query = supabase.from("leads").select("*").eq("user_id", userId);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`
    );
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function getLead(userId: string, id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLead(data) : null;
}

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  website?: string;
  source: LeadSource;
  status?: LeadStatus;
}

export async function createLead(userId: string, input: LeadInput): Promise<Lead> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      company: input.company,
      website: input.website,
      source: input.source,
      status: input.status ?? "new_lead",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapLead(data);
}

export async function updateLead(
  userId: string,
  id: string,
  input: Partial<LeadInput>
): Promise<Lead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      name: input.name,
      phone: input.phone,
      email: input.email,
      company: input.company,
      website: input.website,
      source: input.source,
      status: input.status,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapLead(data) : null;
}

export async function deleteLead(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

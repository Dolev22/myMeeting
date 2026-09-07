import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapDeal } from "@/lib/repo/mappers";
import type { Deal, DealStatus } from "@/lib/types";

export async function listDeals(
  userId: string,
  filters: { leadId?: string } = {}
): Promise<Deal[]> {
  const supabase = await createClient();
  let query = supabase.from("deals").select("*").eq("user_id", userId);
  if (filters.leadId) query = query.eq("lead_id", filters.leadId);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDeal);
}

export async function getDeal(userId: string, id: string): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDeal(data) : null;
}

export interface DealInput {
  leadId: string;
  title: string;
  value: number;
  currency: string;
  productOrService?: string;
  status?: DealStatus;
  closeDate?: string;
  notes?: string;
}

export async function createDeal(userId: string, input: DealInput): Promise<Deal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      title: input.title,
      value: input.value,
      currency: input.currency,
      product_or_service: input.productOrService,
      status: input.status ?? "open",
      close_date: input.closeDate || null,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapDeal(data);
}

export async function updateDeal(
  userId: string,
  id: string,
  input: Partial<DealInput>
): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .update({
      lead_id: input.leadId,
      title: input.title,
      value: input.value,
      currency: input.currency,
      product_or_service: input.productOrService,
      status: input.status,
      close_date: input.closeDate || null,
      notes: input.notes,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapDeal(data) : null;
}

export async function deleteDeal(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("deals")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

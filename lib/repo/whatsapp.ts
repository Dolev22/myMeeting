import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { mapLead, mapWhatsAppConversation, mapWhatsAppMessage } from "@/lib/repo/mappers";
import type {
  ConversationAnalysis,
  Lead,
  WhatsAppConversation,
  WhatsAppConversationWithLead,
  WhatsAppMessage,
  WhatsAppMessageDirection,
} from "@/lib/types";

// Every function takes `userId` explicitly and filters on it as
// defense-in-depth, but the real authorization boundary is the Postgres Row
// Level Security policy on these tables (`auth.uid() = user_id`).
//
// Unlike every other repo module here, these functions accept an optional
// Supabase client so the WhatsApp webhook route (app/api/whatsapp/webhook)
// can pass in a service-role admin client — mirroring the Cal.com webhook
// pattern in app/api/webhooks/cal-com/route.ts, which also has no logged-in
// session to scope an RLS client to.

type AnyClient = SupabaseClient;

async function client(supabase?: AnyClient) {
  return supabase ?? (await createClient());
}

const LEAD_JOIN_COLUMNS = "id, name, phone, company, email, status, source, created_at";

function mapConversationWithLead(row: Record<string, unknown>): WhatsAppConversationWithLead {
  const leadRow = row.lead as Record<string, unknown>;
  const conversation = mapWhatsAppConversation(row);
  const lead = mapLead({ ...leadRow, user_id: row.user_id });
  return {
    ...conversation,
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      company: lead.company,
      email: lead.email,
      status: lead.status,
      source: lead.source,
      createdAt: lead.createdAt,
    },
  };
}

export interface WhatsAppConversationFilters {
  search?: string;
}

export async function listWhatsAppConversations(
  userId: string,
  filters: WhatsAppConversationFilters = {},
  supabase?: AnyClient
): Promise<WhatsAppConversationWithLead[]> {
  const db = await client(supabase);
  const query = db
    .from("whatsapp_conversations")
    .select(`*, lead:leads!whatsapp_conversations_lead_id_fkey(${LEAD_JOIN_COLUMNS})`)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as Record<string, unknown>[];

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const lead = row.lead as Record<string, unknown>;
      const name = ((lead?.name as string) ?? "").toLowerCase();
      const phone = ((row.phone_number as string) ?? "").toLowerCase();
      const preview = ((row.last_message_preview as string) ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || preview.includes(q);
    });
  }

  return rows.map(mapConversationWithLead);
}

export async function getWhatsAppConversation(
  userId: string,
  id: string,
  supabase?: AnyClient
): Promise<WhatsAppConversationWithLead | null> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select(`*, lead:leads!whatsapp_conversations_lead_id_fkey(${LEAD_JOIN_COLUMNS})`)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapConversationWithLead(data as Record<string, unknown>) : null;
}

export async function getWhatsAppConversationByLead(
  userId: string,
  leadId: string,
  supabase?: AnyClient
): Promise<WhatsAppConversation | null> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select("*")
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWhatsAppConversation(data) : null;
}

export async function findLeadByPhone(
  userId: string,
  phoneNumber: string,
  supabase?: AnyClient
): Promise<Lead | null> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .eq("phone", phoneNumber)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLead(data) : null;
}

export async function findConversationByPhone(
  userId: string,
  phoneNumber: string,
  supabase?: AnyClient
): Promise<WhatsAppConversation | null> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("phone_number", phoneNumber)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWhatsAppConversation(data) : null;
}

export async function createWhatsAppConversation(
  userId: string,
  input: { leadId: string; phoneNumber: string },
  supabase?: AnyClient
): Promise<WhatsAppConversation> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("whatsapp_conversations")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      phone_number: input.phoneNumber,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapWhatsAppConversation(data);
}

// Finds the conversation for this phone number, or creates a new Lead +
// conversation together when the number is genuinely new. Uses the
// `whatsapp_conversations(user_id, phone_number)` unique constraint as the
// source of truth for "already exists" — a duplicate insert from a race
// between two near-simultaneous webhook deliveries fails on that constraint
// rather than silently creating two conversations, and is handled by
// re-reading the row that won.
export async function findOrCreateLeadAndConversation(
  userId: string,
  input: { name: string; phoneNumber: string },
  supabase?: AnyClient
): Promise<{ lead: Lead; conversation: WhatsAppConversation; isNewLead: boolean }> {
  const db = await client(supabase);

  const existingConversation = await findConversationByPhone(userId, input.phoneNumber, db);
  if (existingConversation) {
    const { data: leadRow, error } = await db
      .from("leads")
      .select("*")
      .eq("id", existingConversation.leadId)
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return { lead: mapLead(leadRow), conversation: existingConversation, isNewLead: false };
  }

  const existingLead = await findLeadByPhone(userId, input.phoneNumber, db);

  let lead: Lead;
  let isNewLead = false;
  if (existingLead) {
    lead = existingLead;
  } else {
    const { data: leadRow, error } = await db
      .from("leads")
      .insert({
        user_id: userId,
        name: input.name,
        phone: input.phoneNumber,
        source: "whatsapp",
        status: "new_lead",
      })
      .select("*")
      .single();
    if (error) throw error;
    lead = mapLead(leadRow);
    isNewLead = true;
  }

  try {
    const conversation = await createWhatsAppConversation(
      userId,
      { leadId: lead.id, phoneNumber: input.phoneNumber },
      db
    );
    return { lead, conversation, isNewLead };
  } catch (err) {
    // Another concurrent request created the conversation first (unique
    // constraint violation) — read back the row it created instead of
    // failing the whole incoming-message flow.
    const conversation = await findConversationByPhone(userId, input.phoneNumber, db);
    if (!conversation) throw err;
    return { lead, conversation, isNewLead: false };
  }
}

export async function listWhatsAppMessages(
  userId: string,
  conversationId: string,
  supabase?: AnyClient
): Promise<WhatsAppMessage[]> {
  const db = await client(supabase);
  const { data, error } = await db
    .from("whatsapp_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWhatsAppMessage);
}

export interface CreateWhatsAppMessageInput {
  conversationId: string;
  direction: WhatsAppMessageDirection;
  body: string;
  isAiGenerated?: boolean;
  providerMessageId?: string;
}

// Idempotent on `providerMessageId` via the partial unique index on
// (conversation_id, provider_message_id) — a redelivered webhook event
// (requirement #25, "duplicate webhook event") is a no-op, and the
// already-saved message is returned instead.
export async function createWhatsAppMessage(
  userId: string,
  input: CreateWhatsAppMessageInput,
  supabase?: AnyClient
): Promise<{ message: WhatsAppMessage; wasDuplicate: boolean }> {
  const db = await client(supabase);

  if (input.providerMessageId) {
    const { data: existing, error: lookupError } = await db
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", input.conversationId)
      .eq("provider_message_id", input.providerMessageId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return { message: mapWhatsAppMessage(existing), wasDuplicate: true };
  }

  const { data, error } = await db
    .from("whatsapp_messages")
    .insert({
      user_id: userId,
      conversation_id: input.conversationId,
      direction: input.direction,
      body: input.body,
      is_ai_generated: input.isAiGenerated ?? false,
      provider_message_id: input.providerMessageId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { message: mapWhatsAppMessage(data), wasDuplicate: false };
}

export async function touchConversationLastMessage(
  userId: string,
  conversationId: string,
  input: { preview: string; direction: WhatsAppMessageDirection; unread: boolean },
  supabase?: AnyClient
): Promise<void> {
  const db = await client(supabase);
  const { error } = await db
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: input.preview.slice(0, 200),
      last_message_direction: input.direction,
      unread: input.unread,
    })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
  supabase?: AnyClient
): Promise<void> {
  const db = await client(supabase);
  const { error } = await db
    .from("whatsapp_conversations")
    .update({ unread: false })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function saveWhatsAppConversationAnalysis(
  userId: string,
  conversationId: string,
  analysis: ConversationAnalysis,
  supabase?: AnyClient
): Promise<void> {
  const db = await client(supabase);
  const { error } = await db
    .from("whatsapp_conversations")
    .update({ analysis, analyzed_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

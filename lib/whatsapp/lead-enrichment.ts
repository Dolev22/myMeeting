import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeConversation } from "@/lib/ai/conversation-analysis";
import { buildWhatsAppTranscript } from "@/lib/whatsapp/build-transcript";
import {
  NOTE_MARKER,
  extractCompany,
  extractEmail,
  extractWebsite,
  formatAutoNote,
} from "@/lib/whatsapp/lead-enrichment-core";
import type { Lead, WhatsAppMessage } from "@/lib/types";

// Automatically fills in the rest of a WhatsApp Lead's card as the
// conversation goes on — email/company/website when the customer mentions
// them, an internal note summarizing the conversation, and follow-up Tasks —
// so a WhatsApp lead ends up looking like any other CRM lead instead of just
// a name and a phone number. Runs after every incoming message (best-effort,
// never throws into the caller) and reuses the same local deterministic
// analyzer as the AI Conversation Analysis / AI Summary features — no
// external API call.

export async function enrichLeadFromWhatsAppConversation(
  admin: SupabaseClient,
  userId: string,
  lead: Lead,
  conversationId: string,
  messages: WhatsAppMessage[]
): Promise<void> {
  try {
    const incomingTexts = messages.filter((m) => m.direction === "incoming").map((m) => m.body);
    if (incomingTexts.length === 0) return;

    // 1. Fill in blank profile fields only — never overwrite what's there.
    const fieldUpdates: Record<string, string> = {};
    if (!lead.email) {
      const email = extractEmail(incomingTexts);
      if (email) fieldUpdates.email = email;
    }
    if (!lead.website) {
      const website = extractWebsite(incomingTexts);
      if (website) fieldUpdates.website = website;
    }
    if (!lead.company) {
      const company = extractCompany(incomingTexts);
      if (company) fieldUpdates.company = company;
    }
    if (Object.keys(fieldUpdates).length > 0) {
      await admin.from("leads").update(fieldUpdates).eq("id", lead.id).eq("user_id", userId);
    }

    // 2. Internal note: one auto-summary note per conversation, updated in
    // place as the conversation grows (identified by NOTE_MARKER) rather
    // than a new note appended after every single message.
    const analysis = await analyzeConversation({
      transcription: buildWhatsAppTranscript(messages),
      occurredAt: new Date().toISOString(),
    });
    const noteContent = formatAutoNote(analysis);

    const { data: existingNote } = await admin
      .from("lead_notes")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("user_id", userId)
      .ilike("content", `${NOTE_MARKER}%`)
      .maybeSingle();

    if (existingNote) {
      await admin.from("lead_notes").update({ content: noteContent }).eq("id", existingNote.id);
    } else {
      await admin
        .from("lead_notes")
        .insert({ user_id: userId, lead_id: lead.id, content: noteContent });
    }

    // 3. Linked tasks: created once per conversation (idempotent via
    // source_whatsapp_conversation_id), mirroring the existing "Create
    // Tasks" flow for regular AI Conversation Analysis.
    if (analysis.suggestedTasks.length > 0) {
      const { data: existingTasks } = await admin
        .from("tasks")
        .select("id")
        .eq("source_whatsapp_conversation_id", conversationId)
        .limit(1);

      if (!existingTasks || existingTasks.length === 0) {
        await admin.from("tasks").insert(
          analysis.suggestedTasks.map((task) => ({
            user_id: userId,
            lead_id: lead.id,
            name: task.name,
            notes: task.description,
            priority: task.priority,
            due_date: task.dueDate || null,
            source_whatsapp_conversation_id: conversationId,
          }))
        );
      }
    }
  } catch (err) {
    // Best-effort enrichment — never let it break saving the incoming
    // message or sending the automatic AI reply (same rule as the AI reply
    // itself in lib/whatsapp/handlers.ts).
    console.error("[whatsapp] lead enrichment failed", {
      leadId: lead.id,
      conversationId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

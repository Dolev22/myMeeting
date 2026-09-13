import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeConversation } from "@/lib/ai/conversation-analysis";
import { buildWhatsAppTranscript } from "@/lib/whatsapp/build-transcript";
import type { ConversationAnalysis, Lead, WhatsAppMessage } from "@/lib/types";

// Automatically fills in the rest of a WhatsApp Lead's card as the
// conversation goes on — email/company/website when the customer mentions
// them, an internal note summarizing the conversation, and follow-up Tasks —
// so a WhatsApp lead ends up looking like any other CRM lead instead of just
// a name and a phone number. Runs after every incoming message (best-effort,
// never throws into the caller) and reuses the same local deterministic
// analyzer as the AI Conversation Analysis / AI Summary features — no
// external API call.

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_REGEX = /\bhttps?:\/\/[^\s,)"']+|\bwww\.[^\s,)"']+\.[a-z]{2,}[^\s,)"']*/i;
// Trailing sentence punctuation a URL/company match can pick up when it sits
// at the end of a clause ("...our site is acme.com."), stripped afterward
// rather than excluded from the character classes above (which still need
// to allow "." *inside* a domain/company name).
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

// Best-effort self-introduction patterns ("I'm from Acme Corp", "בחברת אקמי").
// Freeform chat text has no reliable structure, so this only fills the
// field when a common phrasing is matched — it never guesses, and it never
// overwrites a company the lead already has on file. The capture group is
// word-based (a handful of space-separated words, no sentence punctuation)
// so it stops at the company name instead of running on into the rest of
// the sentence.
const HEB = "\\u0590-\\u05FF";
const COMPANY_PATTERNS = [
  new RegExp(
    `(?:אני\\s+(?:עובד|עובדת)\\s+ב-?|מחברת\\s+|בחברת\\s+|החברה שלי (?:נקראת|היא)\\s+)([${HEB}\\w][${HEB}\\w'-]*(?:[ \\t][${HEB}\\w'-]+){0,3})`
  ),
  /\b(?:i work at|i'm from|i am from|we're from|we are from)\s+([A-Z][\w&'-]*(?:[ \t][A-Z]?[\w&'-]+){0,3})/i,
];

function extractEmail(texts: string[]): string | undefined {
  for (const text of texts) {
    const match = text.match(EMAIL_REGEX);
    if (match) return match[0];
  }
  return undefined;
}

function extractWebsite(texts: string[]): string | undefined {
  for (const text of texts) {
    const match = text.match(URL_REGEX);
    if (!match) continue;
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return undefined;
}

function extractCompany(texts: string[]): string | undefined {
  for (const text of texts) {
    for (const pattern of COMPANY_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim().replace(TRAILING_PUNCTUATION, "");
    }
  }
  return undefined;
}

const NOTE_MARKER = "[וואטסאפ · סיכום אוטומטי]";

function formatAutoNote(analysis: ConversationAnalysis): string {
  const lines = [NOTE_MARKER, "", analysis.summary];
  if (analysis.customerNeeds.length > 0) {
    lines.push("", "צרכי הלקוח:", ...analysis.customerNeeds.map((n) => `• ${n}`));
  }
  if (analysis.keyTopics.length > 0) {
    lines.push("", "נושאים מרכזיים:", ...analysis.keyTopics.map((t) => `• ${t}`));
  }
  lines.push("", `שלב מכירה מומלץ: ${analysis.recommendedStage}`);
  return lines.join("\n");
}

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

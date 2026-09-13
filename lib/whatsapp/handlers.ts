import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createWhatsAppMessage,
  findConversationByPhone,
  findOrCreateLeadAndConversation,
  listWhatsAppMessages,
  touchConversationLastMessage,
} from "@/lib/repo/whatsapp";
import { generateWhatsAppReply } from "@/lib/ai/whatsapp-response";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { enrichLeadFromWhatsAppConversation } from "@/lib/whatsapp/lead-enrichment";
import type { WhatsAppWebhookEvent } from "@/lib/whatsapp/types";

// The business logic both the real (future Wasender) and mock webhook
// deliveries run through — see app/api/whatsapp/webhook/route.ts, which
// validates the shared secret and then calls these functions. Nothing here
// is mock-specific; it only reacts to the event shape.

export interface HandleWebhookEventResult {
  ok: boolean;
  reason?: string;
  leadId?: string;
  conversationId?: string;
}

export async function handleWhatsAppWebhookEvent(
  admin: SupabaseClient,
  event: WhatsAppWebhookEvent
): Promise<HandleWebhookEventResult> {
  if (event.event === "message-received") {
    return handleMessageReceived(admin, event.data);
  }
  if (event.event === "message-sent") {
    return handleMessageSent(admin, event.data);
  }
  return { ok: false, reason: "unknown event type" };
}

async function resolveUserIdByBusinessNumber(
  admin: SupabaseClient,
  businessNumber: string
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("whatsapp_phone_number", businessNumber)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

async function handleMessageReceived(
  admin: SupabaseClient,
  data: Extract<WhatsAppWebhookEvent, { event: "message-received" }>["data"]
): Promise<HandleWebhookEventResult> {
  const phoneNumber = data.from?.trim();
  const senderName = data.senderName?.trim();
  const text = data.text?.trim();

  if (!phoneNumber) return { ok: false, reason: "missing sender phone number" };
  if (!text) return { ok: false, reason: "empty message body" };

  const userId = await resolveUserIdByBusinessNumber(admin, data.to);
  if (!userId) return { ok: false, reason: `no CRM account connected to number "${data.to}"` };

  // find/create Lead -> find/create conversation (requirements #4, #5, #19)
  const { lead, conversation } = await findOrCreateLeadAndConversation(
    userId,
    { name: senderName || phoneNumber, phoneNumber },
    admin
  );

  const { wasDuplicate } = await createWhatsAppMessage(
    userId,
    {
      conversationId: conversation.id,
      direction: "incoming",
      body: text,
      providerMessageId: data.messageId,
    },
    admin
  );
  if (wasDuplicate) {
    return {
      ok: true,
      reason: "duplicate webhook event ignored",
      leadId: lead.id,
      conversationId: conversation.id,
    };
  }

  await touchConversationLastMessage(
    userId,
    conversation.id,
    { preview: text, direction: "incoming", unread: true },
    admin
  );

  // Automatic AI flow (requirement #15): generate a contextual reply and
  // send it right back through the provider, which emits its own
  // message-sent event back into this same webhook.
  const history = await listWhatsAppMessages(userId, conversation.id, admin);

  try {
    const reply = generateWhatsAppReply({
      incomingText: text,
      lead: { name: lead.name, company: lead.company, status: lead.status },
      isFirstMessage: history.filter((m) => m.direction === "incoming").length <= 1,
      previousMessages: history,
    });

    const provider = getWhatsAppProvider();
    await provider.sendMessage({
      from: data.to,
      to: phoneNumber,
      body: reply,
      isAiGenerated: true,
    });
  } catch (err) {
    // The incoming message and lead/conversation are already durably saved
    // above — a failure generating/sending the automatic AI reply must not
    // roll any of that back or crash the webhook (requirement #25).
    console.error("[whatsapp] automatic AI reply failed", {
      conversationId: conversation.id,
      error: err instanceof Error ? err.message : err,
    });
  }

  // Fill in the rest of the Lead's card (email/company/website, an internal
  // note summarizing the conversation, follow-up tasks) from what's been
  // said so far — best-effort, never blocks the webhook. Re-fetches the
  // history rather than reusing the pre-reply `history` above, so the just-
  // sent AI reply is included in the summary/analysis too.
  const fullHistory = await listWhatsAppMessages(userId, conversation.id, admin);
  await enrichLeadFromWhatsAppConversation(admin, userId, lead, conversation.id, fullHistory);

  return { ok: true, leadId: lead.id, conversationId: conversation.id };
}

async function handleMessageSent(
  admin: SupabaseClient,
  data: Extract<WhatsAppWebhookEvent, { event: "message-sent" }>["data"]
): Promise<HandleWebhookEventResult> {
  const customerPhone = data.to?.trim();
  const text = data.text?.trim();
  if (!customerPhone) return { ok: false, reason: "missing recipient phone number" };
  if (!text) return { ok: false, reason: "empty message body" };

  const userId = await resolveUserIdByBusinessNumber(admin, data.from);
  if (!userId) return { ok: false, reason: `no CRM account connected to number "${data.from}"` };

  const conversation = await findConversationByPhone(userId, customerPhone, admin);
  if (!conversation) {
    return { ok: false, reason: `no conversation found for "${customerPhone}"` };
  }

  const { wasDuplicate } = await createWhatsAppMessage(
    userId,
    {
      conversationId: conversation.id,
      direction: "outgoing",
      body: text,
      isAiGenerated: data.isAiGenerated ?? false,
      providerMessageId: data.messageId,
    },
    admin
  );
  if (wasDuplicate) {
    return { ok: true, reason: "duplicate webhook event ignored", conversationId: conversation.id };
  }

  await touchConversationLastMessage(
    userId,
    conversation.id,
    { preview: text, direction: "outgoing", unread: false },
    admin
  );

  return { ok: true, conversationId: conversation.id, leadId: conversation.leadId };
}

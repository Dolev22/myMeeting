import "server-only";
import { randomUUID } from "node:crypto";
import { getWhatsAppWebhookUrl } from "@/lib/whatsapp/webhook-url";
import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppProvider,
  WhatsAppWebhookEvent,
} from "@/lib/whatsapp/types";

// Simulates WasenderAPI without ever calling a real WhatsApp/Wasender
// endpoint: no external network request, no API token, no real phone
// number required (requirement: "DO NOT make external Wasender API calls").
//
// It still produces the exact same logical events a real provider would
// (message-received, message-sent) and posts them to this app's own
// /api/whatsapp/webhook over a real HTTP request — the only "fake" part is
// that nothing outside this process ever sees the request. This keeps the
// webhook route as the single place business logic lives, so switching to
// WasenderWhatsAppProvider later requires no change to how events are
// processed, only to how they're produced.
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock" as const;

  private async postEvent(
    event: WhatsAppWebhookEvent
  ): Promise<{ leadId?: string; conversationId?: string }> {
    const url = await getWhatsAppWebhookUrl();
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify(event),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`WhatsApp webhook call failed (${res.status}): ${text}`);
    }
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      reason?: string;
      leadId?: string;
      conversationId?: string;
    };
    if (json.ok === false) {
      throw new Error(json.reason ?? "WhatsApp webhook rejected the event");
    }
    return { leadId: json.leadId, conversationId: json.conversationId };
  }

  async sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
    const messageId = `mock_${randomUUID()}`;
    await this.postEvent({
      event: "message-sent",
      data: {
        to: input.to,
        from: input.from,
        text: input.body,
        messageId,
        timestamp: new Date().toISOString(),
        isAiGenerated: input.isAiGenerated,
      },
    });
    return { providerMessageId: messageId };
  }

  // Not part of the WhatsAppProvider interface a real provider would
  // implement (a real WhatsApp user sends the message themselves — nothing
  // in this CRM "simulates" that side in production). Only used by the
  // "Simulate Incoming WhatsApp" UI action.
  async simulateIncoming(input: {
    to: string;
    from: string;
    senderName?: string;
    text: string;
  }): Promise<{ leadId?: string; conversationId?: string }> {
    return this.postEvent({
      event: "message-received",
      data: {
        to: input.to,
        from: input.from,
        senderName: input.senderName,
        text: input.text,
        messageId: `mock_${randomUUID()}`,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

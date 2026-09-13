// Shared contract between the mock and real WhatsApp providers (see
// lib/whatsapp/provider.ts for the factory that picks one based on
// WHATSAPP_PROVIDER). Neither the CRM's business logic nor its UI should
// ever import a concrete provider directly — only this interface and the
// factory — so swapping WHATSAPP_PROVIDER=mock for =wasender later needs no
// changes outside lib/whatsapp/*.

export interface SendWhatsAppMessageInput {
  /** Business number the message is sent from (profiles.whatsapp_phone_number). */
  from: string;
  /** Customer's WhatsApp number. */
  to: string;
  body: string;
  isAiGenerated?: boolean;
}

export interface SendWhatsAppMessageResult {
  providerMessageId: string;
}

export interface WhatsAppProvider {
  readonly name: "mock" | "wasender";
  sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}

// The two Wasender-style webhook event shapes this integration supports
// (requirement: "At minimum support message-received and message-sent").
// Both the mock provider and, in the future, a real Wasender webhook
// delivery produce events in this same shape — app/api/whatsapp/webhook
// processes them identically regardless of source.
export type WhatsAppWebhookEvent =
  | {
      event: "message-received";
      data: {
        to: string; // business number the message arrived on
        from: string; // customer's phone number
        senderName?: string;
        text: string;
        messageId: string;
        timestamp: string;
      };
    }
  | {
      event: "message-sent";
      data: {
        to: string; // customer's phone number
        from: string; // business number
        text: string;
        messageId: string;
        timestamp: string;
        isAiGenerated?: boolean;
      };
    };

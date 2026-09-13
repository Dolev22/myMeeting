import "server-only";
import type { SendWhatsAppMessageInput, SendWhatsAppMessageResult, WhatsAppProvider } from "@/lib/whatsapp/types";

// Real WasenderAPI integration — NOT wired up or tested against a live
// account (this project intentionally runs with WHATSAPP_PROVIDER=mock
// since there's no dedicated WhatsApp number available for it yet). This
// class exists so the provider abstraction is genuinely ready for it: the
// rest of the app (webhook route, actions, UI) only ever depends on
// `WhatsAppProvider`, never on this class directly, so flipping
// WHATSAPP_PROVIDER=wasender in the environment is the only step needed
// once WASENDER_API_TOKEN / WASENDER_PHONE_NUMBER are configured.
//
// WasenderAPI's actual send-message endpoint/payload shape should be
// confirmed against their current docs before relying on this in
// production — the shape below is a reasonable placeholder, not a verified
// contract.
const WASENDER_API_BASE = "https://wasenderapi.com/api";

export class WasenderWhatsAppProvider implements WhatsAppProvider {
  readonly name = "wasender" as const;

  private get apiToken(): string {
    const token = process.env.WASENDER_API_TOKEN;
    if (!token) {
      throw new Error(
        "WASENDER_API_TOKEN is required when WHATSAPP_PROVIDER=wasender. Set it in your server environment (never expose it to the browser)."
      );
    }
    return token;
  }

  async sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
    const res = await fetch(`${WASENDER_API_BASE}/send-message`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ to: input.to, text: input.body }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`WasenderAPI send-message failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { messageId?: string; id?: string };
    const providerMessageId = json.messageId ?? json.id;
    if (!providerMessageId) {
      throw new Error("WasenderAPI response did not include a message id");
    }
    return { providerMessageId };
  }
}

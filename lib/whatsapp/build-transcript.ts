import "server-only";
import type { WhatsAppMessage } from "@/lib/types";

// Adapts a WhatsApp message thread into the same "נציג:" / "לקוח:"
// speaker-labeled transcript format lib/ai/conversation-analysis.ts already
// parses, so the AI Conversation Summary bonus (requirement #16) reuses that
// existing analyzer instead of building a second AI architecture.
export function buildWhatsAppTranscript(messages: WhatsAppMessage[]): string {
  return messages
    .map((m) => `${m.direction === "incoming" ? "לקוח" : "נציג"}: ${m.body}`)
    .join("\n");
}

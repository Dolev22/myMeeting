import "server-only";

// Server entry point for the local, deterministic WhatsApp auto-responder.
// The responder itself lives in lib/ai/whatsapp-response-core.ts (pure,
// shared with the browser-only demo mode).
export {
  generateWhatsAppReply,
  type GenerateWhatsAppReplyInput,
} from "@/lib/ai/whatsapp-response-core";

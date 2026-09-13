import "server-only";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mock-provider";
import { WasenderWhatsAppProvider } from "@/lib/whatsapp/wasender-provider";
import type { WhatsAppProvider } from "@/lib/whatsapp/types";

// The single switch between mock and real WhatsApp integration. Every other
// module (webhook route, server actions, AI response generation) depends
// only on the WhatsAppProvider interface obtained here — never on
// MockWhatsAppProvider or WasenderWhatsAppProvider directly — so migrating
// from mock to real Wasender is just:
//
//   WHATSAPP_PROVIDER=wasender
//   WASENDER_API_TOKEN=...
//   WASENDER_PHONE_NUMBER=...
//
// with no code changes to the CRM's business logic or UI.
export function getWhatsAppProvider(): WhatsAppProvider {
  const configured = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (configured === "wasender") return new WasenderWhatsAppProvider();
  return new MockWhatsAppProvider();
}

// Convenience accessor for code that specifically needs mock-only behavior
// (the "Simulate Incoming WhatsApp" action only makes sense against the
// mock provider — there is no equivalent "simulate" concept for a real
// WhatsApp account).
export function getMockWhatsAppProvider(): MockWhatsAppProvider {
  const provider = getWhatsAppProvider();
  if (provider.name !== "mock") {
    throw new Error(
      "Simulating an incoming WhatsApp message requires WHATSAPP_PROVIDER=mock."
    );
  }
  return provider as MockWhatsAppProvider;
}

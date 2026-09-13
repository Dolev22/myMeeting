import "server-only";
import { headers } from "next/headers";

// The mock provider posts real HTTP requests to this app's own
// /api/whatsapp/webhook route (see mock-provider.ts) rather than calling
// webhook business logic in-process, so the same route genuinely handles
// both the mock flow and, later, real Wasender deliveries — nothing bypasses
// the webhook. Building an absolute URL for a self-call needs the current
// request's host, since there's no fixed public URL available inside a
// server action/serverless function in every deploy environment.
export async function getWhatsAppWebhookUrl(): Promise<string> {
  const store = await headers();
  const forwardedHost = store.get("x-forwarded-host");
  const host = forwardedHost ?? store.get("host");
  const forwardedProto = store.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host?.includes("localhost") ? "http" : "https");

  const base = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return `${base}/api/whatsapp/webhook`;
}

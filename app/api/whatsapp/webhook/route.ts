import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleWhatsAppWebhookEvent } from "@/lib/whatsapp/handlers";
import type { WhatsAppWebhookEvent } from "@/lib/whatsapp/types";

// Receives WhatsApp-style events. Same architectural role as the Cal.com
// webhook (app/api/webhooks/cal-com/route.ts): no logged-in session exists
// on this request, so it uses the service-role admin client (bypasses RLS)
// and every request is logged to `integration_events` regardless of
// outcome, verified or not.
//
// REAL FUTURE FLOW:  WhatsApp -> WasenderAPI -> this route -> handlers.ts
// MOCK CURRENT FLOW: Mock provider -> this route -> handlers.ts (identical)
//
// Both paths validate WHATSAPP_WEBHOOK_SECRET and hand off to the exact
// same `handleWhatsAppWebhookEvent` — nothing here is mock-specific.

async function logEvent(eventType: string, payload: unknown, processed: boolean, error?: string) {
  const admin = createAdminClient();
  await admin.from("integration_events").insert({
    source: "whatsapp",
    event_type: eventType,
    payload: payload as object,
    processed,
    error,
  });
}

function isValidSecret(request: NextRequest): boolean {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-webhook-secret");
  return provided === expected;
}

export async function POST(request: NextRequest) {
  if (!isValidSecret(request)) {
    await logEvent("unknown", { raw: "redacted" }, false, "invalid or missing webhook secret");
    return NextResponse.json({ error: "invalid webhook secret" }, { status: 401 });
  }

  let body: WhatsAppWebhookEvent;
  try {
    body = await request.json();
  } catch {
    await logEvent("unknown", {}, false, "invalid JSON body");
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("event" in body)) {
    await logEvent("unknown", body, false, "missing event type");
    return NextResponse.json({ error: "missing event type" }, { status: 400 });
  }

  if (body.event !== "message-received" && body.event !== "message-sent") {
    await logEvent(String((body as { event?: unknown }).event ?? "unknown"), body, false, "unknown webhook event");
    // Still 200: an unrecognized-but-authenticated event shouldn't make the
    // sender (real Wasender, in the future) retry forever.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  try {
    const result = await handleWhatsAppWebhookEvent(admin, body);
    await logEvent(body.event, body, result.ok, result.ok ? undefined : result.reason);
    return NextResponse.json({
      ok: result.ok,
      reason: result.reason,
      leadId: result.leadId,
      conversationId: result.conversationId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEvent(body.event, body, false, message);
    // Still 200: the event was received and durably logged; a real provider
    // shouldn't retry forever over an app-side data issue.
    return NextResponse.json({ ok: false, error: message });
  }
}

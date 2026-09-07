import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCalComSignature } from "@/lib/cal-com/verify";
import type { CalComWebhookBody } from "@/lib/cal-com/types";

// Receives Cal.com booking events. No logged-in user is present on this
// request, so it uses the service-role admin client (bypasses RLS) and
// attributes each event to a CRM user by matching `payload.organizer.username`
// against that user's `profiles.cal_com_username` — see docs/plan.md
// section 8. Every request is logged to `integration_events`, verified or
// not, so failures are debuggable without needing to reproduce them.

async function logEvent(
  eventType: string,
  payload: unknown,
  processed: boolean,
  error?: string
) {
  const admin = createAdminClient();
  await admin.from("integration_events").insert({
    source: "cal_com",
    event_type: eventType,
    payload: payload as object,
    processed,
    error,
  });
}

function minutesBetween(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 30;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(5, Math.round(ms / 60_000));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!verifyCalComSignature(rawBody, signature)) {
    // Logged with a raw-text fallback since we can't trust the payload shape
    // yet, and returned as a non-2xx so Cal.com's delivery log shows Failed.
    await logEvent("unknown", { raw: rawBody.slice(0, 2000) }, false, "invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: CalComWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    await logEvent("unknown", { raw: rawBody.slice(0, 2000) }, false, "invalid JSON body");
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { triggerEvent, payload } = body;

  // Cal.com's webhook "Ping Test" sends no real payload/trigger — a verified
  // signature with nothing to process is still a successful receipt.
  if (!triggerEvent || !payload) {
    await logEvent(triggerEvent ?? "PING", body, true);
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const username = payload.organizer?.username;

  if (!username) {
    await logEvent(triggerEvent, body, false, "payload missing organizer.username");
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("cal_com_username", username)
    .maybeSingle();

  if (!profile) {
    await logEvent(triggerEvent, body, false, `no profile with cal_com_username="${username}"`);
    return NextResponse.json({ ok: true });
  }

  const userId = profile.id as string;
  const attendee = payload.attendees?.[0];

  try {
    if (triggerEvent === "BOOKING_CREATED") {
      let leadId: string | null = null;

      if (attendee?.email) {
        const { data: existingLead } = await admin
          .from("leads")
          .select("id")
          .eq("user_id", userId)
          .eq("email", attendee.email)
          .maybeSingle();
        leadId = (existingLead?.id as string) ?? null;
      }

      if (!leadId) {
        const { data: newLead, error: leadError } = await admin
          .from("leads")
          .insert({
            user_id: userId,
            name: attendee?.name ?? attendee?.email ?? "ליד מ-Cal.com",
            email: attendee?.email,
            source: "cal_com",
            status: "meeting_scheduled",
          })
          .select("id")
          .single();
        if (leadError) throw leadError;
        leadId = newLead.id as string;
      } else {
        await admin
          .from("leads")
          .update({ status: "meeting_scheduled" })
          .eq("id", leadId)
          .eq("user_id", userId);
      }

      const { error: meetingError } = await admin.from("meetings").upsert(
        {
          user_id: userId,
          lead_id: leadId,
          title: payload.title ?? "פגישה מ-Cal.com",
          scheduled_at: payload.startTime,
          duration_minutes: minutesBetween(payload.startTime, payload.endTime),
          method: "cal_com",
          location_or_link: payload.videoCallUrl ?? payload.location,
          status: "scheduled",
          cal_com_booking_uid: payload.uid,
        },
        { onConflict: "cal_com_booking_uid" }
      );
      if (meetingError) throw meetingError;
    } else if (triggerEvent === "BOOKING_RESCHEDULED") {
      const lookupUid = payload.rescheduleUid ?? payload.uid;
      const { error } = await admin
        .from("meetings")
        .update({
          scheduled_at: payload.startTime,
          duration_minutes: minutesBetween(payload.startTime, payload.endTime),
          status: "scheduled",
          cal_com_booking_uid: payload.uid,
        })
        .eq("user_id", userId)
        .eq("cal_com_booking_uid", lookupUid);
      if (error) throw error;
    } else if (triggerEvent === "BOOKING_CANCELLED") {
      const { error } = await admin
        .from("meetings")
        .update({ status: "canceled" })
        .eq("user_id", userId)
        .eq("cal_com_booking_uid", payload.uid);
      if (error) throw error;
    } else if (triggerEvent === "MEETING_ENDED") {
      const { data: meeting, error } = await admin
        .from("meetings")
        .update({ status: "completed" })
        .eq("user_id", userId)
        .eq("cal_com_booking_uid", payload.uid)
        .select("lead_id")
        .maybeSingle();
      if (error) throw error;
      if (meeting?.lead_id) {
        await admin
          .from("leads")
          .update({ status: "meeting_completed" })
          .eq("id", meeting.lead_id)
          .eq("user_id", userId);
      }
    }

    await logEvent(triggerEvent, body, true);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logEvent(triggerEvent, body, false, err instanceof Error ? err.message : String(err));
    // Still 200: the event was received and durably logged; Cal.com
    // shouldn't retry forever over an app-side data issue.
    return NextResponse.json({ ok: true });
  }
}

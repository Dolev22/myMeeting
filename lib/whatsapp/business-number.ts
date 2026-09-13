import "server-only";
import { createClient } from "@/lib/supabase/server";

// The WhatsApp number a CRM account is "connected" to. The real webhook flow
// (real WasenderAPI, future) resolves which CRM account an inbound event
// belongs to by matching the number the message was sent *to* against this
// column — exactly how the existing Cal.com webhook resolves an account via
// `profiles.cal_com_username` (see app/api/webhooks/cal-com/route.ts). In
// mock mode there is no real number to connect, so one is generated
// deterministically from the user id on first use and persisted, so it
// stays stable across requests/devices without requiring any setup step.
export async function getOrAssignBusinessNumber(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("whatsapp_phone_number")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const existing = profile.whatsapp_phone_number as string | null;
  if (existing) return existing;

  const digits = userId.replace(/[^0-9]/g, "").padEnd(6, "0").slice(0, 6);
  const generated = `+9725${digits}`;

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ whatsapp_phone_number: generated })
    .eq("id", userId)
    .select("whatsapp_phone_number")
    .single();
  // A rare id collision on the generated number (unique constraint) loses
  // the race to another profile — extremely unlikely given the id-derived
  // digits, but fall back to the plain value rather than failing the whole
  // "Simulate Incoming WhatsApp" action over it.
  if (updateError) return generated;
  return updated.whatsapp_phone_number as string;
}

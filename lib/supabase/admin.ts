import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

// Service-role client. Server-only, never imported from client components.
// Used solely to create pre-confirmed accounts on sign-up (this project has
// no custom SMTP configured, so relying on Supabase's built-in email sender
// for confirmation links hits its low rate limit almost immediately).
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createSupabaseClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

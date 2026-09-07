import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

// Server-side Supabase client scoped to the current request's session.
// All reads/writes made through this client are subject to the Postgres
// Row Level Security policies defined in supabase/migrations — that RLS,
// not application code, is what enforces per-user data isolation.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component that can't set cookies; the
          // proxy (see proxy.ts) refreshes the session cookie instead.
        }
      },
    },
  });
}

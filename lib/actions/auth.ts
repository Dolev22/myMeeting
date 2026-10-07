"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AuthFormState {
  error?: string;
}

// A sign-in/sign-up call that never got an answer from Supabase (project
// paused, network down, 5xx) is not a wrong password — reporting it as one
// sends people chasing credentials that are actually fine.
function isBackendUnavailable(error: { name?: string; status?: number }): boolean {
  const status = error.status ?? 0;
  return error.name === "AuthRetryableFetchError" || status === 0 || status >= 500;
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };
  if (!isSupabaseConfigured()) return { error: "unavailable" };

  // Created pre-confirmed via the admin API: this project has no custom SMTP
  // configured, so relying on Supabase's built-in confirmation email would
  // hit its very low rate limit almost immediately.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (createError) {
    if (isBackendUnavailable(createError)) return { error: "unavailable" };
    return {
      error: createError.code === "email_exists" ? "emailInUse" : "invalid",
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { error: "invalid" };

  redirect("/");
}

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };
  if (!isSupabaseConfigured()) return { error: "unavailable" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: isBackendUnavailable(error) ? "unavailable" : "userNotFound" };

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

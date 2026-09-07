"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthFormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";

const initialState: AuthFormState = {};

export function LoginForm() {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.auth.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoFocus />
      </FormField>
      <FormField label={dict.auth.password} htmlFor="password" required>
        <Input id="password" name="password" type="password" required />
      </FormField>

      {state.error && (
        <p className="text-sm text-red-600">
          {state.error === "userNotFound" ? dict.auth.userNotFound : dict.auth.invalid}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {dict.auth.loginButton}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        {dict.auth.noAccount}{" "}
        <Link href="/signup" className="font-medium text-teal-700 hover:underline">
          {dict.auth.goToSignup}
        </Link>
      </p>
    </form>
  );
}

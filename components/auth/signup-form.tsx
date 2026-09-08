"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthFormState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";

const initialState: AuthFormState = {};

export function SignupForm() {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.auth.fullName} htmlFor="fullName" required>
        <Input id="fullName" name="fullName" required autoFocus />
      </FormField>
      <FormField label={dict.auth.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" required />
      </FormField>
      <FormField label={dict.auth.password} htmlFor="password" required>
        <Input id="password" name="password" type="password" minLength={6} required />
      </FormField>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error === "emailInUse" ? dict.auth.emailInUse : dict.auth.invalid}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {dict.auth.signupButton}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {dict.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          {dict.auth.goToLogin}
        </Link>
      </p>
    </form>
  );
}

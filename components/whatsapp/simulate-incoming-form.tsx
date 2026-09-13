"use client";

import { useActionState, useState } from "react";
import { simulateIncomingWhatsAppAction, type SimulateIncomingFormState } from "@/lib/actions/whatsapp";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/field";

const initialState: SimulateIncomingFormState = {};

const ERROR_KEYS: Record<string, "errorInvalid" | "errorSimulateFailed"> = {
  invalid: "errorInvalid",
  simulate_failed: "errorSimulateFailed",
};

export function SimulateIncomingForm() {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(simulateIncomingWhatsAppAction, initialState);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        {dict.whatsapp.simulateButton}
      </Button>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.whatsapp.simulateTitle}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} type="button">
          {dict.common.cancel}
        </Button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.whatsapp.simulateHint}</p>

      <form action={formAction} className="space-y-4">
        <FormField label={dict.whatsapp.formName} htmlFor="name" required>
          <Input id="name" name="name" required />
        </FormField>
        <FormField label={dict.whatsapp.formPhone} htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={dict.whatsapp.formPhonePlaceholder}
            required
          />
        </FormField>
        <FormField label={dict.whatsapp.formMessage} htmlFor="message" required>
          <Textarea
            id="message"
            name="message"
            placeholder={dict.whatsapp.formMessagePlaceholder}
            required
          />
        </FormField>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {dict.whatsapp[ERROR_KEYS[state.error] ?? "errorSimulateFailed"]}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? dict.whatsapp.simulateSending : dict.whatsapp.simulateSubmit}
        </Button>
      </form>
    </Card>
  );
}

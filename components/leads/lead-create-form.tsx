"use client";

import { useActionState } from "react";
import { createLeadAction, type LeadFormState } from "@/lib/actions/leads";
import { useI18n } from "@/lib/i18n/client";
import { LEAD_SOURCES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";

const initialState: LeadFormState = {};

export function LeadCreateForm() {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(createLeadAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.common.name} htmlFor="name" required>
        <Input id="name" name="name" required autoFocus />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.common.phone} htmlFor="phone">
          <Input id="phone" name="phone" type="tel" />
        </FormField>
        <FormField label={dict.common.email} htmlFor="email">
          <Input id="email" name="email" type="email" />
        </FormField>
      </div>
      <FormField label={dict.common.company} htmlFor="company">
        <Input id="company" name="company" />
      </FormField>
      <FormField label={dict.common.source} htmlFor="source" required>
        <select
          id="source"
          name="source"
          required
          defaultValue="website"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {dict.leadSource[s]}
            </option>
          ))}
        </select>
      </FormField>

      {state.error && <p className="text-sm text-red-600">{dict.common.required}</p>}

      <Button type="submit" disabled={pending}>
        {dict.common.create}
      </Button>
    </form>
  );
}

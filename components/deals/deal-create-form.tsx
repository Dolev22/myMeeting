"use client";

import { useActionState } from "react";
import { createDealAction, type DealFormState } from "@/lib/actions/deals";
import { useI18n } from "@/lib/i18n/client";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

const initialState: DealFormState = {};

export function DealCreateForm({
  leads,
  defaultLeadId,
}: {
  leads: Lead[];
  defaultLeadId?: string;
}) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(createDealAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.deals.relatedLead} htmlFor="leadId" required>
        <Select id="leadId" name="leadId" required defaultValue={defaultLeadId ?? ""}>
          <option value="" disabled>
            —
          </option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
              {lead.company ? ` (${lead.company})` : ""}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.common.name} htmlFor="title" required>
        <Input id="title" name="title" required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.deals.value} htmlFor="value" required>
          <Input id="value" name="value" type="number" min={0} step={1} required />
        </FormField>
        <FormField label={dict.deals.currency} htmlFor="currency" required>
          <Input id="currency" name="currency" defaultValue="ILS" required />
        </FormField>
      </div>

      <FormField label={dict.deals.product} htmlFor="productOrService">
        <Input id="productOrService" name="productOrService" />
      </FormField>

      <FormField label={dict.deals.closeDate} htmlFor="closeDate">
        <Input id="closeDate" name="closeDate" type="date" />
      </FormField>

      <FormField label={dict.common.notes} htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </FormField>

      {state.error && <p className="text-sm text-red-600">{dict.common.required}</p>}

      <Button type="submit" disabled={pending}>
        {dict.common.create}
      </Button>
    </form>
  );
}

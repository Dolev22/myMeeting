"use client";

import { updateLeadAction } from "@/lib/actions/leads";
import { useI18n } from "@/lib/i18n/client";
import { LEAD_SOURCES, type Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/field";

export function LeadEditForm({ lead }: { lead: Lead }) {
  const { dict } = useI18n();
  const action = updateLeadAction.bind(null, lead.id);

  return (
    <form action={action} className="space-y-4">
      <FormField label={dict.common.name} htmlFor="name" required>
        <Input id="name" name="name" defaultValue={lead.name} required />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.common.phone} htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} />
        </FormField>
        <FormField label={dict.common.email} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} />
        </FormField>
      </div>
      <FormField label={dict.common.company} htmlFor="company">
        <Input id="company" name="company" defaultValue={lead.company ?? ""} />
      </FormField>
      <FormField label={dict.common.source} htmlFor="source" required>
        <Select id="source" name="source" defaultValue={lead.source} required>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {dict.leadSource[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <Button type="submit" size="sm">
        {dict.common.save}
      </Button>
    </form>
  );
}

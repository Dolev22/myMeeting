"use client";

import { updateDealAction } from "@/lib/actions/deals";
import { useI18n } from "@/lib/i18n/client";
import { DEAL_STATUSES, type Deal, type Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

export function DealEditForm({ deal, leads }: { deal: Deal; leads: Lead[] }) {
  const { dict } = useI18n();
  const action = updateDealAction.bind(null, deal.id);

  return (
    <form action={action} className="space-y-4">
      <FormField label={dict.deals.relatedLead} htmlFor="leadId" required>
        <Select id="leadId" name="leadId" required defaultValue={deal.leadId}>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.common.name} htmlFor="title" required>
        <Input id="title" name="title" defaultValue={deal.title} required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.deals.value} htmlFor="value" required>
          <Input
            id="value"
            name="value"
            type="number"
            min={0}
            step={1}
            defaultValue={deal.value}
            required
          />
        </FormField>
        <FormField label={dict.deals.currency} htmlFor="currency" required>
          <Input id="currency" name="currency" defaultValue={deal.currency} required />
        </FormField>
      </div>

      <FormField label={dict.common.status} htmlFor="status" required>
        <Select id="status" name="status" defaultValue={deal.status} required>
          {DEAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {dict.dealStatus[s]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.deals.product} htmlFor="productOrService">
        <Input
          id="productOrService"
          name="productOrService"
          defaultValue={deal.productOrService ?? ""}
        />
      </FormField>

      <FormField label={dict.deals.closeDate} htmlFor="closeDate">
        <Input id="closeDate" name="closeDate" type="date" defaultValue={deal.closeDate ?? ""} />
      </FormField>

      <FormField label={dict.common.notes} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={deal.notes ?? ""} />
      </FormField>

      <Button type="submit" size="sm">
        {dict.common.save}
      </Button>
    </form>
  );
}

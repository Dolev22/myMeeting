"use client";

import { updateLeadStatusAction } from "@/lib/actions/leads";
import { useI18n } from "@/lib/i18n/client";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { Select } from "@/components/ui/field";

export function LeadStatusForm({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const { dict } = useI18n();
  const action = updateLeadStatusAction.bind(null, leadId);

  return (
    <form
      action={action}
      onChange={(event) => (event.currentTarget as HTMLFormElement).requestSubmit()}
    >
      <Select name="status" defaultValue={status} className="w-56">
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {dict.leadStatus[s]}
          </option>
        ))}
      </Select>
    </form>
  );
}

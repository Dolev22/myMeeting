"use client";

import { useActionState } from "react";
import { createMeetingAction, type MeetingFormState } from "@/lib/actions/meetings";
import { useI18n } from "@/lib/i18n/client";
import { MEETING_METHODS } from "@/lib/types";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

const initialState: MeetingFormState = {};

export function MeetingCreateForm({
  leads,
  defaultLeadId,
}: {
  leads: Lead[];
  defaultLeadId?: string;
}) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(createMeetingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.meetings.relatedLead} htmlFor="leadId" required>
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
        <FormField label={dict.meetings.dateTime} htmlFor="scheduledAt" required>
          <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
        </FormField>
        <FormField label={dict.meetings.duration} htmlFor="durationMinutes" required>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            defaultValue={30}
            required
          />
        </FormField>
      </div>

      <FormField label={dict.meetings.method} htmlFor="method" required>
        <Select id="method" name="method" defaultValue="zoom" required>
          {MEETING_METHODS.map((m) => (
            <option key={m} value={m}>
              {dict.meetingMethod[m]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.meetings.location} htmlFor="locationOrLink">
        <Input id="locationOrLink" name="locationOrLink" />
      </FormField>

      <FormField label={dict.meetings.meetingNotes} htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </FormField>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{dict.common.required}</p>}

      <Button type="submit" disabled={pending}>
        {dict.common.create}
      </Button>
    </form>
  );
}

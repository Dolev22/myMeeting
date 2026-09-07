"use client";

import { updateMeetingAction } from "@/lib/actions/meetings";
import { useI18n } from "@/lib/i18n/client";
import { MEETING_METHODS, MEETING_STATUSES, type Lead, type Meeting } from "@/lib/types";
import { toDatetimeLocalValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

export function MeetingEditForm({ meeting, leads }: { meeting: Meeting; leads: Lead[] }) {
  const { dict } = useI18n();
  const action = updateMeetingAction.bind(null, meeting.id);

  return (
    <form action={action} className="space-y-4">
      <FormField label={dict.meetings.relatedLead} htmlFor="leadId" required>
        <Select id="leadId" name="leadId" required defaultValue={meeting.leadId}>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.common.name} htmlFor="title" required>
        <Input id="title" name="title" defaultValue={meeting.title} required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.meetings.dateTime} htmlFor="scheduledAt" required>
          <Input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(meeting.scheduledAt)}
            required
          />
        </FormField>
        <FormField label={dict.meetings.duration} htmlFor="durationMinutes" required>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            defaultValue={meeting.durationMinutes}
            required
          />
        </FormField>
      </div>

      <FormField label={dict.meetings.method} htmlFor="method" required>
        <Select id="method" name="method" defaultValue={meeting.method} required>
          {MEETING_METHODS.map((m) => (
            <option key={m} value={m}>
              {dict.meetingMethod[m]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.common.status} htmlFor="status" required>
        <Select id="status" name="status" defaultValue={meeting.status} required>
          {MEETING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {dict.meetingStatus[s]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.meetings.location} htmlFor="locationOrLink">
        <Input id="locationOrLink" name="locationOrLink" defaultValue={meeting.locationOrLink ?? ""} />
      </FormField>

      <FormField label={dict.meetings.meetingNotes} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={meeting.notes ?? ""} />
      </FormField>

      <Button type="submit" size="sm">
        {dict.common.save}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createTaskAction, type TaskFormState } from "@/lib/actions/tasks";
import { useI18n } from "@/lib/i18n/client";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

const initialState: TaskFormState = {};

export function TaskCreateForm({
  leads,
  defaultLeadId,
}: {
  leads: Lead[];
  defaultLeadId?: string;
}) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={dict.tasks.relatedLead} htmlFor="leadId" required>
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

      <FormField label={dict.tasks.taskName} htmlFor="name" required>
        <Input id="name" name="name" required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.common.status} htmlFor="status" required>
          <Select id="status" name="status" defaultValue="new" required>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.taskStatus[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={dict.common.priority} htmlFor="priority" required>
          <Select id="priority" name="priority" defaultValue="medium" required>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {dict.taskPriority[p]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.tasks.dueDate} htmlFor="dueDate">
          <Input id="dueDate" name="dueDate" type="date" />
        </FormField>
        <FormField label={dict.tasks.assignedTo} htmlFor="assignedTo">
          <Input id="assignedTo" name="assignedTo" placeholder={dict.tasks.assignedToPlaceholder} />
        </FormField>
      </div>

      <FormField label={dict.tasks.taskNotes} htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </FormField>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{dict.common.required}</p>}

      <Button type="submit" disabled={pending}>
        {dict.common.create}
      </Button>
    </form>
  );
}

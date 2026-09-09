"use client";

import { updateTaskAction } from "@/lib/actions/tasks";
import { useI18n } from "@/lib/i18n/client";
import { TASK_PRIORITIES, TASK_STATUSES, type Lead, type Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

export function TaskEditForm({ task, leads }: { task: Task; leads: Lead[] }) {
  const { dict } = useI18n();
  const action = updateTaskAction.bind(null, task.id);

  return (
    <form action={action} className="space-y-4">
      <FormField label={dict.tasks.relatedLead} htmlFor="leadId" required>
        <Select id="leadId" name="leadId" required defaultValue={task.leadId}>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
              {lead.company ? ` (${lead.company})` : ""}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.tasks.taskName} htmlFor="name" required>
        <Input id="name" name="name" defaultValue={task.name} required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={dict.common.status} htmlFor="status" required>
          <Select id="status" name="status" defaultValue={task.status} required>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.taskStatus[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={dict.common.priority} htmlFor="priority" required>
          <Select id="priority" name="priority" defaultValue={task.priority} required>
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
          <Input id="dueDate" name="dueDate" type="date" defaultValue={task.dueDate ?? ""} />
        </FormField>
        <FormField label={dict.tasks.assignedTo} htmlFor="assignedTo">
          <Input
            id="assignedTo"
            name="assignedTo"
            defaultValue={task.assignedTo ?? ""}
            placeholder={dict.tasks.assignedToPlaceholder}
          />
        </FormField>
      </div>

      <FormField label={dict.tasks.taskNotes} htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={task.notes ?? ""} />
      </FormField>

      <Button type="submit" size="sm">
        {dict.common.save}
      </Button>
    </form>
  );
}

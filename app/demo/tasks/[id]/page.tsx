"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { DemoLoading, DemoNotFound } from "@/components/demo/demo-ui";
import { useDemoData } from "@/lib/demo/store";
import { deleteTask, listLeads, updateTask } from "@/lib/demo/repo";
import { parseTaskForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/tasks/[id]/page.tsx.
export default function DemoTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dict } = useI18n();
  const router = useRouter();
  const data = useDemoData();
  const [leaving, setLeaving] = useState(false);

  if (!data || leaving) return <DemoLoading />;
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return <DemoNotFound />;
  const lead = data.leads.find((l) => l.id === task.leadId);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{task.name}</h1>
        {lead && (
          <Link
            href={`${DEMO_BASE}/leads/${lead.id}`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card>
        <TaskEditForm
          key={task.updatedAt}
          task={task}
          leads={listLeads(data)}
          action={(formData) => {
            const input = parseTaskForm(formData);
            if (input) updateTask(task.id, input);
          }}
        />
      </Card>

      <form
        action={() => {
          setLeaving(true);
          deleteTask(task.id);
          router.push(`${DEMO_BASE}/tasks`);
        }}
      >
        <ConfirmSubmitButton confirmMessage={dict.tasks.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

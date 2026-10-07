"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import { DemoLoading } from "@/components/demo/demo-ui";
import type { TaskFormState } from "@/lib/actions/tasks";
import { useDemoData } from "@/lib/demo/store";
import { createTask, listLeads } from "@/lib/demo/repo";
import { parseTaskForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/tasks/new/page.tsx.
export default function DemoNewTaskPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  function createAction(_state: TaskFormState, formData: FormData): TaskFormState {
    const input = parseTaskForm(formData);
    if (!input) return { error: "invalid" };
    const task = createTask(input);
    router.push(`${DEMO_BASE}/tasks/${task.id}`);
    return {};
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.tasks.newTask}</h1>
      <Card>
        <TaskCreateForm
          leads={listLeads(data)}
          defaultLeadId={params.get("leadId") ?? undefined}
          action={createAction}
        />
      </Card>
    </div>
  );
}

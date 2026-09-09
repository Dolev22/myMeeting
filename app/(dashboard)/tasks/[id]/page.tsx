import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getTask } from "@/lib/repo/tasks";
import { getLead, listLeads } from "@/lib/repo/leads";
import { deleteTaskAction } from "@/lib/actions/tasks";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { TaskEditForm } from "@/components/tasks/task-edit-form";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const task = await getTask(userId, id);
  if (!task) notFound();

  const dict = getDictionary(locale);
  const [lead, leads] = await Promise.all([
    getLead(userId, task.leadId),
    listLeads(userId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{task.name}</h1>
        {lead && (
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card>
        <TaskEditForm task={task} leads={leads} />
      </Card>

      <form action={deleteTaskAction.bind(null, task.id, task.leadId)}>
        <ConfirmSubmitButton confirmMessage={dict.tasks.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

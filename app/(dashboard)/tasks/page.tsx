import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listTasks, type TaskDueFilter } from "@/lib/repo/tasks";
import { listLeads } from "@/lib/repo/leads";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/status-badges";
import { formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/cn";

type Search = { status?: string; priority?: string; due?: string };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [userId, locale, params] = await Promise.all([
    getCurrentUserId(),
    getLocale(),
    searchParams,
  ]);
  if (!userId) redirect("/login");

  const dict = getDictionary(locale);
  const status = (params.status as TaskStatus | "all" | undefined) ?? "all";
  const priority = (params.priority as TaskPriority | "all" | undefined) ?? "all";
  const due = (params.due as TaskDueFilter | undefined) ?? "all";

  const [tasks, leads] = await Promise.all([
    listTasks(userId, { status, priority, due }),
    listLeads(userId),
  ]);
  const leadById = new Map(leads.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.tasks.title}</h1>
        <LinkButton href="/tasks/new">{dict.tasks.newTask}</LinkButton>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <Select name="status" defaultValue={status} className="sm:w-48">
            <option value="all">{dict.common.all}</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.taskStatus[s]}
              </option>
            ))}
          </Select>
          <Select name="priority" defaultValue={priority} className="sm:w-48">
            <option value="all">{dict.common.all}</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {dict.taskPriority[p]}
              </option>
            ))}
          </Select>
          <Select name="due" defaultValue={due} className="sm:w-48">
            <option value="all">{dict.tasks.dueFilterAll}</option>
            <option value="overdue">{dict.tasks.dueFilterOverdue}</option>
            <option value="today">{dict.tasks.dueFilterToday}</option>
            <option value="upcoming">{dict.tasks.dueFilterUpcoming}</option>
          </Select>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            {dict.common.filter}
          </button>
        </form>
      </Card>

      <Card className="p-0">
        {tasks.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{dict.tasks.taskName}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.tasks.relatedLead}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.status}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.priority}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.tasks.dueDate}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.tasks.assignedTo}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tasks.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                  <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                      >
                        {task.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {leadById.get(task.leadId) ? (
                        <Link href={`/leads/${task.leadId}`} className="hover:underline">
                          {leadById.get(task.leadId)?.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <TaskPriorityBadge priority={task.priority} />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3",
                        overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-zinc-600 dark:text-zinc-300"
                      )}
                    >
                      {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                      {overdue && <span className="ms-2">({dict.tasks.overdue})</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {task.assignedTo || dict.tasks.noAssignee}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

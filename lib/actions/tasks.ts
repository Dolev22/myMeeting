"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createTask, deleteTask, updateTask } from "@/lib/repo/tasks";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/types";

const taskSchema = z.object({
  leadId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).optional(),
  dueDate: z.string().trim().optional(),
  assignedTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export interface TaskFormState {
  error?: string;
}

export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = taskSchema.safeParse({
    leadId: formData.get("leadId"),
    name: formData.get("name"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    assignedTo: formData.get("assignedTo") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const data = parsed.data;
  const task = await createTask(userId, {
    leadId: data.leadId,
    name: data.name,
    status: data.status as TaskStatus | undefined,
    priority: data.priority as TaskPriority | undefined,
    dueDate: data.dueDate,
    assignedTo: data.assignedTo,
    notes: data.notes,
  });
  revalidatePath("/tasks");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/");
  redirect(`/tasks/${task.id}`);
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = taskSchema.safeParse({
    leadId: formData.get("leadId"),
    name: formData.get("name"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    assignedTo: formData.get("assignedTo") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  const data = parsed.data;
  await updateTask(userId, taskId, {
    leadId: data.leadId,
    name: data.name,
    status: data.status as TaskStatus | undefined,
    priority: data.priority as TaskPriority | undefined,
    dueDate: data.dueDate,
    assignedTo: data.assignedTo,
    notes: data.notes,
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/");
}

export async function deleteTaskAction(taskId: string, leadId: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await deleteTask(userId, taskId);
  revalidatePath("/tasks");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  redirect("/tasks");
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapTask } from "@/lib/repo/mappers";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

// Every function takes `userId` explicitly and filters on it as
// defense-in-depth, but the real authorization boundary is the Postgres
// Row Level Security policy on `tasks` (`auth.uid() = user_id`).

export type TaskDueFilter = "overdue" | "today" | "upcoming" | "all";

export interface TaskFilters {
  leadId?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  due?: TaskDueFilter;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function listTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select("*").eq("user_id", userId);

  if (filters.leadId) {
    query = query.eq("lead_id", filters.leadId);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  const today = todayDateString();
  if (filters.due === "overdue") {
    query = query.lt("due_date", today).neq("status", "completed");
  } else if (filters.due === "today") {
    query = query.eq("due_date", today);
  } else if (filters.due === "upcoming") {
    query = query.gt("due_date", today);
  }

  const { data, error } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTask);
}

export async function listOverdueTasks(userId: string): Promise<Task[]> {
  return listTasks(userId, { due: "overdue" });
}

export async function getTask(userId: string, id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTask(data) : null;
}

export interface TaskInput {
  leadId: string;
  name: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
}

export async function createTask(userId: string, input: TaskInput): Promise<Task> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      name: input.name,
      status: input.status ?? "new",
      priority: input.priority ?? "medium",
      due_date: input.dueDate || null,
      assigned_to: input.assignedTo,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapTask(data);
}

export async function updateTask(
  userId: string,
  id: string,
  input: Partial<TaskInput>
): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      lead_id: input.leadId,
      name: input.name,
      status: input.status,
      priority: input.priority,
      due_date: input.dueDate || null,
      assigned_to: input.assignedTo,
      notes: input.notes,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapTask(data) : null;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tasks")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

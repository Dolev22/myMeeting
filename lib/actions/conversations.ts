"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import {
  createConversation,
  deleteConversation,
  getConversation,
  saveConversationAnalysis,
  updateConversationTranscription,
} from "@/lib/repo/conversations";
import { createTasks, listTasksBySourceConversation } from "@/lib/repo/tasks";
import { analyzeConversation } from "@/lib/ai/conversation-analysis";
import { CONVERSATION_DIRECTIONS, type ConversationDirection, type Task } from "@/lib/types";

const conversationSchema = z.object({
  leadId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  time: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  direction: z.enum(CONVERSATION_DIRECTIONS as [string, ...string[]]),
  notes: z.string().trim().optional(),
  transcription: z.string().trim().optional(),
});

export interface ConversationFormState {
  error?: string;
}

export async function createConversationAction(
  _prevState: ConversationFormState,
  formData: FormData
): Promise<ConversationFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = conversationSchema.safeParse({
    leadId: formData.get("leadId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMinutes: formData.get("durationMinutes"),
    direction: formData.get("direction"),
    notes: formData.get("notes") || undefined,
    transcription: formData.get("transcription") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const data = parsed.data;
  const occurredAt = new Date(`${data.date}T${data.time}`);
  if (Number.isNaN(occurredAt.getTime())) return { error: "invalid" };

  await createConversation(userId, {
    leadId: data.leadId,
    occurredAt: occurredAt.toISOString(),
    durationMinutes: data.durationMinutes,
    direction: data.direction as ConversationDirection,
    notes: data.notes,
    transcription: data.transcription,
  });
  revalidatePath(`/leads/${data.leadId}`);
  redirect(`/leads/${data.leadId}#conversations`);
}

export async function deleteConversationAction(conversationId: string, leadId: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await deleteConversation(userId, conversationId);
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}#conversations`);
}

export interface TranscriptionFormState {
  error?: string;
}

export async function updateTranscriptionAction(
  conversationId: string,
  leadId: string,
  _prevState: TranscriptionFormState,
  formData: FormData
): Promise<TranscriptionFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const transcription = (formData.get("transcription") as string | null) ?? "";
  await updateConversationTranscription(userId, conversationId, transcription.trim());
  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export interface AnalyzeConversationFormState {
  error?: string;
}

export async function analyzeConversationAction(
  conversationId: string,
  leadId: string,
  _prevState: AnalyzeConversationFormState,
  _formData: FormData
): Promise<AnalyzeConversationFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return { error: "not_found" };
  if (!conversation.transcription || !conversation.transcription.trim()) {
    return { error: "no_transcription" };
  }

  try {
    const analysis = await analyzeConversation({
      transcription: conversation.transcription,
      occurredAt: conversation.occurredAt,
    });
    await saveConversationAnalysis(userId, conversationId, analysis);
  } catch (err) {
    // The transcription itself is untouched by this failure (it's a
    // separate DB write above), and no tasks are created from a failed
    // analysis — see requirement #7 in the AI Conversation Analysis spec.
    console.error("[conversation-analysis] analysis failed", {
      conversationId,
      leadId,
      error: err,
    });
    return { error: "unknown_error" };
  }

  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export interface CreateTasksFormState {
  error?: string;
  alreadyCreated?: boolean;
  createdCount?: number;
}

export async function createTasksFromAnalysisAction(
  conversationId: string,
  leadId: string,
  _prevState: CreateTasksFormState,
  _formData: FormData
): Promise<CreateTasksFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  // Idempotency: tasks already generated from this conversation are linked
  // via tasks.source_conversation_id, so a second click never duplicates
  // them, regardless of client-side state (survives refresh too).
  const existing = await listTasksBySourceConversation(userId, conversationId);
  if (existing.length > 0) {
    return { alreadyCreated: true, createdCount: existing.length };
  }

  const conversation = await getConversation(userId, conversationId);
  if (!conversation || !conversation.analysis) return { error: "no_analysis" };

  const suggested = conversation.analysis.suggestedTasks;
  if (suggested.length === 0) {
    return { createdCount: 0 };
  }

  let created: Task[];
  try {
    created = await createTasks(
      userId,
      suggested.map((task) => ({
        leadId,
        name: task.name,
        notes: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        sourceConversationId: conversationId,
      }))
    );
  } catch (err) {
    console.error("[conversation-analysis] task creation failed", {
      conversationId,
      leadId,
      error: err,
    });
    return { error: "unknown_error" };
  }

  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/tasks");
  revalidatePath("/");
  return { createdCount: created.length };
}

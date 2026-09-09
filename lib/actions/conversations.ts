"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createConversation, deleteConversation } from "@/lib/repo/conversations";
import { CONVERSATION_DIRECTIONS, type ConversationDirection } from "@/lib/types";

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

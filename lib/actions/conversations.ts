"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  createConversation,
  deleteConversation,
  getConversation,
  saveConversationAnalysis,
  saveConversationAudioMetadata,
  updateConversationTranscription,
} from "@/lib/repo/conversations";
import { createTasks, listTasksBySourceConversation } from "@/lib/repo/tasks";
import { analyzeConversation } from "@/lib/ai/conversation-analysis";
import { transcribeAudio } from "@/lib/ai/transcription-provider";
import { ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_FILE_BYTES, getFileExtension } from "@/lib/audio/constants";
import { CONVERSATION_DIRECTIONS, type ConversationDirection, type Task } from "@/lib/types";

const AUDIO_BUCKET = "audio-files";

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

export interface TranscribeAudioResult {
  error?: string;
  transcription?: string;
}

// Audio -> Whisper transcription -> save transcription -> AI analysis ->
// save analysis, chained into one call so uploading a recording is a single
// user action (per the AI Conversation Analysis spec). The audio file
// itself is uploaded directly from the browser to Supabase Storage (see
// components/conversations/audio-upload-card.tsx) — large recordings would
// otherwise hit serverless request-body limits going through a Server
// Action or API route. This action only receives the resulting storage
// path (a string) and does everything else server-side: downloading the
// file from private Storage (RLS-scoped to this user, same as the upload),
// calling Whisper, and reusing the existing local mock analyzer — no
// duplicate analysis implementation.
export async function transcribeUploadedAudioAction(
  conversationId: string,
  leadId: string,
  storagePath: string,
  originalFilename: string
): Promise<TranscribeAudioResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return { error: "not_found" };

  // Defense in depth: the client already validated this, but never trust
  // client-side validation alone for a value used to build a request.
  const extension = getFileExtension(originalFilename);
  if (!(ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension)) {
    return { error: "invalid_file_type" };
  }

  const supabase = await createClient();
  const { data: audioBlob, error: downloadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .download(storagePath);
  if (downloadError || !audioBlob) {
    console.error("[audio-transcription] download from storage failed", {
      conversationId,
      leadId,
      error: downloadError,
    });
    return { error: "download_failed" };
  }
  if (audioBlob.size > MAX_AUDIO_FILE_BYTES) {
    return { error: "file_too_large" };
  }

  try {
    await saveConversationAudioMetadata(userId, conversationId, {
      audioPath: storagePath,
      audioOriginalFilename: originalFilename,
    });
  } catch (err) {
    console.error("[audio-transcription] saving audio metadata failed", {
      conversationId,
      leadId,
      error: err,
    });
    return { error: "unknown_error" };
  }

  let transcriptionText: string;
  try {
    transcriptionText = await transcribeAudio({ audio: audioBlob, filename: originalFilename });
  } catch (err) {
    // The uploaded file is untouched in Storage and its metadata is already
    // saved above — nothing is lost, only the transcription step failed.
    console.error("[audio-transcription] whisper call failed", {
      conversationId,
      leadId,
      error: err instanceof Error ? err.message : err,
    });
    return { error: "transcription_failed" };
  }

  try {
    await updateConversationTranscription(userId, conversationId, transcriptionText);
  } catch (err) {
    console.error("[audio-transcription] saving transcription failed", {
      conversationId,
      leadId,
      error: err,
    });
    return { error: "unknown_error" };
  }

  try {
    const analysis = await analyzeConversation({
      transcription: transcriptionText,
      occurredAt: conversation.occurredAt,
    });
    await saveConversationAnalysis(userId, conversationId, analysis);
  } catch (err) {
    // Transcription is already saved — only the automatic analysis step
    // failed. The user can still retry it manually with "Analyze with AI".
    console.error("[audio-transcription] automatic analysis failed", {
      conversationId,
      leadId,
      error: err,
    });
    revalidatePath(`/conversations/${conversationId}`);
    revalidatePath(`/leads/${leadId}`);
    return { error: "analysis_failed", transcription: transcriptionText };
  }

  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/leads/${leadId}`);
  return { transcription: transcriptionText };
}

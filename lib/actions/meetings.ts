"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createMeeting, deleteMeeting, updateMeeting } from "@/lib/repo/meetings";
import {
  MEETING_METHODS,
  MEETING_STATUSES,
  type MeetingMethod,
  type MeetingStatus,
} from "@/lib/types";

const meetingSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  method: z.enum(MEETING_METHODS as [string, ...string[]]),
  locationOrLink: z.string().trim().optional(),
  status: z.enum(MEETING_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().trim().optional(),
});

export interface MeetingFormState {
  error?: string;
}

export async function createMeetingAction(
  _prevState: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = meetingSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    method: formData.get("method"),
    locationOrLink: formData.get("locationOrLink") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const data = parsed.data;
  const meeting = await createMeeting(userId, {
    leadId: data.leadId,
    title: data.title,
    scheduledAt: new Date(data.scheduledAt).toISOString(),
    durationMinutes: data.durationMinutes,
    method: data.method as MeetingMethod,
    locationOrLink: data.locationOrLink,
    notes: data.notes,
  });
  revalidatePath("/meetings");
  revalidatePath(`/leads/${data.leadId}`);
  redirect(`/meetings/${meeting.id}`);
}

export async function updateMeetingAction(meetingId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = meetingSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    method: formData.get("method"),
    locationOrLink: formData.get("locationOrLink") || undefined,
    status: formData.get("status") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  const data = parsed.data;
  await updateMeeting(userId, meetingId, {
    leadId: data.leadId,
    title: data.title,
    scheduledAt: new Date(data.scheduledAt).toISOString(),
    durationMinutes: data.durationMinutes,
    method: data.method as MeetingMethod,
    locationOrLink: data.locationOrLink,
    status: data.status as MeetingStatus | undefined,
    notes: data.notes,
  });
  revalidatePath("/meetings");
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/leads/${data.leadId}`);
}

export async function deleteMeetingAction(meetingId: string, leadId: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await deleteMeeting(userId, meetingId);
  revalidatePath("/meetings");
  revalidatePath(`/leads/${leadId}`);
  redirect("/meetings");
}

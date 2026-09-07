"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { addNote } from "@/lib/repo/notes";

export async function addNoteAction(leadId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await addNote(userId, leadId, content);
  revalidatePath(`/leads/${leadId}`);
}

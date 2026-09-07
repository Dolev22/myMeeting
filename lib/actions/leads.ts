"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createLead, deleteLead, updateLead } from "@/lib/repo/leads";
import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from "@/lib/types";

const leadSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().optional(),
  source: z.enum(LEAD_SOURCES as [string, ...string[]]),
});

export interface LeadFormState {
  error?: string;
}

export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    company: formData.get("company") || undefined,
    source: formData.get("source"),
  });
  if (!parsed.success) return { error: "invalid" };

  const lead = await createLead(userId, {
    ...parsed.data,
    source: parsed.data.source as LeadSource,
    email: parsed.data.email || undefined,
  });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    company: formData.get("company") || undefined,
    source: formData.get("source"),
  });
  if (!parsed.success) return;

  await updateLead(userId, leadId, {
    ...parsed.data,
    source: parsed.data.source as LeadSource,
    email: parsed.data.email || undefined,
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadStatusAction(leadId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const status = formData.get("status");
  if (typeof status !== "string" || !(LEAD_STATUSES as string[]).includes(status)) return;

  await updateLead(userId, leadId, { status: status as LeadStatus });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLeadAction(leadId: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await deleteLead(userId, leadId);
  revalidatePath("/leads");
  redirect("/leads");
}

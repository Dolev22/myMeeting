"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { createDeal, deleteDeal, updateDeal } from "@/lib/repo/deals";
import { updateLead } from "@/lib/repo/leads";
import { DEAL_STATUSES, type DealStatus } from "@/lib/types";

const dealSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  value: z.coerce.number().nonnegative(),
  currency: z.string().trim().min(1).default("ILS"),
  productOrService: z.string().trim().optional(),
  status: z.enum(DEAL_STATUSES as [string, ...string[]]).optional(),
  closeDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export interface DealFormState {
  error?: string;
}

export async function createDealAction(
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = dealSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    value: formData.get("value"),
    currency: formData.get("currency") || "ILS",
    productOrService: formData.get("productOrService") || undefined,
    closeDate: formData.get("closeDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const data = parsed.data;
  const deal = await createDeal(userId, {
    leadId: data.leadId,
    title: data.title,
    value: data.value,
    currency: data.currency,
    productOrService: data.productOrService,
    closeDate: data.closeDate,
    notes: data.notes,
  });
  revalidatePath("/deals");
  revalidatePath(`/leads/${data.leadId}`);
  redirect(`/deals/${deal.id}`);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = dealSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    value: formData.get("value"),
    currency: formData.get("currency") || "ILS",
    productOrService: formData.get("productOrService") || undefined,
    status: formData.get("status") || undefined,
    closeDate: formData.get("closeDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  const data = parsed.data;
  await updateDeal(userId, dealId, {
    leadId: data.leadId,
    title: data.title,
    value: data.value,
    currency: data.currency,
    productOrService: data.productOrService,
    status: data.status as DealStatus | undefined,
    closeDate: data.closeDate,
    notes: data.notes,
  });

  if (data.status === "won") {
    await updateLead(userId, data.leadId, { status: "deal_closed" });
  } else if (data.status === "lost") {
    await updateLead(userId, data.leadId, { status: "deal_lost" });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/leads/${data.leadId}`);
}

export async function deleteDealAction(dealId: string, leadId: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await deleteDeal(userId, dealId);
  revalidatePath("/deals");
  revalidatePath(`/leads/${leadId}`);
  redirect("/deals");
}

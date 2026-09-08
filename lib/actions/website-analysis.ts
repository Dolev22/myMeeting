"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { getLead } from "@/lib/repo/leads";
import { saveAnalysis } from "@/lib/repo/website-analyses";
import { analyzeWebsite } from "@/lib/ai/website-analysis";

export interface WebsiteAnalysisFormState {
  error?: string;
}

export async function runWebsiteAnalysisAction(
  leadId: string,
  _prevState: WebsiteAnalysisFormState,
  _formData: FormData
): Promise<WebsiteAnalysisFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  const lead = await getLead(userId, leadId);
  if (!lead || !lead.website) return { error: "no_website" };

  try {
    const report = await analyzeWebsite({
      url: lead.website,
      name: lead.name,
      company: lead.company,
    });
    await saveAnalysis(userId, { leadId, url: lead.website, report });
  } catch {
    return { error: "unknown_error" };
  }

  revalidatePath(`/leads/${leadId}`);
  return {};
}

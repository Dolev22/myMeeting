import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapAiWebsiteAnalysis } from "@/lib/repo/mappers";
import type { AiWebsiteAnalysis, WebsiteAnalysisReport } from "@/lib/types";

export async function getLatestAnalysis(
  userId: string,
  leadId: string
): Promise<AiWebsiteAnalysis | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_website_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAiWebsiteAnalysis(data) : null;
}

export interface AnalysisInput {
  leadId: string;
  url: string;
  report: WebsiteAnalysisReport;
}

export async function saveAnalysis(
  userId: string,
  input: AnalysisInput
): Promise<AiWebsiteAnalysis> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_website_analyses")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      url: input.url,
      report: input.report,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapAiWebsiteAnalysis(data);
}

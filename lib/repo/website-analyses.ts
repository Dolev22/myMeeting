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

// One row per lead — the most recent analysis, keyed by lead_id. Used by
// the leads list and dashboard to show analysis status without a per-lead
// round trip. Fine at CRM-demo scale; would need a DISTINCT ON view if the
// per-user analysis volume grew large.
export async function listLatestAnalysesByLead(
  userId: string
): Promise<Map<string, AiWebsiteAnalysis>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_website_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const byLead = new Map<string, AiWebsiteAnalysis>();
  for (const row of data ?? []) {
    const analysis = mapAiWebsiteAnalysis(row);
    if (!byLead.has(analysis.leadId)) {
      byLead.set(analysis.leadId, analysis);
    }
  }
  return byLead;
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

import "server-only";
import { buildWebsiteReport, type AnalyzeWebsiteInput } from "@/lib/ai/website-analysis-core";
import type { WebsiteAnalysisReport } from "@/lib/types";

// Server entry point for the local, deterministic "AI Website Analysis".
// The generator itself lives in lib/ai/website-analysis-core.ts (pure,
// shared with the browser-only demo mode); this wrapper only waits out the
// simulated processing time, exactly as before.

export type { AnalyzeWebsiteInput };

export async function analyzeWebsite(input: AnalyzeWebsiteInput): Promise<WebsiteAnalysisReport> {
  const { report, delayMs } = buildWebsiteReport(input);

  // Simulated "processing time" so the loading state reads as a real analysis.
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return report;
}

import "server-only";
import {
  analyzeTranscript,
  type AnalyzeConversationInput,
} from "@/lib/ai/conversation-analysis-core";
import type { ConversationAnalysis } from "@/lib/types";

// Server entry point for the local, deterministic "AI Conversation Analysis".
// The analyzer itself lives in lib/ai/conversation-analysis-core.ts (pure,
// shared with the browser-only demo mode); this wrapper only adds the
// simulated processing delay the server-side flows have always had.

export type { AnalyzeConversationInput };

export async function analyzeConversation(
  input: AnalyzeConversationInput
): Promise<ConversationAnalysis> {
  if (!input.transcription.trim()) {
    throw new Error("Cannot analyze an empty transcription");
  }

  // Simulated "processing time" so the loading state reads as a real analysis.
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.floor(Math.random() * 500)));

  return analyzeTranscript(input);
}

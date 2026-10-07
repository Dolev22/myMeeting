"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import {
  ConversationAnalysisPanel,
  type ConversationPanelActions,
} from "@/components/conversations/conversation-analysis-panel";
import {
  AudioUploadCard,
  type SimulatedAudioStage,
} from "@/components/conversations/audio-upload-card";
import { DemoLoading, DemoNotFound, wait } from "@/components/demo/demo-ui";
import { formatDateTime } from "@/lib/format";
import { pickMockTranscript } from "@/lib/mock/pick-mock-transcript";
import { useDemoData } from "@/lib/demo/store";
import {
  analyzeConversation,
  createTasksFromAnalysis,
  deleteConversation,
  listTasksBySourceConversation,
  saveSimulatedAudioTranscription,
  updateConversationTranscription,
} from "@/lib/demo/repo";
import { DEMO_BASE } from "@/lib/demo/paths";

// Same 900–1400ms pause the server-side analyzer wrapper uses.
function analysisDelayMs() {
  return 900 + Math.floor(Math.random() * 500);
}

// Demo counterpart of app/(dashboard)/conversations/[id]/page.tsx. The
// transcription/analysis panel is the real one; only its actions are local:
//  - "Analyze with AI" runs the same rule-based analyzer, in the browser.
//  - The audio card validates the file but uploads nothing and does not
//    transcribe it — it returns one of the prepared sample transcripts, and
//    says so on the card.
export default function DemoConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dict, locale } = useI18n();
  const router = useRouter();
  const data = useDemoData();
  const [leaving, setLeaving] = useState(false);

  if (!data || leaving) return <DemoLoading />;
  const conversation = data.conversations.find((c) => c.id === id);
  if (!conversation) return <DemoNotFound />;
  const lead = data.leads.find((l) => l.id === conversation.leadId);
  const createdTasks = listTasksBySourceConversation(data, id);

  const actions: ConversationPanelActions = {
    updateTranscription: (_state, formData) => {
      updateConversationTranscription(id, String(formData.get("transcription") ?? "").trim());
      return {};
    },
    analyze: async () => {
      if (!conversation.transcription?.trim()) return { error: "no_transcription" };
      await wait(analysisDelayMs());
      return analyzeConversation(id);
    },
    createTasks: () => createTasksFromAnalysis(id),
  };

  async function simulateAudio(file: File, onStage: (stage: SimulatedAudioStage) => void) {
    await wait(900); // "uploading" — nothing leaves the browser
    onStage("transcribing");
    await wait(1800);
    const transcript = pickMockTranscript(file.name);
    onStage("analyzing");
    await wait(1000);
    saveSimulatedAudioTranscription(id, file.name, transcript);
    return {};
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.conversations.title}
        </h1>
        {lead && (
          <Link
            href={`${DEMO_BASE}/leads/${lead.id}#conversations`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {formatDateTime(conversation.occurredAt, locale)}
          </span>
          <Badge color={conversation.direction === "incoming" ? "blue" : "teal"}>
            {dict.conversationDirection[conversation.direction]}
          </Badge>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {dict.conversations.duration}: {conversation.durationMinutes}
        </div>

        <div>
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.conversations.notes}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {conversation.notes || dict.common.noResults}
          </p>
        </div>
      </Card>

      <ConversationAnalysisPanel
        conversation={conversation}
        leadId={conversation.leadId}
        createdTasks={createdTasks}
        locale={locale}
        actions={actions}
        basePath={DEMO_BASE}
        audioUpload={
          <AudioUploadCard
            conversation={conversation}
            leadId={conversation.leadId}
            simulate={simulateAudio}
            note={dict.demo.audioNote}
          />
        }
      />

      <form
        action={() => {
          setLeaving(true);
          deleteConversation(id);
          router.push(`${DEMO_BASE}/leads/${conversation.leadId}#conversations`);
        }}
      >
        <ConfirmSubmitButton confirmMessage={dict.conversations.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

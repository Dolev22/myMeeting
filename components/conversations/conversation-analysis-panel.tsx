"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  updateTranscriptionAction,
  analyzeConversationAction,
  createTasksFromAnalysisAction,
  type TranscriptionFormState,
  type AnalyzeConversationFormState,
  type CreateTasksFormState,
} from "@/lib/actions/conversations";
import { MOCK_SALES_CALL_HE } from "@/lib/mock/mock-sales-call";
import { AudioUploadCard } from "@/components/conversations/audio-upload-card";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Conversation, SalesStage, Task } from "@/lib/types";
import type { Locale } from "@/lib/i18n/dictionaries";

const transcriptionInitial: TranscriptionFormState = {};
const analyzeInitial: AnalyzeConversationFormState = {};
const tasksInitial: CreateTasksFormState = {};

const STAGE_BADGE_COLOR: Record<SalesStage, "zinc" | "blue" | "amber" | "red" | "green"> = {
  discovery: "zinc",
  solution_presentation: "blue",
  proposal: "amber",
  negotiation: "red",
  closing: "green",
};

function ReportSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
      ) : (
        <ul className="list-disc space-y-1 ps-5 text-sm text-zinc-700 dark:text-zinc-300">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ANALYZE_ERROR_KEYS = {
  no_transcription: "errorNoTranscription",
  not_found: "errorNotFound",
  unauthorized: "errorUnauthorized",
} as const;

const TASKS_ERROR_KEYS = {
  no_analysis: "errorNoAnalysis",
  unauthorized: "errorUnauthorized",
} as const;

export function ConversationAnalysisPanel({
  conversation,
  leadId,
  createdTasks,
  locale,
}: {
  conversation: Conversation;
  leadId: string;
  createdTasks: Task[];
  locale: Locale;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  // The transcription textarea is uncontrolled (defaultValue + ref) rather
  // than bound to React state, since it's submitted through a Server
  // Action <form> — this is the pattern React recommends for action-bound
  // form fields.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [transcriptionState, transcriptionFormAction, transcriptionPending] = useActionState(
    updateTranscriptionAction.bind(null, conversation.id, leadId),
    transcriptionInitial
  );
  const [analyzeState, analyzeFormAction, analyzePending] = useActionState(
    analyzeConversationAction.bind(null, conversation.id, leadId),
    analyzeInitial
  );
  const [tasksState, tasksFormAction, tasksPending] = useActionState(
    createTasksFromAnalysisAction.bind(null, conversation.id, leadId),
    tasksInitial
  );

  // A Server Action's response is supposed to carry the re-rendered UI for
  // the current route in the same round trip (see Next's server-actions
  // guide), but that embedded refresh was observed to silently miss in this
  // environment for a fast action fired after the tab had been idle for a
  // couple of seconds (surfaced server-side as "the destination stream
  // closed early") — the mutation itself always completed correctly, only
  // the in-place UI update was lost. An explicit router.refresh() after each
  // action settles is a reliable belt-and-suspenders fix: cheap, and a no-op
  // if the embedded refresh already applied.
  useEffect(() => {
    if (transcriptionState !== transcriptionInitial) router.refresh();
  }, [transcriptionState, router]);
  useEffect(() => {
    if (analyzeState !== analyzeInitial) router.refresh();
  }, [analyzeState, router]);
  useEffect(() => {
    if (tasksState !== tasksInitial) router.refresh();
  }, [tasksState, router]);

  const analysis = conversation.analysis;

  const analyzeErrorText =
    analyzeState.error &&
    dict.conversationAnalysis[
      (ANALYZE_ERROR_KEYS[analyzeState.error as keyof typeof ANALYZE_ERROR_KEYS] ??
        "errorGeneric") as keyof typeof dict.conversationAnalysis
    ];

  const tasksErrorText =
    tasksState.error &&
    dict.conversationAnalysis[
      (TASKS_ERROR_KEYS[tasksState.error as keyof typeof TASKS_ERROR_KEYS] ??
        "errorGeneric") as keyof typeof dict.conversationAnalysis
    ];

  return (
    <div className="space-y-6">
      <AudioUploadCard conversation={conversation} leadId={leadId} />

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.conversations.transcription}
          </h2>
          <Badge color={conversation.transcription ? "green" : "amber"}>
            {conversation.transcription
              ? dict.conversations.hasTranscription
              : dict.conversations.noTranscription}
          </Badge>
        </div>

        <form
          action={transcriptionFormAction}
          onSubmit={() => setHasUnsavedChanges(false)}
          className="space-y-3"
        >
          <Textarea
            ref={textareaRef}
            name="transcription"
            defaultValue={conversation.transcription ?? ""}
            onChange={() => setHasUnsavedChanges(true)}
            placeholder={dict.conversations.editTranscriptionPlaceholder}
            className="min-h-48"
            dir="auto"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={transcriptionPending}>
              {dict.conversations.saveTranscription}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (textareaRef.current) {
                  textareaRef.current.value = MOCK_SALES_CALL_HE;
                  setHasUnsavedChanges(true);
                }
              }}
            >
              {dict.conversations.loadMockButton}
            </Button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-xs text-teal-700 dark:text-teal-400">
              {dict.conversations.mockLoaded}
            </p>
          )}
        </form>
      </Card>

      <Card id="ai-conversation-analysis" className="space-y-4 border-teal-200 dark:border-teal-900">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            {dict.conversationAnalysis.title}
          </h2>
          <form action={analyzeFormAction}>
            <Button type="submit" size="sm" variant="secondary" disabled={analyzePending}>
              {analyzePending
                ? dict.conversationAnalysis.running
                : analysis
                  ? dict.conversationAnalysis.reanalyzeButton
                  : dict.conversationAnalysis.analyzeButton}
            </Button>
          </form>
        </div>

        {analyzePending && (
          <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700 dark:border-teal-700 dark:border-t-teal-300" />
            {dict.conversationAnalysis.running}
          </div>
        )}

        {analyzeErrorText && (
          <p className="text-sm text-red-600 dark:text-red-400">{analyzeErrorText}</p>
        )}

        {!analysis && !analyzePending ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dict.conversationAnalysis.noAnalysisYet}
          </p>
        ) : analysis ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {dict.conversationAnalysis.demoDisclaimer}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {dict.conversationAnalysis.generatedFromTranscription}
            </p>

            <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-950/30">
              <h3 className="mb-1 text-sm font-semibold text-teal-900 dark:text-teal-200">
                {dict.conversationAnalysis.summary}
              </h3>
              <p className="text-sm text-teal-900 dark:text-teal-100">{analysis.summary}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {dict.conversationAnalysis.recommendedStage}:
              </span>
              <Badge color={STAGE_BADGE_COLOR[analysis.recommendedStage]}>
                {dict.salesStage[analysis.recommendedStage]}
              </Badge>
            </div>

            <ReportSection
              title={dict.conversationAnalysis.keyTopics}
              items={analysis.keyTopics}
              emptyLabel={dict.conversationAnalysis.noItemsFound}
            />
            <ReportSection
              title={dict.conversationAnalysis.customerNeeds}
              items={analysis.customerNeeds}
              emptyLabel={dict.conversationAnalysis.noItemsFound}
            />
            <ReportSection
              title={dict.conversationAnalysis.customerCommitments}
              items={analysis.customerCommitments}
              emptyLabel={dict.conversationAnalysis.noItemsFound}
            />
            <ReportSection
              title={dict.conversationAnalysis.repCommitments}
              items={analysis.repCommitments}
              emptyLabel={dict.conversationAnalysis.noItemsFound}
            />
            <ReportSection
              title={dict.conversationAnalysis.recommendedNextSteps}
              items={analysis.recommendedNextSteps}
              emptyLabel={dict.conversationAnalysis.noItemsFound}
            />
            <ReportSection
              title={dict.conversationAnalysis.redFlags}
              items={analysis.redFlags}
              emptyLabel={dict.conversationAnalysis.noRedFlags}
            />

            {conversation.analyzedAt && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {dict.conversationAnalysis.analyzedAt}{" "}
                {formatDateTime(conversation.analyzedAt, locale)}
              </p>
            )}

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {dict.conversationAnalysis.createdTasksTitle}
                </h3>
                <form action={tasksFormAction}>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={tasksPending || createdTasks.length > 0}
                  >
                    {tasksPending
                      ? dict.conversationAnalysis.creatingTasks
                      : dict.conversationAnalysis.createTasksButton}
                  </Button>
                </form>
              </div>

              {tasksErrorText && (
                <p className="mb-2 text-sm text-red-600 dark:text-red-400">{tasksErrorText}</p>
              )}
              {tasksState.alreadyCreated && (
                <p className="mb-2 text-sm text-amber-700 dark:text-amber-400">
                  {dict.conversationAnalysis.tasksAlreadyCreated}
                </p>
              )}

              {createdTasks.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {createdTasks.map((task) => (
                    <li key={task.id} className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                        >
                          {task.name}
                        </Link>
                        {task.notes && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{task.notes}</p>
                        )}
                      </div>
                      {task.dueDate && (
                        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(task.dueDate, locale)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : analysis.suggestedTasks.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {dict.conversationAnalysis.noSuggestedTasks}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {analysis.suggestedTasks.map((task, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{task.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {task.description}
                        </p>
                      </div>
                      {task.dueDate && (
                        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(task.dueDate, locale)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

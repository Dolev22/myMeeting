"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  generateWhatsAppSummaryAction,
  type GenerateSummaryFormState,
} from "@/lib/actions/whatsapp";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { ConversationAnalysis, SalesStage } from "@/lib/types";

const initialState: GenerateSummaryFormState = {};

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

export function WhatsAppSummaryPanel({
  conversationId,
  analysis,
  analyzedAt,
  hasMessages,
  locale,
}: {
  conversationId: string;
  analysis?: ConversationAnalysis;
  analyzedAt?: string;
  hasMessages: boolean;
  locale: Locale;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    generateWhatsAppSummaryAction.bind(null, conversationId),
    initialState
  );

  useEffect(() => {
    if (state !== initialState) router.refresh();
  }, [state, router]);

  return (
    <Card className="space-y-4 border-teal-200 dark:border-teal-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
          {dict.whatsapp.summaryTitle}
        </h2>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="secondary" disabled={pending || !hasMessages}>
            {pending
              ? dict.whatsapp.summaryRunning
              : analysis
                ? dict.whatsapp.summaryRerunButton
                : dict.whatsapp.summaryButton}
          </Button>
        </form>
      </div>

      {!hasMessages && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.whatsapp.summaryNoMessages}</p>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{dict.whatsapp.summaryErrorGeneric}</p>
      )}

      {!analysis && hasMessages && !pending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.whatsapp.summaryNoAnalysisYet}</p>
      ) : analysis ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {dict.whatsapp.demoDisclaimer}
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
            title={dict.conversationAnalysis.recommendedNextSteps}
            items={analysis.recommendedNextSteps}
            emptyLabel={dict.conversationAnalysis.noItemsFound}
          />
          <ReportSection
            title={dict.conversationAnalysis.redFlags}
            items={analysis.redFlags}
            emptyLabel={dict.conversationAnalysis.noRedFlags}
          />

          {analyzedAt && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {dict.conversationAnalysis.analyzedAt} {formatDateTime(analyzedAt, locale)}
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}

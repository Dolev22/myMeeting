"use client";

import { useActionState } from "react";
import {
  runWebsiteAnalysisAction,
  type WebsiteAnalysisFormState,
} from "@/lib/actions/website-analysis";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { AiWebsiteAnalysis } from "@/lib/types";
import type { Locale } from "@/lib/i18n/dictionaries";

const initialState: WebsiteAnalysisFormState = {};

const ERROR_KEYS = {
  invalid_url: "errorInvalidUrl",
  unauthorized: "errorUnauthorized",
} as const;

function ReportSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <ul className="list-disc space-y-1 ps-5 text-sm text-zinc-700 dark:text-zinc-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function WebsiteAnalysisCard({
  leadId,
  website,
  latestAnalysis,
  locale,
}: {
  leadId: string;
  website: string;
  latestAnalysis: AiWebsiteAnalysis | null;
  locale: Locale;
}) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(
    runWebsiteAnalysisAction.bind(null, leadId),
    initialState
  );

  const errorKey =
    state.error && state.error in ERROR_KEYS
      ? ERROR_KEYS[state.error as keyof typeof ERROR_KEYS]
      : state.error
        ? "errorGeneric"
        : null;
  const errorText = errorKey ? dict.websiteAnalysis[errorKey] : null;

  const report = latestAnalysis?.report;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.websiteAnalysis.title}
        </h2>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending
              ? dict.websiteAnalysis.running
              : report
                ? dict.websiteAnalysis.rerunButton
                : dict.websiteAnalysis.runButton}
          </Button>
        </form>
      </div>

      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 block text-sm text-teal-700 hover:underline dark:text-teal-400"
      >
        {website}
      </a>

      {pending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600 dark:border-zinc-600 dark:border-t-teal-400" />
          {dict.websiteAnalysis.running}
        </div>
      )}

      {errorText && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{errorText}</p>}

      {!report && !pending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {dict.websiteAnalysis.noAnalysisYet}
        </p>
      ) : report ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {dict.websiteAnalysis.demoDisclaimer}
          </p>

          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.websiteAnalysis.businessType}
            </h3>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{report.businessType}</p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.websiteAnalysis.overview}
            </h3>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{report.overview}</p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.websiteAnalysis.executiveSummary}
            </h3>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {report.executiveSummary}
            </p>
          </div>

          <ReportSection title={dict.websiteAnalysis.keyProblems} items={report.keyProblems} />
          <ReportSection title={dict.websiteAnalysis.seoIssues} items={report.seoIssues} />
          <ReportSection title={dict.websiteAnalysis.uxIssues} items={report.uxIssues} />
          <ReportSection
            title={dict.websiteAnalysis.mobileIssues}
            items={report.mobileIssues}
          />
          <ReportSection
            title={dict.websiteAnalysis.opportunities}
            items={report.opportunities}
          />
          <ReportSection
            title={dict.websiteAnalysis.recommendedImprovements}
            items={report.recommendedImprovements}
          />
          <ReportSection
            title={dict.websiteAnalysis.recommendedServices}
            items={report.recommendedServices}
          />

          {latestAnalysis && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {dict.websiteAnalysis.lastRunAt} {formatDateTime(latestAnalysis.createdAt, locale)}
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}

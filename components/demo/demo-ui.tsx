"use client";

import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { DEMO_BASE } from "@/lib/demo/paths";

/** Small pause so simulated steps show their loading state instead of flashing by. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * First-frame placeholder: the demo dataset lives in localStorage, which
 * doesn't exist during server rendering, so every demo page shows this until
 * the browser has read it.
 */
export function DemoLoading() {
  const { dict } = useI18n();
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-700 dark:border-zinc-700 dark:border-t-teal-400" />
      {dict.demo.loading}
    </div>
  );
}

/** Shown when a demo URL points at a record this browser's dataset doesn't have. */
export function DemoNotFound() {
  const { dict } = useI18n();
  return (
    <Card className="max-w-xl space-y-3">
      <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {dict.demo.notFoundTitle}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.demo.notFoundText}</p>
      <LinkButton href={DEMO_BASE} variant="secondary" size="sm">
        {dict.demo.backToDashboard}
      </LinkButton>
    </Card>
  );
}

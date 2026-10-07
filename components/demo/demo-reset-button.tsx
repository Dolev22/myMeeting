"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { resetDemoData } from "@/lib/demo/store";
import { DEMO_BASE } from "@/lib/demo/paths";

/** Restores the original sample data — only in this visitor's browser. */
export function DemoResetButton() {
  const { dict } = useI18n();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(dict.demo.resetConfirm)) return;
        resetDemoData();
        router.push(DEMO_BASE);
      }}
      className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-start text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
    >
      {dict.demo.reset}
    </button>
  );
}

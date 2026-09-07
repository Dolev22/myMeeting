"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/constants";
import type { Locale } from "@/lib/i18n/dictionaries";

export function LocaleToggle() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-zinc-300 text-xs"
      aria-label={dict.common.language}
    >
      <button
        type="button"
        onClick={() => switchTo("he")}
        disabled={pending}
        className={`px-2 py-1 ${locale === "he" ? "bg-teal-700 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
      >
        עברית
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={pending}
        className={`px-2 py-1 ${locale === "en" ? "bg-teal-700 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
      >
        EN
      </button>
    </div>
  );
}

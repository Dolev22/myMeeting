import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DemoResetButton } from "@/components/demo/demo-reset-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getTheme } from "@/lib/theme/get-theme";
import { DEMO_PROFILE } from "@/lib/demo/seed";
import { DEMO_BASE } from "@/lib/demo/paths";

// The demo's counterpart to components/layout/app-shell.tsx: same sidebar,
// same toggles, same layout — but it reads only the locale/theme cookies
// (never a Supabase session), swaps "Sign out" for "Exit demo" + "Reset demo
// data", and adds the always-visible "Demo mode — sample data" indicator.
export async function DemoShell({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 flex-col gap-6 border-e border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="px-2 text-lg font-semibold text-teal-800 dark:text-teal-400">
          {dict.appName}
        </div>
        <NavLinks basePath={DEMO_BASE} />
        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle initialTheme={theme} />
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.dashboard.welcome}, <span className="font-medium">{DEMO_PROFILE.fullName}</span>
          </div>
          <DemoResetButton />
          <Link
            href="/login"
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-start text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {dict.demo.exit}
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div
          role="status"
          data-testid="demo-indicator"
          className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <span className="font-semibold">{dict.demo.bannerTitle}</span>
          <span>{dict.demo.bannerText}</span>
        </div>
        {children}
      </main>
    </div>
  );
}

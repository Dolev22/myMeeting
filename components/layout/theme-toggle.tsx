"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { THEME_COOKIE, type Theme } from "@/lib/theme/constants";

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const { dict } = useI18n();
  const router = useRouter();
  // On a first-ever visit (no cookie yet) with a dark OS preference, the
  // blocking init script corrects the page's actual `dark` class before
  // paint, but this button's icon still starts from the server-known
  // `initialTheme` ("light") until the user's first toggle click sets the
  // cookie — a cosmetic edge case, not a theming bug (colors are already
  // correct either way).
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setTheme(next);
    startTransition(() => router.refresh());
  }

  const isDark = theme === "dark";
  const label = isDark ? dict.common.switchToLight : dict.common.switchToDark;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-lg border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

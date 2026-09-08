import "server-only";
import { cookies } from "next/headers";
import { THEME_COOKIE, type Theme } from "@/lib/theme/constants";

// Server-rendered default. When no cookie exists yet (first-ever visit),
// the blocking init script in the root layout corrects the `dark` class
// client-side before paint, based on prefers-color-scheme — the manual
// toggle then persists the explicit choice via this same cookie.
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "dark" ? "dark" : "light";
}

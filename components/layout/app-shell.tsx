import { NavLinks } from "@/components/layout/nav-links";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { signOutAction } from "@/lib/actions/auth";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Profile } from "@/lib/types";

export async function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 flex-col gap-6 border-e border-zinc-200 bg-white p-4">
        <div className="px-2 text-lg font-semibold text-teal-800">{dict.appName}</div>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 pt-4">
          <LocaleToggle />
          <div className="text-xs text-zinc-500">
            {dict.dashboard.welcome}, <span className="font-medium">{profile.fullName}</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-start text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {dict.nav.signOut}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

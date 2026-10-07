import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { DemoUsers } from "@/components/auth/demo-users";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.appName}
      </h1>
      <h2 className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{dict.auth.loginTitle}</h2>

      {/* A plain link to the browser-local demo (app/demo): no credentials,
          no Supabase request — it works even when the backend is paused. */}
      <div className="mb-5 rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/40">
        <LinkButton href="/demo" className="w-full py-2.5 text-base">
          {dict.demo.enterDemo}
        </LinkButton>
        <p className="mt-2 text-center text-xs text-teal-900 dark:text-teal-200">
          {dict.demo.enterDemoHint}
        </p>
      </div>
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {dict.demo.orSignIn}
      </p>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        {dict.auth.demoNotice}
      </p>
      <LoginForm />
      <DemoUsers locale={locale} />
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { DemoUsers } from "@/components/auth/demo-users";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900">{dict.appName}</h1>
      <h2 className="mb-4 text-sm text-zinc-500">{dict.auth.loginTitle}</h2>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        {dict.auth.demoNotice}
      </p>
      <LoginForm />
      <DemoUsers locale={locale} />
    </Card>
  );
}

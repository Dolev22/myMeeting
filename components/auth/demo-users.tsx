import { getDictionary, type Locale } from "@/lib/i18n/dictionaries";

const DEMO_USERS = [
  { fullName: "דנה כהן", email: "dana@example.com" },
  { fullName: "יוסי לוי", email: "yossi@example.com" },
];
const DEMO_PASSWORD = "demo1234";

export function DemoUsers({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <div className="mt-6 border-t border-zinc-200 pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {dict.auth.demoUsers}
      </p>
      <div className="flex flex-col gap-2">
        {DEMO_USERS.map((user) => (
          <div
            key={user.email}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-start text-sm"
          >
            <div>
              <span className="font-medium text-zinc-800">{user.fullName}</span>
              <span className="ms-2 text-zinc-500">{user.email}</span>
            </div>
            <div className="text-xs text-zinc-400">{dict.auth.password}: {DEMO_PASSWORD}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

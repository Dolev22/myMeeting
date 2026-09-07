import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listMeetings } from "@/lib/repo/meetings";
import { listLeads } from "@/lib/repo/leads";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { MeetingStatusBadge } from "@/components/status-badges";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [userId, locale, params] = await Promise.all([
    getCurrentUserId(),
    getLocale(),
    searchParams,
  ]);
  if (!userId) redirect("/login");

  const dict = getDictionary(locale);
  const tab = params.tab === "past" ? "past" : "upcoming";
  const [meetings, leads] = await Promise.all([
    listMeetings(userId, { when: tab }),
    listLeads(userId),
  ]);
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const tabClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium",
      active ? "bg-teal-700 text-white" : "text-zinc-600 hover:bg-zinc-100"
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{dict.meetings.title}</h1>
        <LinkButton href="/meetings/new">{dict.meetings.newMeeting}</LinkButton>
      </div>

      <div className="flex gap-2">
        <Link href="/meetings?tab=upcoming" className={tabClass(tab === "upcoming")}>
          {dict.meetings.upcoming}
        </Link>
        <Link href="/meetings?tab=past" className={tabClass(tab === "past")}>
          {dict.meetings.past}
        </Link>
      </div>

      <Card className="p-0">
        {meetings.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {m.title}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    {leadById.get(m.leadId)?.name} ·{" "}
                    {dict.meetingMethod[m.method]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-600">
                    {formatDateTime(m.scheduledAt, locale)}
                  </span>
                  <MeetingStatusBadge status={m.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

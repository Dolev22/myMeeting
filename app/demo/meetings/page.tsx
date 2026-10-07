"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { MeetingStatusBadge } from "@/components/status-badges";
import { DemoLoading } from "@/components/demo/demo-ui";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useDemoData } from "@/lib/demo/store";
import { listMeetings } from "@/lib/demo/repo";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/meetings/page.tsx.
export default function DemoMeetingsPage() {
  const { dict, locale } = useI18n();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const tab = params.get("tab") === "past" ? "past" : "upcoming";
  const meetings = listMeetings(data, { when: tab });
  const leadById = new Map(data.leads.map((l) => [l.id, l]));

  const tabClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium",
      active
        ? "bg-teal-700 text-white dark:bg-teal-600"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.meetings.title}
        </h1>
        <LinkButton href={`${DEMO_BASE}/meetings/new`}>{dict.meetings.newMeeting}</LinkButton>
      </div>

      <div className="flex gap-2">
        <Link href={`${DEMO_BASE}/meetings?tab=upcoming`} className={tabClass(tab === "upcoming")}>
          {dict.meetings.upcoming}
        </Link>
        <Link href={`${DEMO_BASE}/meetings?tab=past`} className={tabClass(tab === "past")}>
          {dict.meetings.past}
        </Link>
      </div>

      <Card className="p-0">
        {meetings.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`${DEMO_BASE}/meetings/${m.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {m.title}
                  </Link>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {leadById.get(m.leadId)?.name} · {dict.meetingMethod[m.method]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
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

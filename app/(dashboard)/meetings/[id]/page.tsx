import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getMeeting } from "@/lib/repo/meetings";
import { getLead, listLeads } from "@/lib/repo/leads";
import { deleteMeetingAction } from "@/lib/actions/meetings";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { MeetingEditForm } from "@/components/meetings/meeting-edit-form";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const meeting = await getMeeting(userId, id);
  if (!meeting) notFound();

  const dict = getDictionary(locale);
  const [lead, leads] = await Promise.all([
    getLead(userId, meeting.leadId),
    listLeads(userId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{meeting.title}</h1>
        {lead && (
          <Link href={`/leads/${lead.id}`} className="text-sm text-teal-700 hover:underline">
            {lead.name}
          </Link>
        )}
      </div>

      <Card>
        <MeetingEditForm meeting={meeting} leads={leads} />
      </Card>

      <form action={deleteMeetingAction.bind(null, meeting.id, meeting.leadId)}>
        <ConfirmSubmitButton confirmMessage={dict.meetings.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

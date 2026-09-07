import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId, getCurrentProfile } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLead } from "@/lib/repo/leads";
import { listNotes } from "@/lib/repo/notes";
import { listMeetings } from "@/lib/repo/meetings";
import { listDeals } from "@/lib/repo/deals";
import { deleteLeadAction } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { LeadEditForm } from "@/components/leads/lead-edit-form";
import { LeadStatusForm } from "@/components/leads/lead-status-form";
import { AddNoteForm } from "@/components/leads/add-note-form";
import { MeetingStatusBadge, DealStatusBadge } from "@/components/status-badges";
import { formatDateTime, formatCurrency } from "@/lib/format";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, profile, locale] = await Promise.all([
    getCurrentUserId(),
    getCurrentProfile(),
    getLocale(),
  ]);
  if (!userId || !profile) redirect("/login");

  const lead = await getLead(userId, id);
  if (!lead) notFound();

  const dict = getDictionary(locale);
  const [notes, meetings, deals] = await Promise.all([
    listNotes(userId, id),
    listMeetings(userId, { leadId: id }),
    listDeals(userId, { leadId: id }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{lead.name}</h1>
          <p className="text-sm text-zinc-500">
            {dict.leads.assignedTo}: {profile.fullName}
          </p>
        </div>
        <LeadStatusForm leadId={lead.id} status={lead.status} />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-zinc-900">
          {dict.common.edit}
        </h2>
        <LeadEditForm lead={lead} />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-medium text-zinc-900">
          {dict.common.internalNotes}
        </h2>
        <AddNoteForm leadId={lead.id} />
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">{dict.leads.noLeadNotes}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                <p className="text-zinc-800 whitespace-pre-wrap">{note.content}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(note.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900">
            {dict.leads.linkedMeetings}
          </h2>
          <LinkButton href={`/meetings/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newMeetingForLead}
          </LinkButton>
        </div>
        {meetings.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <Link href={`/meetings/${m.id}`} className="text-sm font-medium text-zinc-900 hover:underline">
                  {m.title}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatDateTime(m.scheduledAt, locale)}
                  </span>
                  <MeetingStatusBadge status={m.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900">{dict.leads.linkedDeals}</h2>
          <LinkButton href={`/deals/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newDealForLead}
          </LinkButton>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <Link href={`/deals/${d.id}`} className="text-sm font-medium text-zinc-900 hover:underline">
                  {d.title}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatCurrency(d.value, d.currency, locale)}
                  </span>
                  <DealStatusBadge status={d.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <form action={deleteLeadAction.bind(null, lead.id)}>
        <ConfirmSubmitButton confirmMessage={dict.leads.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

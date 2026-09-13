import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId, getCurrentProfile } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLead } from "@/lib/repo/leads";
import { listNotes } from "@/lib/repo/notes";
import { listMeetings } from "@/lib/repo/meetings";
import { listDeals } from "@/lib/repo/deals";
import { listTasks } from "@/lib/repo/tasks";
import { listConversations } from "@/lib/repo/conversations";
import { getLatestAnalysis } from "@/lib/repo/website-analyses";
import { getWhatsAppConversationByLead } from "@/lib/repo/whatsapp";
import { deleteLeadAction } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { LeadEditForm } from "@/components/leads/lead-edit-form";
import { LeadStatusForm } from "@/components/leads/lead-status-form";
import { AddNoteForm } from "@/components/leads/add-note-form";
import { WebsiteAnalysisCard } from "@/components/leads/website-analysis-card";
import { NewFromWhatsAppBadge } from "@/components/whatsapp/new-from-whatsapp-badge";
import {
  MeetingStatusBadge,
  DealStatusBadge,
  TaskStatusBadge,
  TaskPriorityBadge,
} from "@/components/status-badges";
import { formatDateTime, formatCurrency, formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/cn";

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
  const [notes, meetings, deals, tasks, conversations, latestAnalysis, whatsappConversation] =
    await Promise.all([
      listNotes(userId, id),
      listMeetings(userId, { leadId: id }),
      listDeals(userId, { leadId: id }),
      listTasks(userId, { leadId: id }),
      listConversations(userId, id),
      lead.website ? getLatestAnalysis(userId, id) : Promise.resolve(null),
      getWhatsAppConversationByLead(userId, id),
    ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{lead.name}</h1>
            <Badge color="zinc">{dict.leadSource[lead.source]}</Badge>
            {lead.source === "whatsapp" && <NewFromWhatsAppBadge createdAt={lead.createdAt} />}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dict.leads.assignedTo}: {profile.fullName}
          </p>
        </div>
        <LeadStatusForm leadId={lead.id} status={lead.status} />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.common.edit}
        </h2>
        <LeadEditForm lead={lead} />
      </Card>

      {lead.website && (
        <WebsiteAnalysisCard
          leadId={lead.id}
          website={lead.website}
          latestAnalysis={latestAnalysis}
          locale={locale}
        />
      )}

      <Card>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.common.internalNotes}
        </h2>
        <AddNoteForm leadId={lead.id} />
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{dict.leads.noLeadNotes}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{note.content}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(note.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.leads.linkedTasks}
          </h2>
          <LinkButton href={`/tasks/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newTaskForLead}
          </LinkButton>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <li key={task.id} className="flex items-center justify-between py-2 gap-3">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                  >
                    {task.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    {task.dueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          overdue
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        {formatDate(task.dueDate, locale)}
                        {overdue && ` (${dict.tasks.overdue})`}
                      </span>
                    )}
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.leads.linkedMeetings}
          </h2>
          <LinkButton href={`/meetings/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newMeetingForLead}
          </LinkButton>
        </div>
        {meetings.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <Link href={`/meetings/${m.id}`} className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline">
                  {m.title}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.whatsapp.relatedConversation}
          </h2>
          {whatsappConversation ? (
            <LinkButton href={`/whatsapp/${whatsappConversation.id}`} size="sm" variant="secondary">
              {dict.whatsapp.viewConversation}
            </LinkButton>
          ) : null}
        </div>
        {!whatsappConversation ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {dict.whatsapp.newConversationForLead}
          </p>
        ) : (
          <div className="mt-2 flex items-center justify-between text-sm">
            <p className="truncate text-zinc-600 dark:text-zinc-300">
              {whatsappConversation.lastMessagePreview}
            </p>
            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
              {formatDateTime(whatsappConversation.lastMessageAt, locale)}
            </span>
          </div>
        )}
      </Card>

      <Card id="conversations">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.leads.linkedConversations}
          </h2>
          <LinkButton href={`/conversations/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newConversationForLead}
          </LinkButton>
        </div>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          {dict.conversations.relationToMeetingsHint}
        </p>
        {conversations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {conversations.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <Link
                    href={`/conversations/${c.id}`}
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                  >
                    {formatDateTime(c.occurredAt, locale)}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {dict.conversations.duration}: {c.durationMinutes} ·{" "}
                    {c.notes ? c.notes.slice(0, 60) : dict.common.noResults}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={c.transcription ? "green" : "amber"}>
                    {c.transcription
                      ? dict.conversations.hasTranscription
                      : dict.conversations.noTranscription}
                  </Badge>
                  <Badge color={c.direction === "incoming" ? "blue" : "teal"}>
                    {dict.conversationDirection[c.direction]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{dict.leads.linkedDeals}</h2>
          <LinkButton href={`/deals/new?leadId=${lead.id}`} size="sm" variant="secondary">
            {dict.leads.newDealForLead}
          </LinkButton>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <Link href={`/deals/${d.id}`} className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline">
                  {d.title}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
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
import { DemoLoading, DemoNotFound, wait } from "@/components/demo/demo-ui";
import type { WebsiteAnalysisFormState } from "@/lib/actions/website-analysis";
import { formatDateTime, formatCurrency, formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useDemoData } from "@/lib/demo/store";
import {
  addNote,
  deleteLead,
  getLatestWebsiteAnalysis,
  listConversations,
  listDeals,
  listMeetings,
  listNotes,
  listTasks,
  prepareWebsiteAnalysis,
  updateLead,
} from "@/lib/demo/repo";
import { parseLeadForm, parseLeadStatus } from "@/lib/demo/forms";
import { DEMO_PROFILE } from "@/lib/demo/seed";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/leads/[id]/page.tsx — same sections in
// the same order, reusing the same forms and cards with local actions.
export default function DemoLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dict, locale } = useI18n();
  const router = useRouter();
  const data = useDemoData();
  const [leaving, setLeaving] = useState(false);

  if (!data || leaving) return <DemoLoading />;
  const lead = data.leads.find((l) => l.id === id);
  if (!lead) return <DemoNotFound />;

  const notes = listNotes(data, id);
  const meetings = listMeetings(data, { leadId: id });
  const deals = listDeals(data, { leadId: id });
  const tasks = listTasks(data, { leadId: id });
  const conversations = listConversations(data, id);
  const latestAnalysis = lead.website ? getLatestWebsiteAnalysis(data, id) : null;
  const whatsappConversation = data.whatsappConversations.find((c) => c.leadId === id) ?? null;

  // The local sample generator behind "AI Website Analysis" — it never
  // fetches the site; the card itself labels the result as a demo report.
  async function runWebsiteAnalysis(): Promise<WebsiteAnalysisFormState> {
    const prepared = prepareWebsiteAnalysis(id);
    if ("error" in prepared) return { error: prepared.error };
    await wait(prepared.delayMs);
    prepared.save();
    return {};
  }

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
            {dict.leads.assignedTo}: {DEMO_PROFILE.fullName}
          </p>
        </div>
        <LeadStatusForm
          key={lead.status}
          leadId={lead.id}
          status={lead.status}
          action={(formData) => {
            const status = parseLeadStatus(formData);
            if (status) updateLead(lead.id, { status });
          }}
        />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.common.edit}
        </h2>
        <LeadEditForm
          key={lead.updatedAt}
          lead={lead}
          action={(formData) => {
            const input = parseLeadForm(formData);
            if (input) updateLead(lead.id, input);
          }}
        />
      </Card>

      {lead.website && (
        <WebsiteAnalysisCard
          leadId={lead.id}
          website={lead.website}
          latestAnalysis={latestAnalysis}
          locale={locale}
          action={runWebsiteAnalysis}
        />
      )}

      <Card>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.common.internalNotes}
        </h2>
        <AddNoteForm
          leadId={lead.id}
          action={(formData) => {
            const content = String(formData.get("content") ?? "").trim();
            if (content) addNote(lead.id, content);
          }}
        />
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{dict.leads.noLeadNotes}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
                <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {note.content}
                </p>
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
          <LinkButton
            href={`${DEMO_BASE}/tasks/new?leadId=${lead.id}`}
            size="sm"
            variant="secondary"
          >
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
                <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`${DEMO_BASE}/tasks/${task.id}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
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
          <LinkButton
            href={`${DEMO_BASE}/meetings/new?leadId=${lead.id}`}
            size="sm"
            variant="secondary"
          >
            {dict.leads.newMeetingForLead}
          </LinkButton>
        </div>
        {meetings.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <Link
                  href={`${DEMO_BASE}/meetings/${m.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
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
            <LinkButton
              href={`${DEMO_BASE}/whatsapp/${whatsappConversation.id}`}
              size="sm"
              variant="secondary"
            >
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
          <LinkButton
            href={`${DEMO_BASE}/conversations/new?leadId=${lead.id}`}
            size="sm"
            variant="secondary"
          >
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
                    href={`${DEMO_BASE}/conversations/${c.id}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
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
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.leads.linkedDeals}
          </h2>
          <LinkButton
            href={`${DEMO_BASE}/deals/new?leadId=${lead.id}`}
            size="sm"
            variant="secondary"
          >
            {dict.leads.newDealForLead}
          </LinkButton>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <Link
                  href={`${DEMO_BASE}/deals/${d.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
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

      <form
        action={() => {
          setLeaving(true);
          deleteLead(lead.id);
          router.push(`${DEMO_BASE}/leads`);
        }}
      >
        <ConfirmSubmitButton confirmMessage={dict.leads.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

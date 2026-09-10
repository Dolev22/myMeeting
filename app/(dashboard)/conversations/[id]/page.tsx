import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getConversation } from "@/lib/repo/conversations";
import { getLead } from "@/lib/repo/leads";
import { listTasksBySourceConversation } from "@/lib/repo/tasks";
import { deleteConversationAction } from "@/lib/actions/conversations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ConversationAnalysisPanel } from "@/components/conversations/conversation-analysis-panel";
import { formatDateTime } from "@/lib/format";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const conversation = await getConversation(userId, id);
  if (!conversation) notFound();

  const dict = getDictionary(locale);
  const [lead, createdTasks] = await Promise.all([
    getLead(userId, conversation.leadId),
    listTasksBySourceConversation(userId, conversation.id),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.conversations.title}
        </h1>
        {lead && (
          <Link
            href={`/leads/${lead.id}#conversations`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {formatDateTime(conversation.occurredAt, locale)}
          </span>
          <Badge color={conversation.direction === "incoming" ? "blue" : "teal"}>
            {dict.conversationDirection[conversation.direction]}
          </Badge>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {dict.conversations.duration}: {conversation.durationMinutes}
        </div>

        <div>
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.conversations.notes}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {conversation.notes || dict.common.noResults}
          </p>
        </div>
      </Card>

      <ConversationAnalysisPanel
        conversation={conversation}
        leadId={conversation.leadId}
        createdTasks={createdTasks}
        locale={locale}
      />

      <form action={deleteConversationAction.bind(null, conversation.id, conversation.leadId)}>
        <ConfirmSubmitButton confirmMessage={dict.conversations.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

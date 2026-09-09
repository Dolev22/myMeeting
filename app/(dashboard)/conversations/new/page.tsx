import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLead } from "@/lib/repo/leads";
import { Card } from "@/components/ui/card";
import { ConversationCreateForm } from "@/components/conversations/conversation-create-form";

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const [userId, locale, params] = await Promise.all([
    getCurrentUserId(),
    getLocale(),
    searchParams,
  ]);
  if (!userId) redirect("/login");
  if (!params.leadId) notFound();

  const lead = await getLead(userId, params.leadId);
  if (!lead) notFound();

  const dict = getDictionary(locale);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.conversations.newConversation}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {dict.conversations.relatedLead}: {lead.name}
        </p>
      </div>
      <Card>
        <ConversationCreateForm leadId={lead.id} />
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getWhatsAppConversation, listWhatsAppMessages } from "@/lib/repo/whatsapp";
import { markWhatsAppConversationReadAction } from "@/lib/actions/whatsapp";
import { Card } from "@/components/ui/card";
import { WhatsAppChatView } from "@/components/whatsapp/whatsapp-chat-view";
import { LeadContextPanel } from "@/components/whatsapp/lead-context-panel";
import { WhatsAppSummaryPanel } from "@/components/whatsapp/whatsapp-summary-panel";

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const conversation = await getWhatsAppConversation(userId, id);
  if (!conversation) notFound();

  const dict = getDictionary(locale);
  const messages = await listWhatsAppMessages(userId, id);

  if (conversation.unread) {
    await markWhatsAppConversationReadAction(id);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/whatsapp"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowRight size={14} className="rtl:rotate-180" />
        {dict.whatsapp.backToList}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0">
            <WhatsAppChatView conversationId={id} messages={messages} locale={locale} />
          </Card>
        </div>

        <div className="space-y-6">
          <LeadContextPanel conversation={conversation} locale={locale} />
          <WhatsAppSummaryPanel
            conversationId={id}
            analysis={conversation.analysis}
            analyzedAt={conversation.analyzedAt}
            hasMessages={messages.length > 0}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

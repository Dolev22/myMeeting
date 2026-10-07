"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { WhatsAppChatView } from "@/components/whatsapp/whatsapp-chat-view";
import { LeadContextPanel } from "@/components/whatsapp/lead-context-panel";
import { WhatsAppSummaryPanel } from "@/components/whatsapp/whatsapp-summary-panel";
import { DemoLoading, DemoNotFound, wait } from "@/components/demo/demo-ui";
import { useDemoData } from "@/lib/demo/store";
import {
  generateWhatsAppAiReply,
  generateWhatsAppSummary,
  getWhatsAppConversation,
  listWhatsAppMessages,
  markWhatsAppConversationRead,
  sendWhatsAppMessage,
} from "@/lib/demo/repo";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/whatsapp/[id]/page.tsx. Sending a
// message, the "AI" reply and the summary are all local: no provider is
// called and no message leaves the browser.
export default function DemoWhatsAppConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { dict, locale } = useI18n();
  const data = useDemoData();

  const conversation = data ? getWhatsAppConversation(data, id) : null;
  const unread = conversation?.unread ?? false;
  useEffect(() => {
    if (unread) markWhatsAppConversationRead(id);
  }, [unread, id]);

  if (!data) return <DemoLoading />;
  if (!conversation) return <DemoNotFound />;
  const messages = listWhatsAppMessages(data, id);

  return (
    <div className="space-y-4">
      <Link
        href={`${DEMO_BASE}/whatsapp`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowRight size={14} className="rtl:rotate-180" />
        {dict.whatsapp.backToList}
      </Link>

      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        {dict.demo.whatsappNote}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            <WhatsAppChatView
              conversationId={id}
              messages={messages}
              locale={locale}
              actions={{
                send: (_state, formData) => {
                  const body = String(formData.get("body") ?? "").trim();
                  if (!body) return { error: "empty" };
                  sendWhatsAppMessage(id, body);
                  return {};
                },
                generateReply: async () => {
                  await wait(500);
                  return generateWhatsAppAiReply(id);
                },
              }}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <LeadContextPanel conversation={conversation} locale={locale} basePath={DEMO_BASE} />
          <WhatsAppSummaryPanel
            conversationId={id}
            analysis={conversation.analysis}
            analyzedAt={conversation.analyzedAt}
            hasMessages={messages.length > 0}
            locale={locale}
            action={async () => {
              await wait(900);
              return generateWhatsAppSummary(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}

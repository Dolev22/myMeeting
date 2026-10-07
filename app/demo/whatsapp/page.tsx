"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { SimulateIncomingForm } from "@/components/whatsapp/simulate-incoming-form";
import { NewFromWhatsAppBadge } from "@/components/whatsapp/new-from-whatsapp-badge";
import { DemoLoading, wait } from "@/components/demo/demo-ui";
import type { SimulateIncomingFormState } from "@/lib/actions/whatsapp";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useDemoData } from "@/lib/demo/store";
import { listWhatsAppConversations, simulateIncomingWhatsApp } from "@/lib/demo/repo";
import { parseSimulateIncomingForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/whatsapp/page.tsx. Nothing here talks
// to WhatsApp or any provider — "Simulate Incoming WhatsApp" only writes to
// the browser-local dataset.
export default function DemoWhatsAppHubPage() {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const q = params.get("q") ?? "";
  const conversations = listWhatsAppConversations(data, { search: q });

  async function simulateAction(
    _state: SimulateIncomingFormState,
    formData: FormData
  ): Promise<SimulateIncomingFormState> {
    const input = parseSimulateIncomingForm(formData);
    if (!input) return { error: "invalid" };
    await wait(600);
    const conversationId = simulateIncomingWhatsApp(input);
    router.push(`${DEMO_BASE}/whatsapp/${conversationId}`);
    return {};
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.whatsapp.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.whatsapp.subtitle}</p>
        </div>
        <SimulateIncomingForm action={simulateAction} />
      </div>

      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        {dict.demo.whatsappNote}
      </p>

      <Card>
        <form
          className="flex"
          onSubmit={(event) => {
            event.preventDefault();
            const nextQ = String(new FormData(event.currentTarget).get("q") ?? "").trim();
            router.push(
              nextQ
                ? `${DEMO_BASE}/whatsapp?q=${encodeURIComponent(nextQ)}`
                : `${DEMO_BASE}/whatsapp`
            );
          }}
        >
          <Input
            name="q"
            defaultValue={q}
            placeholder={dict.whatsapp.searchPlaceholder}
            className="flex-1"
          />
        </form>
      </Card>

      <Card className="p-0">
        {conversations.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            {dict.whatsapp.noConversations}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`${DEMO_BASE}/whatsapp/${conversation.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium text-zinc-900 dark:text-zinc-50",
                          conversation.unread && "font-semibold"
                        )}
                      >
                        {conversation.lead.name}
                      </span>
                      {conversation.lead.source === "whatsapp" && (
                        <NewFromWhatsAppBadge createdAt={conversation.lead.createdAt} />
                      )}
                      {conversation.unread && (
                        <Badge color="teal">{dict.whatsapp.unreadLabel}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">
                      {conversation.phoneNumber}
                    </p>
                    {conversation.lastMessagePreview && (
                      <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                        {conversation.lastMessageDirection === "outgoing" ? "↩ " : ""}
                        {conversation.lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(conversation.lastMessageAt, locale)}
                    </span>
                    {conversation.analysis && (
                      <Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

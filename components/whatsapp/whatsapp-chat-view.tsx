"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  sendWhatsAppMessageAction,
  generateAiReplyAction,
  type SendWhatsAppMessageFormState,
  type GenerateReplyFormState,
} from "@/lib/actions/whatsapp";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { WhatsAppMessage } from "@/lib/types";
import { cn } from "@/lib/cn";

const sendInitial: SendWhatsAppMessageFormState = {};
const replyInitial: GenerateReplyFormState = {};

export function WhatsAppChatView({
  conversationId,
  messages,
  locale,
}: {
  conversationId: string;
  messages: WhatsAppMessage[];
  locale: Locale;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [sendState, sendFormAction, sendPending] = useActionState(
    sendWhatsAppMessageAction.bind(null, conversationId),
    sendInitial
  );
  const [replyState, replyFormAction, replyPending] = useActionState(
    generateAiReplyAction.bind(null, conversationId),
    replyInitial
  );

  useEffect(() => {
    if (sendState !== sendInitial) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [sendState, router]);

  useEffect(() => {
    if (replyState !== replyInitial) router.refresh();
  }, [replyState, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const hasIncoming = messages.some((m) => m.direction === "incoming");

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.whatsapp.noMessagesYet}</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.direction === "outgoing" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                  message.direction === "outgoing"
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                )}
              >
                {message.body}
              </div>
              <div className="flex items-center gap-2 px-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{formatDateTime(message.createdAt, locale)}</span>
                {message.isAiGenerated && (
                  <Badge color="blue">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={10} />
                      {dict.whatsapp.aiGeneratedLabel}
                    </span>
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 space-y-2">
        {sendState.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{dict.whatsapp.errorSendFailed}</p>
        )}
        <form ref={formRef} action={sendFormAction} className="flex items-end gap-2">
          <Textarea
            name="body"
            placeholder={dict.whatsapp.chatPlaceholder}
            className="min-h-16"
            required
          />
          <Button type="submit" disabled={sendPending}>
            {sendPending ? dict.whatsapp.sending : dict.whatsapp.sendButton}
          </Button>
        </form>

        <form action={replyFormAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={replyPending || !hasIncoming}
          >
            <Sparkles size={14} />
            {replyPending ? dict.whatsapp.generatingReply : dict.whatsapp.generateReplyButton}
          </Button>
        </form>
        {replyState.error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {replyState.error === "no_incoming_message"
              ? dict.whatsapp.errorNoIncomingMessage
              : dict.whatsapp.errorGenerateFailed}
          </p>
        )}
      </div>
    </div>
  );
}

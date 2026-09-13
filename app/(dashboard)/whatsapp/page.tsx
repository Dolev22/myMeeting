import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listWhatsAppConversations } from "@/lib/repo/whatsapp";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { SimulateIncomingForm } from "@/components/whatsapp/simulate-incoming-form";
import { NewFromWhatsAppBadge } from "@/components/whatsapp/new-from-whatsapp-badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Search = { q?: string };

export default async function WhatsAppHubPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [userId, locale, params] = await Promise.all([
    getCurrentUserId(),
    getLocale(),
    searchParams,
  ]);
  if (!userId) redirect("/login");

  const dict = getDictionary(locale);
  const conversations = await listWhatsAppConversations(userId, { search: params.q });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.whatsapp.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.whatsapp.subtitle}</p>
        </div>
        <SimulateIncomingForm />
      </div>

      <Card>
        <form className="flex" method="get">
          <Input
            name="q"
            defaultValue={params.q ?? ""}
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
                  href={`/whatsapp/${conversation.id}`}
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

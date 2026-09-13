import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/status-badges";
import { NewFromWhatsAppBadge } from "@/components/whatsapp/new-from-whatsapp-badge";
import type { WhatsAppConversationWithLead } from "@/lib/types";

export function LeadContextPanel({
  conversation,
  locale,
}: {
  conversation: WhatsAppConversationWithLead;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const { lead } = conversation;

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {dict.whatsapp.leadContextTitle}
      </h2>
      <div className="space-y-1">
        <Link
          href={`/leads/${lead.id}`}
          className="text-base font-semibold text-teal-700 hover:underline dark:text-teal-400"
        >
          {lead.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          {lead.source === "whatsapp" && <NewFromWhatsAppBadge createdAt={lead.createdAt} />}
        </div>
      </div>
      <dl className="space-y-1 text-sm">
        {lead.company && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500 dark:text-zinc-400">{dict.common.company}</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{lead.company}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">{dict.common.phone}</dt>
          <dd className="text-zinc-800 dark:text-zinc-200" dir="ltr">
            {lead.phone ?? conversation.phoneNumber}
          </dd>
        </div>
        {lead.email && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500 dark:text-zinc-400">{dict.common.email}</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{lead.email}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">{dict.common.source}</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">{dict.leadSource[lead.source]}</dd>
        </div>
      </dl>
      <Link
        href={`/leads/${lead.id}`}
        className="inline-block text-sm text-teal-700 hover:underline dark:text-teal-400"
      >
        {dict.whatsapp.openLeadProfile}
      </Link>
    </Card>
  );
}

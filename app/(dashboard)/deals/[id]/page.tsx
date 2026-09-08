import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getDeal } from "@/lib/repo/deals";
import { getLead, listLeads } from "@/lib/repo/leads";
import { deleteDealAction } from "@/lib/actions/deals";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DealEditForm } from "@/components/deals/deal-edit-form";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const deal = await getDeal(userId, id);
  if (!deal) notFound();

  const dict = getDictionary(locale);
  const [lead, leads] = await Promise.all([
    getLead(userId, deal.leadId),
    listLeads(userId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{deal.title}</h1>
        {lead && (
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card>
        <DealEditForm deal={deal} leads={leads} />
      </Card>

      <form action={deleteDealAction.bind(null, deal.id, deal.leadId)}>
        <ConfirmSubmitButton confirmMessage={dict.deals.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

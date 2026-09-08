import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listLeads } from "@/lib/repo/leads";
import { Card } from "@/components/ui/card";
import { DealCreateForm } from "@/components/deals/deal-create-form";

export default async function NewDealPage({
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

  const dict = getDictionary(locale);
  const leads = await listLeads(userId);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.deals.newDeal}</h1>
      <Card>
        <DealCreateForm leads={leads} defaultLeadId={params.leadId} />
      </Card>
    </div>
  );
}

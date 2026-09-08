import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listDeals } from "@/lib/repo/deals";
import { listLeads } from "@/lib/repo/leads";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { DealStatusBadge } from "@/components/status-badges";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DealsPage() {
  const [userId, locale] = await Promise.all([getCurrentUserId(), getLocale()]);
  if (!userId) redirect("/login");

  const dict = getDictionary(locale);
  const [deals, leads] = await Promise.all([listDeals(userId), listLeads(userId)]);
  const leadById = new Map(leads.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.deals.title}</h1>
        <LinkButton href="/deals/new">{dict.deals.newDeal}</LinkButton>
      </div>

      <Card className="p-0">
        {deals.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{dict.common.name}</th>
                <th className="px-4 py-3 text-start font-medium">
                  {dict.deals.relatedLead}
                </th>
                <th className="px-4 py-3 text-start font-medium">{dict.deals.value}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.status}</th>
                <th className="px-4 py-3 text-start font-medium">
                  {dict.common.updatedAt}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                    >
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {leadById.get(deal.leadId)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {formatCurrency(deal.value, deal.currency, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <DealStatusBadge status={deal.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDate(deal.updatedAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

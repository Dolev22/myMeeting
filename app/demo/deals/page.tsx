"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { DealStatusBadge } from "@/components/status-badges";
import { DemoLoading } from "@/components/demo/demo-ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useDemoData } from "@/lib/demo/store";
import { listDeals } from "@/lib/demo/repo";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/deals/page.tsx.
export default function DemoDealsPage() {
  const { dict, locale } = useI18n();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const deals = listDeals(data);
  const leadById = new Map(data.leads.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.deals.title}</h1>
        <LinkButton href={`${DEMO_BASE}/deals/new`}>{dict.deals.newDeal}</LinkButton>
      </div>

      <Card className="p-0">
        {deals.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{dict.common.name}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.deals.relatedLead}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.deals.value}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.status}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.updatedAt}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`${DEMO_BASE}/deals/${deal.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
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

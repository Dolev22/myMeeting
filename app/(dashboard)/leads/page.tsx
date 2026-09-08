import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listLeads } from "@/lib/repo/leads";
import { listLatestAnalysesByLead } from "@/lib/repo/website-analyses";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { LeadStatusBadge } from "@/components/status-badges";
import { AI_ANALYSIS_ANCHOR_ID } from "@/components/leads/website-analysis-card";
import { formatDate } from "@/lib/format";

type Search = { q?: string; status?: string };

export default async function LeadsPage({
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
  const status = (params.status as LeadStatus | "all" | undefined) ?? "all";
  const [leads, analysesByLead] = await Promise.all([
    listLeads(userId, { search: params.q, status }),
    listLatestAnalysesByLead(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.leads.title}</h1>
        <LinkButton href="/leads/new">{dict.leads.newLead}</LinkButton>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={dict.leads.searchPlaceholder}
            className="sm:flex-1"
          />
          <Select name="status" defaultValue={status} className="sm:w-56">
            <option value="all">{dict.common.all}</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.leadStatus[s]}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            {dict.common.filter}
          </button>
        </form>
      </Card>

      <Card className="p-0">
        {leads.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">{dict.common.noResults}</p>
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{dict.common.name}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.company}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.phone}</th>
                <th className="px-4 py-3 text-start font-medium">{dict.common.status}</th>
                <th className="px-4 py-3 text-start font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
                    {dict.websiteAnalysis.columnHeader}
                  </span>
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {dict.common.updatedAt}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {leads.map((lead) => {
                const analysis = analysesByLead.get(lead.id);
                return (
                  <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {lead.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {lead.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      {!lead.website ? (
                        <Badge color="zinc">{dict.websiteAnalysis.statusNoWebsite}</Badge>
                      ) : (
                        <Link
                          href={`/leads/${lead.id}#${AI_ANALYSIS_ANCHOR_ID}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <Badge color={analysis ? "green" : "amber"}>
                            {analysis
                              ? dict.websiteAnalysis.statusAnalyzed
                              : dict.websiteAnalysis.statusNotAnalyzed}
                          </Badge>
                          <span className="text-xs text-teal-700 dark:text-teal-400">
                            {analysis
                              ? dict.websiteAnalysis.viewButton
                              : dict.websiteAnalysis.runButton}
                          </span>
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {formatDate(lead.updatedAt, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

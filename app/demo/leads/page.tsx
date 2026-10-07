"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { LeadStatusBadge } from "@/components/status-badges";
import { NewFromWhatsAppBadge } from "@/components/whatsapp/new-from-whatsapp-badge";
import { AI_ANALYSIS_ANCHOR_ID } from "@/components/leads/website-analysis-card";
import { DemoLoading } from "@/components/demo/demo-ui";
import { formatDate } from "@/lib/format";
import { useDemoData } from "@/lib/demo/store";
import { listLeads } from "@/lib/demo/repo";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/leads/page.tsx.
export default function DemoLeadsPage() {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const q = params.get("q") ?? "";
  const status = (params.get("status") as LeadStatus | "all" | null) ?? "all";
  const leads = listLeads(data, { search: q, status });
  const analyzedLeadIds = new Set(data.websiteAnalyses.map((a) => a.leadId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.leads.title}</h1>
        <LinkButton href={`${DEMO_BASE}/leads/new`}>{dict.leads.newLead}</LinkButton>
      </div>

      <Card>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const next = new URLSearchParams();
            const nextQ = String(form.get("q") ?? "").trim();
            if (nextQ) next.set("q", nextQ);
            next.set("status", String(form.get("status") ?? "all"));
            router.push(`${DEMO_BASE}/leads?${next.toString()}`);
          }}
        >
          <Input
            name="q"
            defaultValue={q}
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
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
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
                <th className="px-4 py-3 text-start font-medium">{dict.common.updatedAt}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {leads.map((lead) => {
                const analyzed = analyzedLeadIds.has(lead.id);
                return (
                  <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`${DEMO_BASE}/leads/${lead.id}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {lead.name}
                        </Link>
                        {lead.source === "whatsapp" && (
                          <NewFromWhatsAppBadge createdAt={lead.createdAt} />
                        )}
                      </div>
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
                          href={`${DEMO_BASE}/leads/${lead.id}#${AI_ANALYSIS_ANCHOR_ID}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <Badge color={analyzed ? "green" : "amber"}>
                            {analyzed
                              ? dict.websiteAnalysis.statusAnalyzed
                              : dict.websiteAnalysis.statusNotAnalyzed}
                          </Badge>
                          <span className="text-xs text-teal-700 dark:text-teal-400">
                            {analyzed
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

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentUserId, getCurrentProfile } from "@/lib/session";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listLeads } from "@/lib/repo/leads";
import { listMeetings } from "@/lib/repo/meetings";
import { listDeals } from "@/lib/repo/deals";
import { listLatestAnalysesByLead } from "@/lib/repo/website-analyses";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { formatCurrency, formatDateTime, isWithinHoursFromNow } from "@/lib/format";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const [userId, profile, locale] = await Promise.all([
    getCurrentUserId(),
    getCurrentProfile(),
    getLocale(),
  ]);
  if (!userId || !profile) redirect("/login");

  const dict = getDictionary(locale);

  const [leads, upcomingMeetings, deals, analysesByLead] = await Promise.all([
    listLeads(userId),
    listMeetings(userId, { when: "upcoming" }),
    listDeals(userId),
    listLatestAnalysesByLead(userId),
  ]);
  const leadsWithWebsite = leads.filter((l) => l.website);
  const analyzedCount = leadsWithWebsite.filter((l) => analysesByLead.has(l.id)).length;
  const pendingCount = leadsWithWebsite.length - analyzedCount;
  const openLeads = leads.filter(
    (l) => l.status !== "deal_closed" && l.status !== "deal_lost"
  );
  const openDeals = deals.filter((d) => d.status === "open");
  const wonValue = deals
    .filter((d) => d.status === "won")
    .reduce((sum, d) => sum + d.value, 0);

  const soon = upcomingMeetings.filter((m) => isWithinHoursFromNow(m.scheduledAt, 48));

  const leadById = new Map(leads.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.dashboard.title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {dict.dashboard.welcome}, {profile.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.openLeads}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{openLeads.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.upcomingMeetings}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {upcomingMeetings.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.openDeals}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{openDeals.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.wonValue}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(wonValue, "ILS", locale)}
          </p>
        </Card>
      </div>

      <Card className="border-teal-200 dark:border-teal-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            {dict.websiteAnalysis.dashboardTitle}
          </h2>
          <LinkButton href="/leads" variant="secondary" size="sm">
            {dict.websiteAnalysis.dashboardCta}
          </LinkButton>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dict.websiteAnalysis.dashboardWithWebsite}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {leadsWithWebsite.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dict.websiteAnalysis.dashboardAnalyzed}
            </p>
            <p className="mt-1 text-2xl font-semibold text-green-700 dark:text-green-400">
              {analyzedCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dict.websiteAnalysis.dashboardPending}
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-400">
              {pendingCount}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {dict.dashboard.todayMeetings}
        </h2>
        {soon.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.noMeetingsSoon}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {soon.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                  >
                    {m.title}
                  </Link>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {leadById.get(m.leadId)?.name}
                  </p>
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatDateTime(m.scheduledAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

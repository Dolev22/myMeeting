"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { TaskPriorityBadge } from "@/components/status-badges";
import { DemoLoading } from "@/components/demo/demo-ui";
import { formatCurrency, formatDateTime, formatDate, isWithinHoursFromNow } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useDemoData } from "@/lib/demo/store";
import { listLeads, listMeetings, listDeals, listTasks } from "@/lib/demo/repo";
import { DEMO_PROFILE } from "@/lib/demo/seed";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/page.tsx — same layout and figures,
// computed from the browser-local dataset.
export default function DemoDashboardPage() {
  const { dict, locale } = useI18n();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const leads = listLeads(data);
  const upcomingMeetings = listMeetings(data, { when: "upcoming" });
  const deals = listDeals(data);
  const tasks = listTasks(data);
  const overdueTasks = listTasks(data, { due: "overdue" });

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const leadsWithWebsite = leads.filter((l) => l.website);
  const analyzedLeadIds = new Set(data.websiteAnalyses.map((a) => a.leadId));
  const analyzedCount = leadsWithWebsite.filter((l) => analyzedLeadIds.has(l.id)).length;
  const pendingCount = leadsWithWebsite.length - analyzedCount;
  const openLeads = leads.filter((l) => l.status !== "deal_closed" && l.status !== "deal_lost");
  const openDeals = deals.filter((d) => d.status === "open");
  const wonValue = deals.filter((d) => d.status === "won").reduce((sum, d) => sum + d.value, 0);
  const soon = upcomingMeetings.filter((m) => isWithinHoursFromNow(m.scheduledAt, 48));
  const leadById = new Map(leads.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.dashboard.title}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {dict.dashboard.welcome}, {DEMO_PROFILE.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.openLeads}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {openLeads.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.openTasks}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {openTasks.length}
          </p>
        </Card>
        <Card className={overdueTasks.length > 0 ? "border-red-200 dark:border-red-900" : undefined}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.overdueTasks}</p>
          <p
            className={cn(
              "mt-1 text-3xl font-semibold",
              overdueTasks.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-900 dark:text-zinc-50"
            )}
          >
            {overdueTasks.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dict.dashboard.upcomingMeetings}
          </p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {upcomingMeetings.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.openDeals}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {openDeals.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.wonValue}</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(wonValue, "ILS", locale)}
          </p>
        </Card>
      </div>

      <Card className={cn(overdueTasks.length > 0 && "border-red-200 dark:border-red-900")}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {dict.dashboard.overdueTasks}
          </h2>
          <LinkButton href={`${DEMO_BASE}/tasks?due=overdue`} variant="secondary" size="sm">
            {dict.tasks.title}
          </LinkButton>
        </div>
        {overdueTasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.dashboard.noOverdueTasks}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {overdueTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    href={`${DEMO_BASE}/tasks/${task.id}`}
                    className="font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    {task.name}
                  </Link>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {leadById.get(task.leadId)?.name}
                    {task.assignedTo ? ` · ${task.assignedTo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {task.dueDate ? formatDate(task.dueDate, locale) : ""}
                  </span>
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-teal-200 dark:border-teal-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            {dict.websiteAnalysis.dashboardTitle}
          </h2>
          <LinkButton href={`${DEMO_BASE}/leads`} variant="secondary" size="sm">
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
                    href={`${DEMO_BASE}/meetings/${m.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
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

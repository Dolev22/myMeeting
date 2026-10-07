"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { DealCreateForm } from "@/components/deals/deal-create-form";
import { DemoLoading } from "@/components/demo/demo-ui";
import type { DealFormState } from "@/lib/actions/deals";
import { useDemoData } from "@/lib/demo/store";
import { createDeal, listLeads } from "@/lib/demo/repo";
import { parseDealForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/deals/new/page.tsx.
export default function DemoNewDealPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  function createAction(_state: DealFormState, formData: FormData): DealFormState {
    const input = parseDealForm(formData);
    if (!input) return { error: "invalid" };
    const deal = createDeal(input);
    router.push(`${DEMO_BASE}/deals/${deal.id}`);
    return {};
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.deals.newDeal}</h1>
      <Card>
        <DealCreateForm
          leads={listLeads(data)}
          defaultLeadId={params.get("leadId") ?? undefined}
          action={createAction}
        />
      </Card>
    </div>
  );
}

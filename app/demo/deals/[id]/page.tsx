"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { DealEditForm } from "@/components/deals/deal-edit-form";
import { DemoLoading, DemoNotFound } from "@/components/demo/demo-ui";
import { useDemoData } from "@/lib/demo/store";
import { deleteDeal, listLeads, updateDeal } from "@/lib/demo/repo";
import { parseDealForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/deals/[id]/page.tsx.
export default function DemoDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dict } = useI18n();
  const router = useRouter();
  const data = useDemoData();
  const [leaving, setLeaving] = useState(false);

  if (!data || leaving) return <DemoLoading />;
  const deal = data.deals.find((d) => d.id === id);
  if (!deal) return <DemoNotFound />;
  const lead = data.leads.find((l) => l.id === deal.leadId);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{deal.title}</h1>
        {lead && (
          <Link
            href={`${DEMO_BASE}/leads/${lead.id}`}
            className="text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            {lead.name}
          </Link>
        )}
      </div>

      <Card>
        <DealEditForm
          key={deal.updatedAt}
          deal={deal}
          leads={listLeads(data)}
          action={(formData) => {
            const input = parseDealForm(formData);
            if (input) updateDeal(deal.id, input);
          }}
        />
      </Card>

      <form
        action={() => {
          setLeaving(true);
          deleteDeal(deal.id);
          router.push(`${DEMO_BASE}/deals`);
        }}
      >
        <ConfirmSubmitButton confirmMessage={dict.deals.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

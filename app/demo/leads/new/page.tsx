"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { LeadCreateForm } from "@/components/leads/lead-create-form";
import type { LeadFormState } from "@/lib/actions/leads";
import { createLead } from "@/lib/demo/repo";
import { parseLeadForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/leads/new/page.tsx.
export default function DemoNewLeadPage() {
  const { dict } = useI18n();
  const router = useRouter();

  function createAction(_state: LeadFormState, formData: FormData): LeadFormState {
    const input = parseLeadForm(formData);
    if (!input) return { error: "invalid" };
    const lead = createLead(input);
    router.push(`${DEMO_BASE}/leads/${lead.id}`);
    return {};
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.leads.newLead}</h1>
      <Card>
        <LeadCreateForm action={createAction} />
      </Card>
    </div>
  );
}

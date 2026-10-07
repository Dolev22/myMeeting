"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { ConversationCreateForm } from "@/components/conversations/conversation-create-form";
import { DemoLoading, DemoNotFound } from "@/components/demo/demo-ui";
import type { ConversationFormState } from "@/lib/actions/conversations";
import { useDemoData } from "@/lib/demo/store";
import { createConversation } from "@/lib/demo/repo";
import { parseConversationForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/conversations/new/page.tsx.
export default function DemoNewConversationPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  const lead = data.leads.find((l) => l.id === params.get("leadId"));
  if (!lead) return <DemoNotFound />;

  function createAction(
    _state: ConversationFormState,
    formData: FormData
  ): ConversationFormState {
    const input = parseConversationForm(formData);
    if (!input) return { error: "invalid" };
    createConversation(input);
    router.push(`${DEMO_BASE}/leads/${input.leadId}#conversations`);
    return {};
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.conversations.newConversation}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {dict.conversations.relatedLead}: {lead.name}
        </p>
      </div>
      <Card>
        <ConversationCreateForm leadId={lead.id} action={createAction} />
      </Card>
    </div>
  );
}

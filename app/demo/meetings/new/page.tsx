"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { MeetingCreateForm } from "@/components/meetings/meeting-create-form";
import { DemoLoading } from "@/components/demo/demo-ui";
import type { MeetingFormState } from "@/lib/actions/meetings";
import { useDemoData } from "@/lib/demo/store";
import { createMeeting, listLeads } from "@/lib/demo/repo";
import { parseMeetingForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/meetings/new/page.tsx.
export default function DemoNewMeetingPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const data = useDemoData();
  if (!data) return <DemoLoading />;

  function createAction(_state: MeetingFormState, formData: FormData): MeetingFormState {
    const input = parseMeetingForm(formData);
    if (!input) return { error: "invalid" };
    const meeting = createMeeting(input);
    router.push(`${DEMO_BASE}/meetings/${meeting.id}`);
    return {};
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.meetings.newMeeting}
      </h1>
      <Card>
        <MeetingCreateForm
          leads={listLeads(data)}
          defaultLeadId={params.get("leadId") ?? undefined}
          action={createAction}
        />
      </Card>
    </div>
  );
}

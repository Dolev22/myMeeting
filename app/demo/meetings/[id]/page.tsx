"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { MeetingEditForm } from "@/components/meetings/meeting-edit-form";
import { DemoLoading, DemoNotFound } from "@/components/demo/demo-ui";
import { useDemoData } from "@/lib/demo/store";
import { deleteMeeting, listLeads, updateMeeting } from "@/lib/demo/repo";
import { parseMeetingForm } from "@/lib/demo/forms";
import { DEMO_BASE } from "@/lib/demo/paths";

// Demo counterpart of app/(dashboard)/meetings/[id]/page.tsx.
export default function DemoMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { dict } = useI18n();
  const router = useRouter();
  const data = useDemoData();
  const [leaving, setLeaving] = useState(false);

  if (!data || leaving) return <DemoLoading />;
  const meeting = data.meetings.find((m) => m.id === id);
  if (!meeting) return <DemoNotFound />;
  const lead = data.leads.find((l) => l.id === meeting.leadId);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{meeting.title}</h1>
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
        <MeetingEditForm
          key={meeting.updatedAt}
          meeting={meeting}
          leads={listLeads(data)}
          action={(formData) => {
            const input = parseMeetingForm(formData);
            if (input) updateMeeting(meeting.id, input);
          }}
        />
      </Card>

      <form
        action={() => {
          setLeaving(true);
          deleteMeeting(meeting.id);
          router.push(`${DEMO_BASE}/meetings`);
        }}
      >
        <ConfirmSubmitButton confirmMessage={dict.meetings.deleteConfirm}>
          {dict.common.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

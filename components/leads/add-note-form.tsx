"use client";

import { addNoteAction } from "@/lib/actions/notes";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function AddNoteForm({
  leadId,
  action: actionOverride,
}: {
  leadId: string;
  /** Replaces the Server Action (used by the browser-local demo mode). */
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const { dict } = useI18n();
  const action = actionOverride ?? addNoteAction.bind(null, leadId);

  return (
    <form action={action} className="space-y-2">
      <Textarea name="content" required placeholder={dict.common.addNote} />
      <Button type="submit" size="sm">
        {dict.common.addNote}
      </Button>
    </form>
  );
}

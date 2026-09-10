"use client";

import { useActionState, useRef } from "react";
import { createConversationAction, type ConversationFormState } from "@/lib/actions/conversations";
import { useI18n } from "@/lib/i18n/client";
import { CONVERSATION_DIRECTIONS } from "@/lib/types";
import { MOCK_SALES_CALL_HE } from "@/lib/mock/mock-sales-call";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";

const initialState: ConversationFormState = {};

export function ConversationCreateForm({ leadId }: { leadId: string }) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(createConversationAction, initialState);
  // Uncontrolled (defaultValue + ref), not controlled React state — see the
  // comment in ConversationAnalysisPanel for why a controlled value here
  // caused the Server Action's response stream to abort under some timing.
  const transcriptionRef = useRef<HTMLTextAreaElement>(null);

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label={dict.conversations.date} htmlFor="date" required>
          <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
        </FormField>
        <FormField label={dict.conversations.time} htmlFor="time" required>
          <Input id="time" name="time" type="time" defaultValue={defaultTime} required />
        </FormField>
        <FormField label={dict.conversations.duration} htmlFor="durationMinutes" required>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            step={1}
            defaultValue={10}
            required
          />
        </FormField>
      </div>

      <FormField label={dict.conversations.direction} htmlFor="direction" required>
        <Select id="direction" name="direction" defaultValue="outgoing" required>
          {CONVERSATION_DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {dict.conversationDirection[d]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={dict.conversations.notes} htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </FormField>

      <FormField label={dict.conversations.transcription} htmlFor="transcription">
        <Textarea
          ref={transcriptionRef}
          id="transcription"
          name="transcription"
          placeholder={dict.conversations.transcriptionPlaceholder}
          className="min-h-48"
          dir="auto"
        />
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              if (transcriptionRef.current) {
                transcriptionRef.current.value = MOCK_SALES_CALL_HE;
              }
            }}
          >
            {dict.conversations.loadMockButton}
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {dict.conversations.transcriptionHint}
        </p>
      </FormField>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{dict.common.required}</p>}

      <Button type="submit" disabled={pending}>
        {dict.common.create}
      </Button>
    </form>
  );
}

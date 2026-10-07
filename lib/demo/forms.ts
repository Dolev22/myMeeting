import { z } from "zod";
import {
  CONVERSATION_DIRECTIONS,
  DEAL_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  MEETING_METHODS,
  MEETING_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ConversationDirection,
  type DealStatus,
  type LeadSource,
  type LeadStatus,
  type MeetingMethod,
  type MeetingStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import type {
  ConversationInput,
  DealInput,
  LeadInput,
  MeetingInput,
  TaskInput,
} from "@/lib/demo/repo";

// FormData -> validated input for the demo's local writes. The rules mirror
// the zod schemas in lib/actions/* (same required fields, same coercions) so
// the shared form components behave the same in demo mode as they do against
// the real Server Actions. Each parser returns null for invalid input.

const optional = (value: FormDataEntryValue | null) => (value ? value : undefined);
const oneOf = <T extends string>(values: T[]) => z.enum(values as [T, ...T[]]);

const leadSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  company: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  source: oneOf<LeadSource>(LEAD_SOURCES),
});

export function parseLeadForm(formData: FormData): LeadInput | null {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: optional(formData.get("phone")),
    email: optional(formData.get("email")),
    company: optional(formData.get("company")),
    website: optional(formData.get("website")),
    source: formData.get("source"),
  });
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    email: parsed.data.email || undefined,
    website: parsed.data.website || undefined,
  };
}

export function parseLeadStatus(formData: FormData): LeadStatus | null {
  const status = formData.get("status");
  return typeof status === "string" && (LEAD_STATUSES as string[]).includes(status)
    ? (status as LeadStatus)
    : null;
}

const meetingSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  method: oneOf<MeetingMethod>(MEETING_METHODS),
  locationOrLink: z.string().trim().optional(),
  status: oneOf<MeetingStatus>(MEETING_STATUSES).optional(),
  notes: z.string().trim().optional(),
});

export function parseMeetingForm(formData: FormData): MeetingInput | null {
  const parsed = meetingSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    method: formData.get("method"),
    locationOrLink: optional(formData.get("locationOrLink")),
    status: optional(formData.get("status")),
    notes: optional(formData.get("notes")),
  });
  if (!parsed.success) return null;
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  return { ...parsed.data, scheduledAt: scheduledAt.toISOString() };
}

const dealSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  value: z.coerce.number().nonnegative(),
  currency: z.string().trim().min(1).default("ILS"),
  productOrService: z.string().trim().optional(),
  status: oneOf<DealStatus>(DEAL_STATUSES).optional(),
  closeDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export function parseDealForm(formData: FormData): DealInput | null {
  const parsed = dealSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    value: formData.get("value"),
    currency: formData.get("currency") || "ILS",
    productOrService: optional(formData.get("productOrService")),
    status: optional(formData.get("status")),
    closeDate: optional(formData.get("closeDate")),
    notes: optional(formData.get("notes")),
  });
  return parsed.success ? parsed.data : null;
}

const taskSchema = z.object({
  leadId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: oneOf<TaskStatus>(TASK_STATUSES).optional(),
  priority: oneOf<TaskPriority>(TASK_PRIORITIES).optional(),
  dueDate: z.string().trim().optional(),
  assignedTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export function parseTaskForm(formData: FormData): TaskInput | null {
  const parsed = taskSchema.safeParse({
    leadId: formData.get("leadId"),
    name: formData.get("name"),
    status: optional(formData.get("status")),
    priority: optional(formData.get("priority")),
    dueDate: optional(formData.get("dueDate")),
    assignedTo: optional(formData.get("assignedTo")),
    notes: optional(formData.get("notes")),
  });
  return parsed.success ? parsed.data : null;
}

const conversationSchema = z.object({
  leadId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  time: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  direction: oneOf<ConversationDirection>(CONVERSATION_DIRECTIONS),
  notes: z.string().trim().optional(),
  transcription: z.string().trim().optional(),
});

export function parseConversationForm(formData: FormData): ConversationInput | null {
  const parsed = conversationSchema.safeParse({
    leadId: formData.get("leadId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMinutes: formData.get("durationMinutes"),
    direction: formData.get("direction"),
    notes: optional(formData.get("notes")),
    transcription: optional(formData.get("transcription")),
  });
  if (!parsed.success) return null;
  const occurredAt = new Date(`${parsed.data.date}T${parsed.data.time}`);
  if (Number.isNaN(occurredAt.getTime())) return null;
  return {
    leadId: parsed.data.leadId,
    occurredAt: occurredAt.toISOString(),
    durationMinutes: parsed.data.durationMinutes,
    direction: parsed.data.direction,
    notes: parsed.data.notes,
    transcription: parsed.data.transcription,
  };
}

const simulateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  message: z.string().trim().min(1),
});

export function parseSimulateIncomingForm(
  formData: FormData
): { name: string; phone: string; message: string } | null {
  const parsed = simulateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });
  return parsed.success ? parsed.data : null;
}

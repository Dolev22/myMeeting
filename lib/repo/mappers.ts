import "server-only";
import type {
  AiWebsiteAnalysis,
  Conversation,
  ConversationDirection,
  Deal,
  DealStatus,
  Lead,
  LeadNote,
  LeadSource,
  LeadStatus,
  Meeting,
  MeetingMethod,
  MeetingStatus,
  Profile,
  Task,
  TaskPriority,
  TaskStatus,
  WebsiteAnalysisReport,
} from "@/lib/types";

// Maps snake_case Postgres rows (Supabase) to the camelCase domain types the
// UI already depends on, so pages/components never need to know the DB
// column naming.

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? undefined,
    locale: row.locale as "he" | "en",
    calComUsername: (row.cal_com_username as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    phone: (row.phone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    website: (row.website as string) ?? undefined,
    source: row.source as LeadSource,
    status: row.status as LeadStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapLeadNote(row: Record<string, unknown>): LeadNote {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}

export function mapMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    scheduledAt: row.scheduled_at as string,
    durationMinutes: row.duration_minutes as number,
    method: row.method as MeetingMethod,
    locationOrLink: (row.location_or_link as string) ?? undefined,
    status: row.status as MeetingStatus,
    notes: (row.notes as string) ?? undefined,
    calComBookingUid: (row.cal_com_booking_uid as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapAiWebsiteAnalysis(row: Record<string, unknown>): AiWebsiteAnalysis {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    url: row.url as string,
    report: row.report as WebsiteAnalysisReport,
    createdAt: row.created_at as string,
  };
}

export function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: (row.due_date as string) ?? undefined,
    assignedTo: (row.assigned_to as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    occurredAt: row.occurred_at as string,
    durationMinutes: row.duration_minutes as number,
    direction: row.direction as ConversationDirection,
    notes: (row.notes as string) ?? undefined,
    transcription: (row.transcription as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapDeal(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    value: Number(row.value),
    currency: row.currency as string,
    productOrService: (row.product_or_service as string) ?? undefined,
    status: row.status as DealStatus,
    closeDate: (row.close_date as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

import "server-only";
import type {
  AiWebsiteAnalysis,
  Conversation,
  ConversationAnalysis,
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
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppMessageDirection,
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
    whatsappPhoneNumber: (row.whatsapp_phone_number as string) ?? undefined,
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
    sourceConversationId: (row.source_conversation_id as string) ?? undefined,
    sourceWhatsAppConversationId: (row.source_whatsapp_conversation_id as string) ?? undefined,
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
    analysis: (row.analysis as ConversationAnalysis) ?? undefined,
    analyzedAt: (row.analyzed_at as string) ?? undefined,
    audioPath: (row.audio_path as string) ?? undefined,
    audioOriginalFilename: (row.audio_original_filename as string) ?? undefined,
    audioUploadedAt: (row.audio_uploaded_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapWhatsAppConversation(row: Record<string, unknown>): WhatsAppConversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    leadId: row.lead_id as string,
    phoneNumber: row.phone_number as string,
    lastMessageAt: row.last_message_at as string,
    lastMessagePreview: (row.last_message_preview as string) ?? undefined,
    lastMessageDirection: (row.last_message_direction as WhatsAppMessageDirection) ?? undefined,
    unread: Boolean(row.unread),
    analysis: (row.analysis as ConversationAnalysis) ?? undefined,
    analyzedAt: (row.analyzed_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapWhatsAppMessage(row: Record<string, unknown>): WhatsAppMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    direction: row.direction as WhatsAppMessageDirection,
    isAiGenerated: Boolean(row.is_ai_generated),
    body: row.body as string,
    providerMessageId: (row.provider_message_id as string) ?? undefined,
    createdAt: row.created_at as string,
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

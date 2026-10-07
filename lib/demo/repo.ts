"use client";

import { analyzeTranscript } from "@/lib/ai/conversation-analysis-core";
import { buildWebsiteReport } from "@/lib/ai/website-analysis-core";
import { generateWhatsAppReply } from "@/lib/ai/whatsapp-response-core";
import { buildWhatsAppTranscript } from "@/lib/whatsapp/build-transcript";
import {
  NOTE_MARKER,
  extractCompany,
  extractEmail,
  extractWebsite,
  formatAutoNote,
} from "@/lib/whatsapp/lead-enrichment-core";
import { DEMO_USER_ID, type DemoData } from "@/lib/demo/seed";
import { getDemoData, updateDemoData } from "@/lib/demo/store";
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
  Task,
  TaskPriority,
  TaskStatus,
  WhatsAppConversation,
  WhatsAppConversationWithLead,
  WhatsAppMessage,
} from "@/lib/types";

// The demo's counterpart to lib/repo/* + lib/actions/*: the same queries
// (filters, ordering) and the same write rules (cascades, "deal won closes
// the lead", idempotent task creation, WhatsApp auto-reply + enrichment),
// applied to the browser-local dataset instead of Postgres. The simulated
// "AI" steps call the very same local engines the server uses
// (lib/ai/*-core.ts) — nothing here calls an external service.

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Queries (pure — take the dataset the page already holds)
// ---------------------------------------------------------------------------

export function listLeads(
  data: DemoData,
  filters: { search?: string; status?: LeadStatus | "all" } = {}
): Lead[] {
  let leads = data.leads;
  if (filters.status && filters.status !== "all") {
    leads = leads.filter((l) => l.status === filters.status);
  }
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) =>
      [l.name, l.phone, l.email, l.company].some((v) => v?.toLowerCase().includes(q))
    );
  }
  return [...leads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listNotes(data: DemoData, leadId: string): LeadNote[] {
  return data.notes
    .filter((n) => n.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listMeetings(
  data: DemoData,
  filters: { when?: "upcoming" | "past" | "all"; leadId?: string } = {}
): Meeting[] {
  let meetings = data.meetings;
  if (filters.leadId) meetings = meetings.filter((m) => m.leadId === filters.leadId);
  const now = nowIso();
  if (filters.when === "upcoming") {
    return meetings
      .filter((m) => m.scheduledAt >= now)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
  if (filters.when === "past") {
    return meetings
      .filter((m) => m.scheduledAt < now)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }
  return [...meetings].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function listDeals(data: DemoData, filters: { leadId?: string } = {}): Deal[] {
  const deals = filters.leadId ? data.deals.filter((d) => d.leadId === filters.leadId) : data.deals;
  return [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export type TaskDueFilter = "overdue" | "today" | "upcoming" | "all";

export function listTasks(
  data: DemoData,
  filters: {
    leadId?: string;
    status?: TaskStatus | "all";
    priority?: TaskPriority | "all";
    due?: TaskDueFilter;
  } = {}
): Task[] {
  let tasks = data.tasks;
  if (filters.leadId) tasks = tasks.filter((t) => t.leadId === filters.leadId);
  if (filters.status && filters.status !== "all") {
    tasks = tasks.filter((t) => t.status === filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    tasks = tasks.filter((t) => t.priority === filters.priority);
  }
  const day = today();
  if (filters.due === "overdue") {
    tasks = tasks.filter((t) => !!t.dueDate && t.dueDate < day && t.status !== "completed");
  } else if (filters.due === "today") {
    tasks = tasks.filter((t) => t.dueDate === day);
  } else if (filters.due === "upcoming") {
    tasks = tasks.filter((t) => !!t.dueDate && t.dueDate > day);
  }
  // due date ascending with undated tasks last, then newest first
  return [...tasks].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function listConversations(data: DemoData, leadId: string): Conversation[] {
  return data.conversations
    .filter((c) => c.leadId === leadId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function listTasksBySourceConversation(data: DemoData, conversationId: string): Task[] {
  return data.tasks
    .filter((t) => t.sourceConversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getLatestWebsiteAnalysis(data: DemoData, leadId: string): AiWebsiteAnalysis | null {
  const rows = data.websiteAnalyses
    .filter((a) => a.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows[0] ?? null;
}

function withLead(
  data: DemoData,
  conversation: WhatsAppConversation
): WhatsAppConversationWithLead | null {
  const lead = data.leads.find((l) => l.id === conversation.leadId);
  if (!lead) return null;
  return {
    ...conversation,
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      company: lead.company,
      email: lead.email,
      status: lead.status,
      source: lead.source,
      createdAt: lead.createdAt,
    },
  };
}

export function listWhatsAppConversations(
  data: DemoData,
  filters: { search?: string } = {}
): WhatsAppConversationWithLead[] {
  let rows = data.whatsappConversations
    .map((c) => withLead(data, c))
    .filter((c): c is WhatsAppConversationWithLead => c !== null)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (c) =>
        c.lead.name.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        (c.lastMessagePreview ?? "").toLowerCase().includes(q)
    );
  }
  return rows;
}

export function getWhatsAppConversation(
  data: DemoData,
  id: string
): WhatsAppConversationWithLead | null {
  const conversation = data.whatsappConversations.find((c) => c.id === id);
  return conversation ? withLead(data, conversation) : null;
}

export function listWhatsAppMessages(data: DemoData, conversationId: string): WhatsAppMessage[] {
  return data.whatsappMessages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------------------------------------------------------------------------
// Leads + notes
// ---------------------------------------------------------------------------

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  website?: string;
  source: LeadSource;
  status?: LeadStatus;
}

/** Copies only the keys that were actually provided, like a partial SQL UPDATE. */
function assignDefined<T extends object>(target: T, patch: Partial<T>) {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (target as Record<string, unknown>)[key] = value;
  }
}

export function createLead(input: LeadInput): Lead {
  const timestamp = nowIso();
  const lead: Lead = {
    id: newId(),
    userId: DEMO_USER_ID,
    name: input.name,
    phone: input.phone,
    email: input.email,
    company: input.company,
    website: input.website,
    source: input.source,
    status: input.status ?? "new_lead",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateDemoData((d) => {
    d.leads.push(lead);
  });
  return lead;
}

export function updateLead(id: string, patch: Partial<LeadInput>): void {
  updateDemoData((d) => {
    const lead = d.leads.find((l) => l.id === id);
    if (!lead) return;
    assignDefined(lead, patch);
    lead.updatedAt = nowIso();
  });
}

/** Removes the lead and everything linked to it (the DB does this via ON DELETE CASCADE). */
export function deleteLead(id: string): void {
  updateDemoData((d) => {
    const whatsappIds = new Set(
      d.whatsappConversations.filter((c) => c.leadId === id).map((c) => c.id)
    );
    d.leads = d.leads.filter((l) => l.id !== id);
    d.notes = d.notes.filter((n) => n.leadId !== id);
    d.meetings = d.meetings.filter((m) => m.leadId !== id);
    d.deals = d.deals.filter((x) => x.leadId !== id);
    d.tasks = d.tasks.filter((t) => t.leadId !== id);
    d.conversations = d.conversations.filter((c) => c.leadId !== id);
    d.websiteAnalyses = d.websiteAnalyses.filter((a) => a.leadId !== id);
    d.whatsappConversations = d.whatsappConversations.filter((c) => c.leadId !== id);
    d.whatsappMessages = d.whatsappMessages.filter((m) => !whatsappIds.has(m.conversationId));
  });
}

export function addNote(leadId: string, content: string): void {
  updateDemoData((d) => {
    d.notes.push({
      id: newId(),
      leadId,
      userId: DEMO_USER_ID,
      content,
      createdAt: nowIso(),
    });
  });
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export interface MeetingInput {
  leadId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  method: MeetingMethod;
  locationOrLink?: string;
  status?: MeetingStatus;
  notes?: string;
}

export function createMeeting(input: MeetingInput): Meeting {
  const timestamp = nowIso();
  const meeting: Meeting = {
    id: newId(),
    userId: DEMO_USER_ID,
    leadId: input.leadId,
    title: input.title,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    method: input.method,
    locationOrLink: input.locationOrLink,
    status: input.status ?? "scheduled",
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateDemoData((d) => {
    d.meetings.push(meeting);
  });
  return meeting;
}

export function updateMeeting(id: string, patch: Partial<MeetingInput>): void {
  updateDemoData((d) => {
    const meeting = d.meetings.find((m) => m.id === id);
    if (!meeting) return;
    assignDefined(meeting, patch);
    meeting.updatedAt = nowIso();
  });
}

export function deleteMeeting(id: string): void {
  updateDemoData((d) => {
    d.meetings = d.meetings.filter((m) => m.id !== id);
  });
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export interface DealInput {
  leadId: string;
  title: string;
  value: number;
  currency: string;
  productOrService?: string;
  status?: DealStatus;
  closeDate?: string;
  notes?: string;
}

export function createDeal(input: DealInput): Deal {
  const timestamp = nowIso();
  const deal: Deal = {
    id: newId(),
    userId: DEMO_USER_ID,
    leadId: input.leadId,
    title: input.title,
    value: input.value,
    currency: input.currency,
    productOrService: input.productOrService,
    status: input.status ?? "open",
    closeDate: input.closeDate || undefined,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateDemoData((d) => {
    d.deals.push(deal);
  });
  return deal;
}

/** Marking a deal won/lost also moves its lead to the matching status. */
export function updateDeal(id: string, patch: Partial<DealInput>): void {
  updateDemoData((d) => {
    const deal = d.deals.find((x) => x.id === id);
    if (!deal) return;
    const { closeDate, ...rest } = patch;
    assignDefined(deal, rest);
    deal.closeDate = closeDate || undefined;
    deal.updatedAt = nowIso();

    const leadStatus: LeadStatus | null =
      patch.status === "won" ? "deal_closed" : patch.status === "lost" ? "deal_lost" : null;
    const lead = leadStatus ? d.leads.find((l) => l.id === deal.leadId) : undefined;
    if (lead && leadStatus) {
      lead.status = leadStatus;
      lead.updatedAt = nowIso();
    }
  });
}

export function deleteDeal(id: string): void {
  updateDemoData((d) => {
    d.deals = d.deals.filter((x) => x.id !== id);
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskInput {
  leadId: string;
  name: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
  sourceConversationId?: string;
  sourceWhatsAppConversationId?: string;
}

function buildTask(input: TaskInput, createdAt = nowIso()): Task {
  return {
    id: newId(),
    userId: DEMO_USER_ID,
    leadId: input.leadId,
    name: input.name,
    status: input.status ?? "new",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate || undefined,
    assignedTo: input.assignedTo,
    notes: input.notes,
    sourceConversationId: input.sourceConversationId,
    sourceWhatsAppConversationId: input.sourceWhatsAppConversationId,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createTask(input: TaskInput): Task {
  const task = buildTask(input);
  updateDemoData((d) => {
    d.tasks.push(task);
  });
  return task;
}

export function updateTask(id: string, patch: Partial<TaskInput>): void {
  updateDemoData((d) => {
    const task = d.tasks.find((t) => t.id === id);
    if (!task) return;
    const { dueDate, ...rest } = patch;
    assignDefined(task, rest);
    task.dueDate = dueDate || undefined;
    task.updatedAt = nowIso();
  });
}

export function deleteTask(id: string): void {
  updateDemoData((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== id);
  });
}

// ---------------------------------------------------------------------------
// Logged calls ("conversations") + simulated transcription / analysis
// ---------------------------------------------------------------------------

export interface ConversationInput {
  leadId: string;
  occurredAt: string;
  durationMinutes: number;
  direction: ConversationDirection;
  notes?: string;
  transcription?: string;
}

export function createConversation(input: ConversationInput): Conversation {
  const timestamp = nowIso();
  const conversation: Conversation = {
    id: newId(),
    userId: DEMO_USER_ID,
    leadId: input.leadId,
    occurredAt: input.occurredAt,
    durationMinutes: input.durationMinutes,
    direction: input.direction,
    notes: input.notes,
    transcription: input.transcription,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateDemoData((d) => {
    d.conversations.push(conversation);
  });
  return conversation;
}

export function updateConversationTranscription(id: string, transcription: string): void {
  updateDemoData((d) => {
    const conversation = d.conversations.find((c) => c.id === id);
    if (!conversation) return;
    conversation.transcription = transcription || undefined;
    conversation.updatedAt = nowIso();
  });
}

/** Runs the local rule-based analyzer over the saved transcription. */
export function analyzeConversation(id: string): { error?: "not_found" | "no_transcription" } {
  const conversation = getDemoData().conversations.find((c) => c.id === id);
  if (!conversation) return { error: "not_found" };
  if (!conversation.transcription?.trim()) return { error: "no_transcription" };

  const analysis = analyzeTranscript({
    transcription: conversation.transcription,
    occurredAt: conversation.occurredAt,
  });
  updateDemoData((d) => {
    const target = d.conversations.find((c) => c.id === id);
    if (!target) return;
    target.analysis = analysis;
    target.analyzedAt = nowIso();
    target.updatedAt = nowIso();
  });
  return {};
}

/** Idempotent: a conversation only ever produces its tasks once. */
export function createTasksFromAnalysis(id: string): {
  error?: "no_analysis";
  alreadyCreated?: boolean;
  createdCount?: number;
} {
  const data = getDemoData();
  const existing = listTasksBySourceConversation(data, id);
  if (existing.length > 0) return { alreadyCreated: true, createdCount: existing.length };

  const conversation = data.conversations.find((c) => c.id === id);
  if (!conversation?.analysis) return { error: "no_analysis" };

  const suggested = conversation.analysis.suggestedTasks;
  if (suggested.length === 0) return { createdCount: 0 };

  const base = Date.now();
  updateDemoData((d) => {
    suggested.forEach((task, index) => {
      d.tasks.push(
        buildTask(
          {
            leadId: conversation.leadId,
            name: task.name,
            notes: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            sourceConversationId: id,
          },
          new Date(base + index).toISOString()
        )
      );
    });
  });
  return { createdCount: suggested.length };
}

/**
 * Stores the result of a simulated audio "transcription": the file itself
 * never leaves the browser, only its name is remembered, and the transcript
 * is one of the prepared samples — then the same analysis runs automatically.
 */
export function saveSimulatedAudioTranscription(
  id: string,
  filename: string,
  transcription: string
): void {
  updateDemoData((d) => {
    const conversation = d.conversations.find((c) => c.id === id);
    if (!conversation) return;
    conversation.audioOriginalFilename = filename;
    conversation.audioUploadedAt = nowIso();
    conversation.transcription = transcription;
    conversation.analysis = analyzeTranscript({
      transcription,
      occurredAt: conversation.occurredAt,
    });
    conversation.analyzedAt = nowIso();
    conversation.updatedAt = nowIso();
  });
}

export function deleteConversation(id: string): void {
  updateDemoData((d) => {
    d.conversations = d.conversations.filter((c) => c.id !== id);
    // tasks.source_conversation_id is ON DELETE SET NULL in the schema.
    for (const task of d.tasks) {
      if (task.sourceConversationId === id) task.sourceConversationId = undefined;
    }
  });
}

// ---------------------------------------------------------------------------
// Website analysis (local sample generator)
// ---------------------------------------------------------------------------

/** Returns how long the caller should show the "analyzing" state before saving. */
export function prepareWebsiteAnalysis(
  leadId: string
): { error: "no_website" } | { delayMs: number; save: () => void } {
  const lead = getDemoData().leads.find((l) => l.id === leadId);
  if (!lead?.website) return { error: "no_website" };
  const url = lead.website;
  const { report, delayMs } = buildWebsiteReport({ url, name: lead.name, company: lead.company });
  return {
    delayMs,
    save: () =>
      updateDemoData((d) => {
        d.websiteAnalyses.push({
          id: newId(),
          leadId,
          userId: DEMO_USER_ID,
          url,
          report,
          createdAt: nowIso(),
        });
      }),
  };
}

// ---------------------------------------------------------------------------
// WhatsApp (fully simulated — no message is ever sent anywhere)
// ---------------------------------------------------------------------------

function pushMessage(
  d: DemoData,
  conversationId: string,
  message: Pick<WhatsAppMessage, "direction" | "body" | "isAiGenerated">,
  unread: boolean,
  createdAt = nowIso()
) {
  d.whatsappMessages.push({
    id: newId(),
    conversationId,
    userId: DEMO_USER_ID,
    providerMessageId: `demo_${newId()}`,
    createdAt,
    ...message,
  });
  const conversation = d.whatsappConversations.find((c) => c.id === conversationId);
  if (!conversation) return;
  conversation.lastMessageAt = createdAt;
  conversation.lastMessagePreview = message.body;
  conversation.lastMessageDirection = message.direction;
  conversation.unread = unread;
  conversation.updatedAt = createdAt;
}

/** Same best-effort enrichment the webhook flow runs after each incoming message. */
function enrichLeadFromThread(d: DemoData, leadId: string, conversationId: string) {
  const lead = d.leads.find((l) => l.id === leadId);
  if (!lead) return;
  const messages = listWhatsAppMessages(d, conversationId);
  const incomingTexts = messages.filter((m) => m.direction === "incoming").map((m) => m.body);
  if (incomingTexts.length === 0) return;

  // 1. Fill in blank profile fields only — never overwrite what's there.
  if (!lead.email) lead.email = extractEmail(incomingTexts);
  if (!lead.website) lead.website = extractWebsite(incomingTexts);
  if (!lead.company) lead.company = extractCompany(incomingTexts);

  // 2. One auto-summary note per conversation, updated in place.
  const analysis = analyzeTranscript({
    transcription: buildWhatsAppTranscript(messages),
    occurredAt: nowIso(),
  });
  const content = formatAutoNote(analysis);
  const existingNote = d.notes.find(
    (n) => n.leadId === leadId && n.content.startsWith(NOTE_MARKER)
  );
  if (existingNote) {
    existingNote.content = content;
  } else {
    d.notes.push({ id: newId(), leadId, userId: DEMO_USER_ID, content, createdAt: nowIso() });
  }

  // 3. Follow-up tasks, created once per conversation.
  const alreadyHasTasks = d.tasks.some((t) => t.sourceWhatsAppConversationId === conversationId);
  if (!alreadyHasTasks) {
    analysis.suggestedTasks.forEach((task) => {
      d.tasks.push(
        buildTask({
          leadId,
          name: task.name,
          notes: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          sourceWhatsAppConversationId: conversationId,
        })
      );
    });
  }
}

/**
 * "Simulate Incoming WhatsApp": matches or creates the lead + thread by phone
 * number, stores the incoming message, appends the local auto-reply and runs
 * the lead enrichment — the same steps as lib/whatsapp/handlers.ts.
 */
export function simulateIncomingWhatsApp(input: {
  name: string;
  phone: string;
  message: string;
}): string {
  const phone = input.phone.trim();
  let conversationId = "";

  updateDemoData((d) => {
    let conversation = d.whatsappConversations.find((c) => c.phoneNumber === phone);
    let lead = conversation
      ? d.leads.find((l) => l.id === conversation?.leadId)
      : d.leads.find((l) => l.phone === phone);

    const timestamp = nowIso();
    if (!lead) {
      lead = {
        id: newId(),
        userId: DEMO_USER_ID,
        name: input.name.trim() || phone,
        phone,
        source: "whatsapp",
        status: "new_lead",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      d.leads.push(lead);
    }
    if (!conversation) {
      conversation = {
        id: newId(),
        userId: DEMO_USER_ID,
        leadId: lead.id,
        phoneNumber: phone,
        lastMessageAt: timestamp,
        unread: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      d.whatsappConversations.push(conversation);
    }
    conversationId = conversation.id;

    pushMessage(
      d,
      conversation.id,
      { direction: "incoming", body: input.message.trim(), isAiGenerated: false },
      true,
      timestamp
    );

    const history = listWhatsAppMessages(d, conversation.id);
    const reply = generateWhatsAppReply({
      incomingText: input.message.trim(),
      lead: { name: lead.name, company: lead.company, status: lead.status },
      isFirstMessage: history.filter((m) => m.direction === "incoming").length <= 1,
      previousMessages: history,
    });
    pushMessage(
      d,
      conversation.id,
      { direction: "outgoing", body: reply, isAiGenerated: true },
      false,
      new Date(Date.parse(timestamp) + 1000).toISOString()
    );

    enrichLeadFromThread(d, lead.id, conversation.id);
    lead.updatedAt = nowIso();
  });

  return conversationId;
}

export function sendWhatsAppMessage(conversationId: string, body: string): void {
  updateDemoData((d) => {
    pushMessage(d, conversationId, { direction: "outgoing", body, isAiGenerated: false }, false);
  });
}

export function generateWhatsAppAiReply(conversationId: string): {
  error?: "not_found" | "no_incoming_message";
} {
  const data = getDemoData();
  const conversation = getWhatsAppConversation(data, conversationId);
  if (!conversation) return { error: "not_found" };
  const messages = listWhatsAppMessages(data, conversationId);
  const lastIncoming = [...messages].reverse().find((m) => m.direction === "incoming");
  if (!lastIncoming) return { error: "no_incoming_message" };

  const reply = generateWhatsAppReply({
    incomingText: lastIncoming.body,
    lead: {
      name: conversation.lead.name,
      company: conversation.lead.company,
      status: conversation.lead.status,
    },
    isFirstMessage: messages.filter((m) => m.direction === "incoming").length <= 1,
    previousMessages: messages,
  });
  updateDemoData((d) => {
    pushMessage(d, conversationId, { direction: "outgoing", body: reply, isAiGenerated: true }, false);
  });
  return {};
}

export function generateWhatsAppSummary(conversationId: string): {
  error?: "not_found" | "no_messages";
} {
  const data = getDemoData();
  const conversation = data.whatsappConversations.find((c) => c.id === conversationId);
  if (!conversation) return { error: "not_found" };
  const messages = listWhatsAppMessages(data, conversationId);
  if (messages.length === 0) return { error: "no_messages" };

  const analysis = analyzeTranscript({
    transcription: buildWhatsAppTranscript(messages),
    occurredAt: conversation.lastMessageAt,
  });
  updateDemoData((d) => {
    const target = d.whatsappConversations.find((c) => c.id === conversationId);
    if (!target) return;
    target.analysis = analysis;
    target.analyzedAt = nowIso();
  });
  return {};
}

export function markWhatsAppConversationRead(conversationId: string): void {
  const conversation = getDemoData().whatsappConversations.find((c) => c.id === conversationId);
  if (!conversation?.unread) return;
  updateDemoData((d) => {
    const target = d.whatsappConversations.find((c) => c.id === conversationId);
    if (target) target.unread = false;
  });
}

import { analyzeTranscript } from "@/lib/ai/conversation-analysis-core";
import { MOCK_SALES_CALL_HE } from "@/lib/mock/mock-sales-call";
import type {
  AiWebsiteAnalysis,
  Conversation,
  Deal,
  Lead,
  LeadNote,
  Meeting,
  Profile,
  Task,
  WhatsAppConversation,
  WhatsAppMessage,
} from "@/lib/types";

// The dataset a first-time demo visitor starts from. It is the project's
// existing synthetic sample data, not a new invention:
//
//  - Leads, notes, meetings, the deal and the WhatsApp thread are the same
//    fictional records scripts/seed-demo-data.mjs seeds into Supabase for
//    the "dana@example.com" demo account (keep the two in sync).
//  - The logged call uses the existing "Load Mock Sales Call" transcript
//    (lib/mock/mock-sales-call.ts); its analysis and the two follow-up tasks
//    are produced here by the same local analyzer and the same
//    "Create Tasks" rules the app uses — nothing is hand-written.
//
// Records that only ever existed in the hosted Supabase project (anything
// added by hand through the UI) are NOT reproduced here.
//
// Everything is fictional. No real customer data belongs in this file — it
// ships to every visitor's browser.

export const DEMO_DATA_VERSION = 1;
export const DEMO_USER_ID = "demo-user";

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  fullName: "דנה כהן",
  email: "dana@example.com",
  locale: "he",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export interface DemoData {
  version: number;
  seededAt: string;
  leads: Lead[];
  notes: LeadNote[];
  meetings: Meeting[];
  deals: Deal[];
  tasks: Task[];
  conversations: Conversation[];
  websiteAnalyses: AiWebsiteAnalysis[];
  whatsappConversations: WhatsAppConversation[];
  whatsappMessages: WhatsAppMessage[];
}

const HOUR = 3600_000;

export function buildSeedData(now: Date = new Date()): DemoData {
  const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * HOUR).toISOString();
  const seededAt = at(0);

  // --- leads (scripts/seed-demo-data.mjs -> seedLeadsFor("dana")) ---------
  const leadRows: (Pick<Lead, "id" | "name" | "source" | "status"> &
    Partial<Pick<Lead, "phone" | "email" | "company" | "website">>)[] = [
    {
      id: "demo-lead-avi",
      name: "אבי ישראלי",
      phone: "054-1112222",
      email: "avi@shop.co.il",
      company: "אבי דיגיטל",
      website: "https://avidigital.co.il",
      source: "website",
      status: "meeting_scheduled",
    },
    {
      id: "demo-lead-michal",
      name: "מיכל רון",
      phone: "050-3334444",
      email: "michal@ronbakery.co.il",
      company: "מאפיית רון",
      source: "referral",
      status: "new_lead",
    },
    {
      id: "demo-lead-omer",
      name: "עומר שגיא",
      phone: "053-5556666",
      email: "omer@sagaifit.co.il",
      company: "סגיא פיטנס",
      source: "social_media",
      status: "deal_closed",
    },
    {
      id: "demo-lead-roi",
      name: "רועי אלמוג",
      phone: "052-1234567",
      email: "roi@almogdigital.co.il",
      company: "Almog Digital – סוכנות דיגיטל",
      website: "https://almogdigital.co.il",
      source: "referral",
      status: "new_lead",
    },
    {
      id: "demo-lead-shira",
      name: "שירה בר",
      phone: "054-2345678",
      email: "shira@hashachar-bakery.co.il",
      company: "מאפיית השחר",
      website: "https://hashachar-bakery.co.il",
      source: "social_media",
      status: "new_lead",
    },
    {
      id: "demo-lead-yuval",
      name: "יובל כהן",
      phone: "050-3456789",
      email: "yuval@blueseafish.co.il",
      company: "מסעדת הים הכחול",
      website: "https://blueseafish-restaurant.co.il",
      source: "website",
      status: "meeting_scheduled",
    },
    {
      id: "demo-lead-moshe",
      name: "משה לוי",
      phone: "053-4567890",
      email: "moshe@levi-plumbing.co.il",
      company: "לוי אינסטלציה ושירותי בית",
      website: "https://levi-plumbing.co.il",
      source: "cold_call",
      status: "new_lead",
    },
  ];
  // A minute apart so the "recently updated first" ordering is stable.
  const leads: Lead[] = leadRows.map((row, index) => ({
    ...row,
    userId: DEMO_USER_ID,
    createdAt: at(-index / 60),
    updatedAt: at(-index / 60),
  }));

  const notes: LeadNote[] = [
    {
      id: "demo-note-avi-1",
      leadId: "demo-lead-avi",
      userId: DEMO_USER_ID,
      content: "דיברתי בטלפון - מעוניין בחבילת הפרסום החודשית. לשלוח הצעת מחיר.",
      createdAt: at(-0.2),
    },
    {
      id: "demo-note-avi-2",
      leadId: "demo-lead-avi",
      userId: DEMO_USER_ID,
      content: "קבע פגישת זום להצגת השירותים.",
      createdAt: at(-0.1),
    },
    {
      id: "demo-note-omer-1",
      leadId: "demo-lead-omer",
      userId: DEMO_USER_ID,
      content: "סגר עסקה על חבילת שנתית לאחר פגישה במשרד.",
      createdAt: at(-0.1),
    },
  ];

  const meetings: Meeting[] = [
    {
      id: "demo-meeting-avi",
      leadId: "demo-lead-avi",
      userId: DEMO_USER_ID,
      title: "שיחת היכרות - אבי ישראלי",
      scheduledAt: at(48),
      durationMinutes: 30,
      method: "zoom",
      locationOrLink: "https://zoom.us/j/1234567890",
      status: "scheduled",
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    {
      id: "demo-meeting-omer",
      leadId: "demo-lead-omer",
      userId: DEMO_USER_ID,
      title: "פגישת סגירה - עומר שגיא",
      scheduledAt: at(-8),
      durationMinutes: 45,
      method: "in_person",
      locationOrLink: "המשרד, רחוב הרצל 1, תל אביב",
      status: "completed",
      notes: "עומר אישר את החבילה השנתית וביקש חוזה חתום עד סוף השבוע.",
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ];

  const deals: Deal[] = [
    {
      id: "demo-deal-omer",
      leadId: "demo-lead-omer",
      userId: DEMO_USER_ID,
      title: "חבילה שנתית - סגיא פיטנס",
      value: 12000,
      currency: "ILS",
      productOrService: "ניהול רשתות חברתיות - חבילה שנתית",
      status: "won",
      closeDate: at(-5 * 24).slice(0, 10),
      notes: "תשלום ב-12 תשלומים.",
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ];

  // --- WhatsApp thread (scripts/seed-demo-data.mjs -> seedWhatsAppDemoFor) --
  const whatsappPhone = "+972521112223";
  leads.push({
    id: "demo-lead-daniel",
    userId: DEMO_USER_ID,
    name: "דניאל כהן",
    phone: whatsappPhone,
    source: "whatsapp",
    status: "new_lead",
    createdAt: at(-1),
    updatedAt: at(-1),
  });
  const incomingText = "Hi, I'm interested in your service. Can you send me some information?";
  const whatsappConversations: WhatsAppConversation[] = [
    {
      id: "demo-wa-daniel",
      userId: DEMO_USER_ID,
      leadId: "demo-lead-daniel",
      phoneNumber: whatsappPhone,
      lastMessageAt: at(-1),
      lastMessagePreview: incomingText,
      lastMessageDirection: "incoming",
      unread: false,
      createdAt: at(-1),
      updatedAt: at(-1),
    },
  ];
  const whatsappMessages: WhatsAppMessage[] = [
    {
      id: "demo-wa-daniel-1",
      conversationId: "demo-wa-daniel",
      userId: DEMO_USER_ID,
      direction: "incoming",
      isAiGenerated: false,
      body: incomingText,
      createdAt: at(-1),
    },
    {
      id: "demo-wa-daniel-2",
      conversationId: "demo-wa-daniel",
      userId: DEMO_USER_ID,
      direction: "outgoing",
      isAiGenerated: true,
      body: "Hi Daniel, thanks for reaching out! We'd love to help — could you tell me a bit more about what you're looking for?",
      createdAt: at(-0.95),
    },
  ];

  // --- a logged call built from the existing mock sales-call scenario ------
  const callAt = at(-26);
  const analysis = analyzeTranscript({ transcription: MOCK_SALES_CALL_HE, occurredAt: callAt });
  const conversations: Conversation[] = [
    {
      id: "demo-conversation-moshe",
      leadId: "demo-lead-moshe",
      userId: DEMO_USER_ID,
      occurredAt: callAt,
      durationMinutes: 12,
      direction: "outgoing",
      transcription: MOCK_SALES_CALL_HE,
      analysis,
      analyzedAt: at(-25.9),
      createdAt: callAt,
      updatedAt: at(-25.9),
    },
  ];
  // Same mapping createTasksFromAnalysisAction applies to suggested tasks.
  const tasks: Task[] = analysis.suggestedTasks.map((suggested, index) => ({
    id: `demo-task-moshe-${index + 1}`,
    leadId: "demo-lead-moshe",
    userId: DEMO_USER_ID,
    name: suggested.name,
    status: "new",
    priority: suggested.priority,
    dueDate: suggested.dueDate,
    notes: suggested.description,
    sourceConversationId: "demo-conversation-moshe",
    createdAt: at(-25.8 + index / 60),
    updatedAt: at(-25.8 + index / 60),
  }));

  return {
    version: DEMO_DATA_VERSION,
    seededAt,
    leads,
    notes,
    meetings,
    deals,
    tasks,
    conversations,
    websiteAnalyses: [],
    whatsappConversations,
    whatsappMessages,
  };
}

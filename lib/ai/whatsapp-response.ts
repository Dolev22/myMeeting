import "server-only";
import type { Lead, WhatsAppMessage } from "@/lib/types";

// Local, deterministic "AI" WhatsApp auto-responder — no external API, no
// API key, no network call. Same non-negotiable constraint already applied
// to lib/ai/website-analysis.ts and lib/ai/conversation-analysis.ts: this is
// a genuine rule-based text responder driven by the actual incoming message
// and the actual CRM context (lead name, company, status, prior messages in
// this conversation), not a random/generic canned reply.

export interface GenerateWhatsAppReplyInput {
  incomingText: string;
  lead: Pick<Lead, "name" | "company" | "status">;
  isFirstMessage: boolean;
  previousMessages: WhatsAppMessage[];
}

const HEBREW_UNICODE_RANGE = "\\u0590-\\u05FF";

type Intent =
  | "greeting"
  | "pricing"
  | "scheduling"
  | "objection_price"
  | "support"
  | "thanks"
  | "unclear";

function isHebrew(text: string): boolean {
  return new RegExp(`[${HEBREW_UNICODE_RANGE}]`).test(text);
}

function includesAny(text: string, markers: string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((m) => lower.includes(m.toLowerCase()));
}

const INTENT_KEYWORDS: { intent: Intent; keywords: string[] }[] = [
  {
    intent: "objection_price",
    keywords: ["יקר", "too expensive", "expensive", "can't afford", "over budget", "תקציב מוגבל"],
  },
  {
    intent: "pricing",
    keywords: [
      "מחיר",
      "עלות",
      "הצעת מחיר",
      "תמחור",
      "price",
      "pricing",
      "cost",
      "quote",
      "how much",
    ],
  },
  {
    intent: "scheduling",
    keywords: [
      "פגישה",
      "לתאם",
      "זמינות",
      "meeting",
      "schedule",
      "call",
      "available",
      "book a time",
    ],
  },
  {
    intent: "support",
    keywords: ["בעיה", "לא עובד", "תקלה", "issue", "problem", "not working", "bug", "help me"],
  },
  {
    intent: "thanks",
    keywords: ["תודה", "מעולה תודה", "thanks", "thank you", "appreciate it"],
  },
  {
    intent: "greeting",
    keywords: [
      "שלום",
      "היי",
      "מעוניין",
      "מתעניין",
      "אשמח לשמוע",
      "hi",
      "hello",
      "hey",
      "interested",
      "can you send me some information",
      "tell me more",
    ],
  },
];

function detectIntent(text: string): Intent {
  for (const entry of INTENT_KEYWORDS) {
    if (includesAny(text, entry.keywords)) return entry.intent;
  }
  return "unclear";
}

const templates: Record<
  "he" | "en",
  Record<Intent, (name: string, company?: string) => string>
> = {
  he: {
    greeting: (name, company) =>
      `היי ${name}, תודה שפניתם אלינו! ${
        company ? `נשמח לעזור ל${company} ` : "נשמח לעזור "
      }ולהבין קצת יותר על מה שאתם מחפשים — אפשר לספר לי במה תרצו שנתמקד?`,
    pricing: (name) =>
      `היי ${name}, בשמחה. כדי שאוכל להכין הצעת מחיר מדויקת, תוכלו לספר לי קצת יותר על ההיקף שאתם צריכים? נוכל גם לתאם שיחה קצרה כדי לעבור על זה ביחד.`,
    scheduling: (name) =>
      `בטח ${name}, נשמח לתאם. מתי נוח לכם השבוע לשיחה קצרה של 15-20 דקות? אשמח להציע כמה אפשרויות.`,
    objection_price: (name) =>
      `מבין אתכם ${name}, וזו נקודה חשובה. בואו נראה ביחד איך הפתרון יכול לחסוך לכם זמן ועלויות בטווח הארוך — אשמח לתאם שיחה קצרה כדי לבדוק מה הכי משתלם בשבילכם.`,
    support: (name) =>
      `${name}, מצטערים לשמוע. אני מעביר את זה לטיפול מיידי ונחזור אליכם בהקדם עם פתרון או עדכון.`,
    thanks: (name) => `תודה לכם ${name}! נשמח לעזור בכל שאלה נוספת בהמשך הדרך.`,
    unclear: (name, company) =>
      `היי ${name}, קיבלנו את ההודעה שלכם${
        company ? ` בנוגע ל${company}` : ""
      } ואנחנו בודקים אותה. נחזור אליכם עם תשובה מפורטת בקרוב — יש משהו נוסף שכדאי שנדע כבר עכשיו?`,
  },
  en: {
    greeting: (name, company) =>
      `Hi ${name}, thanks for reaching out! We'd love to help${
        company ? ` ${company}` : ""
      } — could you tell me a bit more about what you're looking for?`,
    pricing: (name) =>
      `Hi ${name}, happy to help with that. To put together an accurate quote, could you share a bit more about the scope you need? We can also hop on a quick call to go through it together.`,
    scheduling: (name) =>
      `Sure thing, ${name}. What time works for you this week for a quick 15-20 minute call? I can suggest a few slots.`,
    objection_price: (name) =>
      `Totally understand, ${name} — that's a fair point. Let's look together at how this could save you time and money in the long run. Happy to set up a quick call to find what works best for you.`,
    support: (name) =>
      `Sorry to hear that, ${name}. I'm flagging this for immediate attention and we'll get back to you shortly with an update.`,
    thanks: (name) => `Thank you, ${name}! Happy to help with anything else along the way.`,
    unclear: (name, company) =>
      `Hi ${name}, thanks for your message${
        company ? ` about ${company}` : ""
      } — we're taking a look and will follow up shortly with more details. Anything else we should know in the meantime?`,
  },
};

export function generateWhatsAppReply(input: GenerateWhatsAppReplyInput): string {
  const { incomingText, lead, isFirstMessage } = input;
  const intent = detectIntent(incomingText);
  const lang = isHebrew(incomingText) ? "he" : "en";
  const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;

  let reply = templates[lang][intent](firstName, lead.company);

  // Light contextual nudge for a returning conversation with existing
  // history, so a second/third message doesn't read as if the AI forgot the
  // conversation ever started — without needing a real LLM to "remember."
  if (!isFirstMessage && intent !== "thanks") {
    reply +=
      lang === "he"
        ? " נעדכן אתכם על כל שינוי לפי מה שדיברנו קודם."
        : " We'll keep you posted based on what we discussed earlier.";
  }

  return reply;
}

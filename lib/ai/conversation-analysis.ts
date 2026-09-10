import "server-only";
import type { ConversationAnalysis, SalesStage, SuggestedTask, TaskPriority } from "@/lib/types";

// Local, deterministic "AI Conversation Analysis" — no external API, no API
// key, no network call. Same non-negotiable constraint this project already
// applied to the AI Website Analysis feature (see lib/ai/website-analysis.ts).
//
// Unlike the website analysis (which has no real page content to read and
// so picks from curated content pools via a seeded PRNG), a conversation
// transcript IS real text — so this is a genuine rule-based text analyzer:
// it parses "נציג:" / "לקוח:" speaker turns and scans for Hebrew keyword
// patterns (needs, objections, commitments, dates) to build the structured
// report from the actual transcript content. Same output for the same
// transcript every time; nothing here is random.

export interface AnalyzeConversationInput {
  transcription: string;
  occurredAt: string; // ISO timestamp the conversation happened, used as the
  // reference point for relative dates like "tomorrow" / "next Sunday".
}

interface Turn {
  speaker: "rep" | "customer" | "unknown";
  text: string;
}

const REP_PREFIX = /^(נציג(?:ת)?(?:\s*מכירות)?|איש מכירות|rep|sales(?:\s*rep)?)\s*[:：]\s*/i;
const CUSTOMER_PREFIX = /^(לקוח(?:ה)?|customer|client)\s*[:：]\s*/i;

function parseTurns(transcription: string): Turn[] {
  return transcription
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (REP_PREFIX.test(line)) {
        return { speaker: "rep" as const, text: line.replace(REP_PREFIX, "").trim() };
      }
      if (CUSTOMER_PREFIX.test(line)) {
        return { speaker: "customer" as const, text: line.replace(CUSTOMER_PREFIX, "").trim() };
      }
      return { speaker: "unknown" as const, text: line };
    });
}

function includesAny(text: string, markers: string[]): boolean {
  return markers.some((m) => text.includes(m));
}

function uniqueCapped(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
    if (result.length >= cap) break;
  }
  return result;
}

// --- topics -------------------------------------------------------------

const TOPIC_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "תמחור ותקציב", keywords: ["מחיר", "עלות", "תקציב", "הצעת מחיר", "תשלום", "שקל"] },
  { label: "השוואה מול פתרון קיים / מתחרים", keywords: ["מתחר", "ספק אחר", "פתרון אחר", "אקסל"] },
  { label: "הטמעה ואונבורדינג", keywords: ["הטמעה", "onboarding", "להתחיל לעבוד", "הדרכה"] },
  { label: "אינטגרציה טכנית", keywords: ["אינטגרצי", "api", "וואטסאפ", "מערכת קיימת"] },
  { label: "תמיכה ושירות", keywords: ["תמיכה", "שירות לקוחות", "זמינות"] },
  { label: "תנאי התקשרות / חוזה", keywords: ["חוזה", "הסכם", "לחתום"] },
  { label: "דוחות ומעקב ביצועים", keywords: ["דוח", "דשבורד", "תמונה כוללת", "מעקב"] },
  { label: "החלטת רכישה משותפת", keywords: ["השותף", "מקבל החלטות", "אישור מ"] },
];

function extractTopics(fullText: string): string[] {
  const topics: string[] = [];
  for (const entry of TOPIC_KEYWORDS) {
    if (includesAny(fullText, entry.keywords)) topics.push(entry.label);
  }
  return topics;
}

// --- needs / pain points --------------------------------------------------

const NEED_MARKERS = [
  "אנחנו צריכים",
  "צריכים",
  "מתקשים",
  "הבעיה",
  "גוזל לנו",
  "לוקח לנו זמן",
  "ידני",
  "טעויות",
  "מאבדים",
  "קשה לנו",
  "אין לנו",
  "חסר לנו",
  "לא רואים",
  "נשכח",
  "שוכחים",
];

// --- objections / red flags ----------------------------------------------

const OBJECTION_MARKERS = [
  "יקר",
  "התקציב מוגבל",
  "צריך לבדוק מול",
  "אצטרך לבדוק מול",
  "צריך לחשוב על זה",
  "מתלבטים",
  "כבר יש לנו ספק",
  "לא בטוח",
  "צריך אישור",
  "בלי האישור",
  "קשה לי להתחייב",
  "לא יכול להתחייב",
];

// --- commitments ------------------------------------------------------

const CUSTOMER_COMMIT_MARKERS = [
  "אני אבדוק",
  "נבדוק",
  "נחזור אליכם",
  "אני אעביר",
  "אדבר עם",
  "אני אתאם",
  "נאשר",
  "נסגור",
];

const REP_COMMIT_MARKERS = [
  "אני אשלח",
  "אני אכין",
  "אני אדאג",
  "נעביר לך",
  "אקבע",
  "אחזור אליך",
  "אשלח לך",
  "אני אתקשר",
  "אני אוודא",
  "נטפל בזה",
];

// --- sales stage ----------------------------------------------------------

const STAGE_SIGNALS: { stage: SalesStage; keywords: string[] }[] = [
  { stage: "closing", keywords: ["לחתום", "לסגור את העסקה", "לאשר את ההזמנה", "מוכנים להתחיל"] },
  { stage: "negotiation", keywords: OBJECTION_MARKERS },
  { stage: "proposal", keywords: ["הצעת מחיר", "הצעת המחיר", "תמחור", "עלות", "מחיר"] },
  {
    stage: "solution_presentation",
    keywords: ["אדגים", "הדגמה", "דמו", "להראות לכם", "הפתרון שלנו", "המערכת שלנו"],
  },
];

function detectStage(fullText: string): SalesStage {
  for (const entry of STAGE_SIGNALS) {
    if (includesAny(fullText, entry.keywords)) return entry.stage;
  }
  return "discovery";
}

// --- due-date extraction ---------------------------------------------------

const HEBREW_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekday(base: Date, weekdayName: string): string | undefined {
  const targetIndex = HEBREW_WEEKDAYS.indexOf(weekdayName);
  if (targetIndex === -1) return undefined;
  const currentIndex = base.getDay(); // 0 = Sunday, matches HEBREW_WEEKDAYS order
  let diff = targetIndex - currentIndex;
  if (diff <= 0) diff += 7;
  return addDays(base, diff);
}

function extractDueDate(sentence: string, base: Date): string | undefined {
  if (sentence.includes("מחרתיים")) return addDays(base, 2);
  if (sentence.includes("מחר")) return addDays(base, 1);
  if (sentence.includes("היום")) return addDays(base, 0);
  const weekdayMatch = sentence.match(/יום (ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/);
  if (weekdayMatch) return nextWeekday(base, weekdayMatch[1]);
  if (sentence.includes("בשבוע הבא") || sentence.includes("השבוע הבא")) return addDays(base, 7);
  if (sentence.includes("עד סוף השבוע")) return nextWeekday(base, "שישי");
  return undefined;
}

function taskPriorityFor(sentence: string): TaskPriority {
  if (includesAny(sentence, ["הצעת מחיר", "חוזה", "הסכם"])) return "high";
  return "medium";
}

// --- main entry point -------------------------------------------------------

export async function analyzeConversation(
  input: AnalyzeConversationInput
): Promise<ConversationAnalysis> {
  const transcription = input.transcription.trim();
  if (!transcription) {
    throw new Error("Cannot analyze an empty transcription");
  }

  // Simulated "processing time" so the loading state reads as a real analysis.
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.floor(Math.random() * 500)));

  const turns = parseTurns(transcription);
  const fullText = transcription;
  const baseDate = new Date(input.occurredAt);
  const customerTurns = turns.filter((t) => t.speaker === "customer");
  const repTurns = turns.filter((t) => t.speaker === "rep");

  const keyTopics = extractTopics(fullText);

  const customerNeeds = uniqueCapped(
    customerTurns.filter((t) => includesAny(t.text, NEED_MARKERS)).map((t) => t.text),
    6
  );

  const redFlags = uniqueCapped(
    customerTurns.filter((t) => includesAny(t.text, OBJECTION_MARKERS)).map((t) => t.text),
    5
  );

  const customerCommitments = uniqueCapped(
    customerTurns.filter((t) => includesAny(t.text, CUSTOMER_COMMIT_MARKERS)).map((t) => t.text),
    5
  );

  const repCommitTurns = repTurns.filter((t) => includesAny(t.text, REP_COMMIT_MARKERS));
  const repCommitments = uniqueCapped(repCommitTurns.map((t) => t.text), 5);

  const suggestedTasks: SuggestedTask[] = uniqueCapped(
    repCommitTurns.map((t) => t.text),
    5
  ).map((text) => ({
    name: text,
    dueDate: extractDueDate(text, baseDate) ?? addDays(baseDate, 3),
    priority: taskPriorityFor(text),
    owner: "rep" as const,
  }));

  const recommendedNextSteps = uniqueCapped(
    [
      ...suggestedTasks.map((t) => t.name),
      ...(customerCommitments.length === 0 && repCommitments.length === 0
        ? ["לתאם שיחת המשך תוך מספר ימים כדי לקדם את התהליך."]
        : []),
    ],
    5
  );

  const recommendedStage = detectStage(fullText);

  const summaryParts = [
    `נותחו ${turns.length} שורות שיחה (${customerTurns.length} מהלקוח, ${repTurns.length} מהנציג).`,
    `זוהו ${keyTopics.length} נושאים מרכזיים, ${customerNeeds.length} צרכים/נקודות כאב, ${customerCommitments.length} התחייבויות מצד הלקוח ו-${repCommitments.length} התחייבויות מצד הנציג.`,
  ];
  if (redFlags.length > 0) {
    summaryParts.push(`אותרו ${redFlags.length} דגלים אדומים שדורשים תשומת לב לפני ההמשך.`);
  }

  return {
    summary: summaryParts.join(" "),
    keyTopics,
    customerNeeds,
    customerCommitments,
    repCommitments,
    recommendedNextSteps,
    redFlags,
    recommendedStage,
    suggestedTasks,
  };
}

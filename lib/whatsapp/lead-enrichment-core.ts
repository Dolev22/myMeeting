import type { ConversationAnalysis } from "@/lib/types";

// Pure text helpers behind the automatic WhatsApp lead enrichment — what it
// extracts from the customer's messages and how the auto-summary note is
// formatted. No "server-only", no database access, so the server-side
// enrichment (lib/whatsapp/lead-enrichment.ts) and the browser-only demo
// mode apply exactly the same rules.

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_REGEX = /\bhttps?:\/\/[^\s,)"']+|\bwww\.[^\s,)"']+\.[a-z]{2,}[^\s,)"']*/i;
// Trailing sentence punctuation a URL/company match can pick up when it sits
// at the end of a clause ("...our site is acme.com."), stripped afterward
// rather than excluded from the character classes above (which still need
// to allow "." *inside* a domain/company name).
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

// Best-effort self-introduction patterns ("I'm from Acme Corp", "בחברת אקמי").
// Freeform chat text has no reliable structure, so this only fills the
// field when a common phrasing is matched — it never guesses, and it never
// overwrites a company the lead already has on file. The capture group is
// word-based (a handful of space-separated words, no sentence punctuation)
// so it stops at the company name instead of running on into the rest of
// the sentence.
const HEB = "\\u0590-\\u05FF";
const COMPANY_PATTERNS = [
  new RegExp(
    `(?:אני\\s+(?:עובד|עובדת)\\s+ב-?|מחברת\\s+|בחברת\\s+|החברה שלי (?:נקראת|היא)\\s+)([${HEB}\\w][${HEB}\\w'-]*(?:[ \\t][${HEB}\\w'-]+){0,3})`
  ),
  /\b(?:i work at|i'm from|i am from|we're from|we are from)\s+([A-Z][\w&'-]*(?:[ \t][A-Z]?[\w&'-]+){0,3})/i,
];

export function extractEmail(texts: string[]): string | undefined {
  for (const text of texts) {
    const match = text.match(EMAIL_REGEX);
    if (match) return match[0];
  }
  return undefined;
}

export function extractWebsite(texts: string[]): string | undefined {
  for (const text of texts) {
    const match = text.match(URL_REGEX);
    if (!match) continue;
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return undefined;
}

export function extractCompany(texts: string[]): string | undefined {
  for (const text of texts) {
    for (const pattern of COMPANY_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim().replace(TRAILING_PUNCTUATION, "");
    }
  }
  return undefined;
}

export const NOTE_MARKER = "[וואטסאפ · סיכום אוטומטי]";

export function formatAutoNote(analysis: ConversationAnalysis): string {
  const lines = [NOTE_MARKER, "", analysis.summary];
  if (analysis.customerNeeds.length > 0) {
    lines.push("", "צרכי הלקוח:", ...analysis.customerNeeds.map((n) => `• ${n}`));
  }
  if (analysis.keyTopics.length > 0) {
    lines.push("", "נושאים מרכזיים:", ...analysis.keyTopics.map((t) => `• ${t}`));
  }
  lines.push("", `שלב מכירה מומלץ: ${analysis.recommendedStage}`);
  return lines.join("\n");
}

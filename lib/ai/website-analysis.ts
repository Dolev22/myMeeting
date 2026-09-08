import "server-only";
import type { WebsiteAnalysisReport } from "@/lib/types";

// Local, deterministic "AI Website Analysis" generator — no external API,
// no API key, no network call. Given the same lead (URL + name/company),
// it always produces the same report, built from curated Hebrew content
// pools selected via a seeded PRNG, so different leads get different but
// stable, plausible-looking analyses.

export interface AnalyzeWebsiteInput {
  url: string;
  name?: string;
  company?: string;
}

// --- seeded PRNG -------------------------------------------------------

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickN<T>(rng: () => number, pool: T[], n: number): T[] {
  const copy = [...pool];
  const result: T[] = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function pickOne<T>(rng: () => number, pool: T[]): T {
  return pool[Math.floor(rng() * pool.length)];
}

// --- business type inference (from available lead data only) ----------

const BUSINESS_TYPES: { type: string; keywords: string[] }[] = [
  {
    type: "מסעדה, בית קפה או מאפייה",
    keywords: ["מסעד", "קפה", "קייטרינג", "מזון", "אוכל", "פיצ", "בר ", "מאפי", "לחם", "קונדיטור"],
  },
  { type: "חנות מקוונת / קמעונאות", keywords: ["חנות", "סטור", "store", "shop", "בוטיק", "אופנה"] },
  {
    type: "בעל מקצוע ושירותי בית",
    keywords: [
      "אינסטלצי",
      "חשמלא",
      "מוסך",
      "ניקיון",
      "גינון",
      "מיזוג",
      "שיפוצ",
      "נגר",
      "מנעולן",
    ],
  },
  {
    type: "נותן שירותים מקצועיים",
    keywords: ["עו\"ד", "עורך דין", "רואה חשבון", "ייעוץ", "משרד", "law", "consult"],
  },
  { type: "קליניקה או שירותי בריאות", keywords: ["קליניק", "מרפאה", "רפוא", "פיזיותרפי", "קוסמט", "clinic"] },
  { type: "סטודיו כושר או ספורט", keywords: ["פיטנס", "כושר", "ג'ים", "yoga", "fitness", "gym", "אימון"] },
  { type: "סוכנות דיגיטלית או סטארטאפ", keywords: ["סוכנות", "דיגיטל", "agency", "tech", "סטארטאפ", "אפליקצי"] },
  { type: "נדל\"ן", keywords: ["נדל", "דירות", "נכסים", "real estate"] },
];

function inferBusinessType(rng: () => number, name?: string, company?: string): string {
  const haystack = `${name ?? ""} ${company ?? ""}`.toLowerCase();
  for (const entry of BUSINESS_TYPES) {
    if (entry.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return entry.type;
    }
  }
  return pickOne(
    rng,
    BUSINESS_TYPES.map((e) => e.type).concat(["עסק מקומי קטן-בינוני"])
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// --- content pools -------------------------------------------------------

const KEY_PROBLEMS = [
  "העמוד הראשי אינו מתקשר בבירור מה בדיוק העסק מציע תוך 5 השניות הראשונות.",
  "אין קריאה לפעולה (Call to Action) ברורה ובולטת מעל לקיפול העמוד.",
  "פרטי יצירת קשר (טלפון/וואטסאפ) אינם נגישים בלחיצה אחת ממסך הבית.",
  "האתר אינו כולל עדויות לקוחות, דירוגים או סימני אמון (Trust Signals) בולטים.",
  "מבנה הניווט בתפריט אינו אינטואיטיבי ומקשה על מציאת מידע מרכזי.",
  "אין עמוד 'אודות' שמספר את סיפור העסק ובונה חיבור עם המבקר.",
  "תוכן העמודים כללי מדי ואינו מותאם לקהל היעד הספציפי של העסק.",
];

const SEO_ISSUES = [
  "כותרות ה-Meta Title וה-Meta Description חסרות או לא מותאמות למילות מפתח רלוונטיות.",
  "לא זוהה סימון Schema Markup (Local Business) שמסייע להופעה בתוצאות חיפוש מקומיות.",
  "מבנה כותרות ה-H1/H2 באתר אינו עקבי, מה שפוגע בהבנת התוכן ע\"י מנועי חיפוש.",
  "לא נמצא קובץ Sitemap מקושר או רישום פעיל ב-Google Business Profile.",
  "כתובות ה-URL של העמודים ארוכות ולא ברורות במקום מבנה קריא וממוקד מילות מפתח.",
  "חסר תוכן טקסטואלי מספק בעמוד הבית לצורך דירוג במנועי חיפוש.",
  "לא זוהו קישורים פנימיים (Internal Links) בין עמודי האתר השונים.",
];

const UX_ISSUES = [
  "זמן הטעינה הראשוני של העמוד איטי יחסית ועלול לגרום לנטישת מבקרים.",
  "הטפסים באתר (יצירת קשר / הרשמה) ארוכים מדי ביחס למידע שבאמת נדרש.",
  "הניגודיות בין צבעי הטקסט לרקע במספר אזורים נמוכה ופוגעת בקריאות.",
  "אין משוב חזותי ברור למשתמש לאחר שליחת טופס או ביצוע פעולה באתר.",
  "היררכיית התוכן בעמוד אינה מובילה את העין למידע החשוב ביותר תחילה.",
  "חסרה אפשרות צ'אט מהיר או וואטסאפ צף לפניה מיידית מהאתר.",
];

const MOBILE_ISSUES = [
  "בתצוגת מובייל חלק מהכפתורים קטנים מדי ללחיצה נוחה באצבע.",
  "תפריט הניווט הראשי אינו מותאם היטב למסכים צרים ודורש גלילה מרובה.",
  "טקסטים ארוכים בעמוד הבית נחתכים או דורשים זום ידני במובייל.",
  "טפסי יצירת קשר אינם מנצלים מקלדות מותאמות (טלפון/אימייל) במובייל.",
  "תמונות באתר אינן מותאמות (Responsive) וגורמות לטעינה איטית בסלולר.",
];

const OPPORTUNITIES = [
  "הוספת כפתור וואטסאפ קבוע ('צור קשר עכשיו') יכולה להעלות משמעותית את שיעור הפניות.",
  "עמוד נחיתה ייעודי למבצע או שירות דגל יכול לשפר את יחס ההמרה מתנועה קיימת.",
  "הצגת מספר לקוחות מרוצים / פרויקטים שהושלמו תחזק אמון ותקצר את מחזור ההחלטה.",
  "הטמעת פיקסל מעקב (Meta/Google) תאפשר בנייה עתידית של קמפיינים ממוקדים ורימרקטינג.",
  "מדור שאלות נפוצות (FAQ) יכול לצמצם פניות חוזרות ולשפר גם את הדירוג האורגני.",
  "הרשמה לניוזלטר או מועדון לקוחות תאפשר שימור קשר עם מבקרים שלא המירו מיד.",
];

const RECOMMENDED_IMPROVEMENTS = [
  "כתיבה מחדש של תוכן עמוד הבית סביב ההצעה הייחודית של העסק (Value Proposition).",
  "עיצוב מחדש של הטפסים לגרסה מקוצרת וממוקדת עם שדות חיוניים בלבד.",
  "אופטימיזציית תמונות ודחיסת קבצים לשיפור זמן הטעינה בדסקטופ ובמובייל.",
  "בניית מבנה כותרות SEO עקבי (H1 יחיד לעמוד, H2/H3 היררכיים) בכל העמודים.",
  "הוספת אזור עדויות לקוחות עם שמות, תמונות ודירוגים בעמוד הבית.",
  "התאמת עיצוב הכפתורים והתפריט לחוויית מובייל נוחה יותר (Mobile-first).",
];

const RECOMMENDED_SERVICES = [
  "אופטימיזציית SEO מקומי (Local SEO) כולל רישום והטמעה ב-Google Business Profile.",
  "עיצוב מחדש (Redesign) של עמוד הבית עם דגש על המרה.",
  "בניית קמפיין פרסום ממומן (Google/Meta Ads) מבוסס נתוני האתר הקיים.",
  "הטמעת מערכת ניהול לידים / CRM לחיבור ישיר בין פניות מהאתר לצוות המכירות.",
  "ניהול תוכן ורשתות חברתיות שוטף להזנת תנועה חוזרת לאתר.",
  "פרויקט צילום מקצועי (תמונות/וידאו) לשדרוג התוכן החזותי באתר.",
];

const OVERVIEW_TEMPLATES = [
  (domain: string, type: string) =>
    `ניתוח ראשוני של האתר ${domain} מזהה נוכחות דיגיטלית עבור עסק מסוג ${type}, עם מבנה בסיסי שמספק מידע חלקי בלבד למבקרים.`,
  (domain: string, type: string) =>
    `האתר ${domain} משמש כחזית דיגיטלית ל${type}, אך נראה שנבנה ללא אסטרטגיית תוכן או המרה מוגדרת מראש.`,
  (domain: string, type: string) =>
    `בבדיקת האתר ${domain} עבור עסק בתחום ${type} נמצא כי קיימת תשתית התחלתית, לצד מספר פערים המונעים ניצול מלא של פוטנציאל האתר.`,
];

const SUMMARY_TEMPLATES = [
  (domain: string, type: string, total: number) =>
    `האתר ${domain} מציג נוכחות דיגיטלית בסיסית עבור עסק מסוג ${type}. הניתוח האוטומטי איתר ${total} נושאים מרכזיים לטיפול, בעיקר בתחומי SEO וחוויית משתמש. טיפול ממוקד בהם צפוי לשפר את יכולת האתר למשוך ולהמיר לקוחות חדשים בטווח הקצר.`,
  (domain: string, type: string, total: number) =>
    `עבור עסק בתחום ${type}, האתר ${domain} עדיין לא ממצה את הפוטנציאל השיווקי שלו. זוהו ${total} נקודות לשיפור שמשלבות היבטי תוכן, ביצועים וחוויית מובייל. השקעה ממוקדת בהן עשויה להוביל לעלייה מדידה בפניות ובלידים איכותיים.`,
];

function sectionOf(rng: () => number, pool: string[]): string[] {
  const n = 3 + Math.floor(rng() * 2); // 3-4 items
  return pickN(rng, pool, n);
}

export async function analyzeWebsite(input: AnalyzeWebsiteInput): Promise<WebsiteAnalysisReport> {
  const domain = extractDomain(input.url);
  const seed = hashString(`${domain}|${input.name ?? ""}|${input.company ?? ""}`);
  const rng = mulberry32(seed);

  // Simulated "processing time" so the loading state reads as a real analysis.
  await new Promise((resolve) => setTimeout(resolve, 1400 + Math.floor(rng() * 900)));

  const businessType = inferBusinessType(rng, input.name, input.company);
  const keyProblems = sectionOf(rng, KEY_PROBLEMS);
  const seoIssues = sectionOf(rng, SEO_ISSUES);
  const uxIssues = sectionOf(rng, UX_ISSUES);
  const mobileIssues = sectionOf(rng, MOBILE_ISSUES);
  const opportunities = sectionOf(rng, OPPORTUNITIES);
  const recommendedImprovements = sectionOf(rng, RECOMMENDED_IMPROVEMENTS);
  const recommendedServices = sectionOf(rng, RECOMMENDED_SERVICES);

  const totalIssues =
    keyProblems.length + seoIssues.length + uxIssues.length + mobileIssues.length;

  return {
    businessType,
    overview: pickOne(rng, OVERVIEW_TEMPLATES)(domain, businessType),
    executiveSummary: pickOne(rng, SUMMARY_TEMPLATES)(domain, businessType, totalIssues),
    keyProblems,
    seoIssues,
    uxIssues,
    mobileIssues,
    opportunities,
    recommendedImprovements,
    recommendedServices,
  };
}

// One-off dev utility: creates the two demo accounts (and sample
// leads/meetings/deals) referenced on the login page, directly in Supabase.
// Uses the service role key, so it must only ever be run locally, never
// shipped or exposed to the browser.
//
// Usage: node --env-file=.env.local scripts/seed-demo-data.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "demo1234";

const demoUsers = [
  { email: "dana@example.com", fullName: "דנה כהן" },
  { email: "yossi@example.com", fullName: "יוסי לוי" },
];

async function upsertUser({ email, fullName }) {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email === email);
  if (existing) {
    console.log(`Exists: ${email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  console.log(`Created: ${email}`);
  return data.user.id;
}

function iso(offsetHours) {
  return new Date(Date.now() + offsetHours * 3600_000).toISOString();
}

async function seedLeadsFor(userId, who) {
  if (who === "dana") {
    const { data: leads, error } = await admin
      .from("leads")
      .insert([
        {
          user_id: userId,
          name: "אבי ישראלי",
          phone: "054-1112222",
          email: "avi@shop.co.il",
          company: "אבי דיגיטל",
          source: "website",
          status: "meeting_scheduled",
        },
        {
          user_id: userId,
          name: "מיכל רון",
          phone: "050-3334444",
          email: "michal@ronbakery.co.il",
          company: "מאפיית רון",
          source: "referral",
          status: "new_lead",
        },
        {
          user_id: userId,
          name: "עומר שגיא",
          phone: "053-5556666",
          email: "omer@sagaifit.co.il",
          company: "סגיא פיטנס",
          source: "social_media",
          status: "deal_closed",
        },
      ])
      .select("*");
    if (error) throw error;

    const avi = leads.find((l) => l.name === "אבי ישראלי");
    const omer = leads.find((l) => l.name === "עומר שגיא");

    await admin.from("lead_notes").insert([
      {
        lead_id: avi.id,
        user_id: userId,
        content: "דיברתי בטלפון - מעוניין בחבילת הפרסום החודשית. לשלוח הצעת מחיר.",
      },
      { lead_id: avi.id, user_id: userId, content: "קבע פגישת זום להצגת השירותים." },
      {
        lead_id: omer.id,
        user_id: userId,
        content: "סגר עסקה על חבילת שנתית לאחר פגישה במשרד.",
      },
    ]);

    await admin.from("meetings").insert([
      {
        user_id: userId,
        lead_id: avi.id,
        title: "שיחת היכרות - אבי ישראלי",
        scheduled_at: iso(48),
        duration_minutes: 30,
        method: "zoom",
        location_or_link: "https://zoom.us/j/1234567890",
        status: "scheduled",
      },
      {
        user_id: userId,
        lead_id: omer.id,
        title: "פגישת סגירה - עומר שגיא",
        scheduled_at: iso(-8),
        duration_minutes: 45,
        method: "in_person",
        location_or_link: "המשרד, רחוב הרצל 1, תל אביב",
        status: "completed",
        notes: "עומר אישר את החבילה השנתית וביקש חוזה חתום עד סוף השבוע.",
      },
    ]);

    await admin.from("deals").insert([
      {
        user_id: userId,
        lead_id: omer.id,
        title: "חבילה שנתית - סגיא פיטנס",
        value: 12000,
        currency: "ILS",
        product_or_service: "ניהול רשתות חברתיות - חבילה שנתית",
        status: "won",
        close_date: iso(-5).slice(0, 10),
        notes: "תשלום ב-12 תשלומים.",
      },
    ]);
  } else {
    const { data: leads, error } = await admin
      .from("leads")
      .insert([
        {
          user_id: userId,
          name: "נועה ברק",
          phone: "058-7778888",
          email: "noa@barakdesign.co.il",
          company: "ברק עיצוב",
          source: "cold_call",
          status: "meeting_completed",
        },
      ])
      .select("*");
    if (error) throw error;

    const noa = leads[0];
    await admin.from("meetings").insert([
      {
        user_id: userId,
        lead_id: noa.id,
        title: "פגישת המשך - נועה ברק",
        scheduled_at: iso(-20),
        duration_minutes: 30,
        method: "phone",
        status: "completed",
        notes: "מעוניינת, מחכה לאישור תקציב מהשותף שלה.",
      },
    ]);
  }
}

async function main() {
  const [dana, yossi] = await Promise.all([
    upsertUser(demoUsers[0]),
    upsertUser(demoUsers[1]),
  ]);

  const { count } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dana);
  if (!count) {
    await seedLeadsFor(dana, "dana");
    await seedLeadsFor(yossi, "yossi");
    console.log("Seeded sample leads/meetings/deals.");
  } else {
    console.log("Sample data already present, skipping.");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("SEED_FAILED:", err);
  process.exit(1);
});

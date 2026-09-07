// Domain types mirror the planned Postgres/Supabase schema (see docs/plan.md)
// so the mock data layer can be swapped for real Supabase queries later
// without changing any UI code.

export type LeadStatus =
  | "new_lead"
  | "meeting_scheduled"
  | "meeting_completed"
  | "deal_closed"
  | "deal_lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "new_lead",
  "meeting_scheduled",
  "meeting_completed",
  "deal_closed",
  "deal_lost",
];

export type LeadSource =
  | "website"
  | "referral"
  | "cold_call"
  | "social_media"
  | "cal_com"
  | "other";

export const LEAD_SOURCES: LeadSource[] = [
  "website",
  "referral",
  "cold_call",
  "social_media",
  "cal_com",
  "other",
];

export type MeetingMethod =
  | "in_person"
  | "phone"
  | "zoom"
  | "google_meet"
  | "cal_com"
  | "other";

export const MEETING_METHODS: MeetingMethod[] = [
  "in_person",
  "phone",
  "zoom",
  "google_meet",
  "cal_com",
  "other",
];

export type MeetingStatus = "scheduled" | "completed" | "canceled" | "no_show";

export const MEETING_STATUSES: MeetingStatus[] = [
  "scheduled",
  "completed",
  "canceled",
  "no_show",
];

export type DealStatus = "open" | "won" | "lost";

export const DEAL_STATUSES: DealStatus[] = ["open", "won", "lost"];

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  locale: "he" | "en";
  calComUsername?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  userId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  method: MeetingMethod;
  locationOrLink?: string;
  status: MeetingStatus;
  notes?: string;
  calComBookingUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  leadId: string;
  userId: string;
  title: string;
  value: number;
  currency: string;
  productOrService?: string;
  status: DealStatus;
  closeDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

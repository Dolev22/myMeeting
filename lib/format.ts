import type { Locale } from "@/lib/i18n/dictionaries";

const intlLocale = (locale: Locale) => (locale === "he" ? "he-IL" : "en-US");

export function formatDateTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function isWithinHoursFromNow(iso: string, hours: number) {
  const diffHours = (new Date(iso).getTime() - Date.now()) / 3600_000;
  return diffHours <= hours;
}

export function isOverdue(dueDate: string | undefined, status: string) {
  if (!dueDate || status === "completed") return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

export function formatCurrency(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

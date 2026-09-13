"use client";

import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import { NEW_FROM_WHATSAPP_WINDOW_HOURS } from "@/lib/types";

// Entirely derived from the persisted `createdAt` timestamp — never from
// client/local state — so a refresh or opening the CRM on another device
// never resets it (requirement #6). `Date.now()` is an external, ever-
// changing value, so it's read through useSyncExternalStore (React's
// sanctioned way to subscribe to something outside React state that ticks
// on its own) rather than read directly during render or written into
// state from inside an effect.
function subscribeToClockTick(callback: () => void) {
  const interval = setInterval(callback, 60_000);
  return () => clearInterval(interval);
}

function getNow() {
  return Date.now();
}

function getServerNow() {
  return 0;
}

export function NewFromWhatsAppBadge({ createdAt }: { createdAt: string }) {
  const { dict } = useI18n();
  const now = useSyncExternalStore(subscribeToClockTick, getNow, getServerNow);

  // Server-rendered pass (now === 0) always renders nothing rather than a
  // wrong/flashing value; the real client render replaces it immediately.
  if (now === 0) return null;

  const createdMs = new Date(createdAt).getTime();
  const expiresMs = createdMs + NEW_FROM_WHATSAPP_WINDOW_HOURS * 3600_000;
  const remainingMs = expiresMs - now;

  if (remainingMs <= 0) return null;

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <Badge color="green">
      {dict.whatsapp.newFromWhatsApp} · {hours}
      {dict.whatsapp.hoursShort} {minutes}
      {dict.whatsapp.minutesShort}
    </Badge>
  );
}

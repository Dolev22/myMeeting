"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageCircle, CalendarClock, Handshake, ListChecks } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

// `basePath` is the route prefix the links live under: "" for the real,
// signed-in app and "/demo" for the browser-local demo mode.
export function NavLinks({ basePath = "" }: { basePath?: string }) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const home = basePath || "/";

  const items = [
    { href: home, label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: `${basePath}/leads`, label: dict.nav.leads, icon: Users },
    { href: `${basePath}/tasks`, label: dict.nav.tasks, icon: ListChecks },
    { href: `${basePath}/meetings`, label: dict.nav.meetings, icon: CalendarClock },
    { href: `${basePath}/deals`, label: dict.nav.deals, icon: Handshake },
    { href: `${basePath}/whatsapp`, label: dict.nav.whatsapp, icon: MessageCircle },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === home ? pathname === home : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-teal-700 text-white dark:bg-teal-600"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

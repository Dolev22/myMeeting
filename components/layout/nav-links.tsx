"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarClock, Handshake } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

export function NavLinks() {
  const pathname = usePathname();
  const { dict } = useI18n();

  const items = [
    { href: "/", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/leads", label: dict.nav.leads, icon: Users },
    { href: "/meetings", label: dict.nav.meetings, icon: CalendarClock },
    { href: "/deals", label: dict.nav.deals, icon: Handshake },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

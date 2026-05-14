"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  CalendarRange,
  School as SchoolIcon,
  GraduationCap,
  BookOpen,
  UtensilsCrossed,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const directorItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Élèves", icon: Users },
  { href: "/homework", label: "Devoirs", icon: BookOpen },
  { href: "/canteen", label: "Cantine", icon: UtensilsCrossed },
];

const studentItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/schedule", label: "Horaires", icon: CalendarRange },
  { href: "/homework", label: "Devoirs", icon: BookOpen },
  { href: "/canteen", label: "Cantine", icon: UtensilsCrossed },
  { href: "/absences", label: "Absences", icon: ClipboardList },
];

const parentItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/schedule", label: "Horaires", icon: CalendarRange },
  { href: "/payments", label: "Paiements", icon: Wallet },
  { href: "/canteen", label: "Cantine", icon: UtensilsCrossed },
  { href: "/absences", label: "Absences", icon: ClipboardList },
];

const adminItems = [{ href: "/admin", label: "Écoles", icon: SchoolIcon }];

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items =
    role === "director"
      ? directorItems
      : role === "super_admin"
        ? adminItems
        : role === "student"
          ? studentItems
          : parentItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md bg-white/95 backdrop-blur shadow-nav safe-bottom">
      <ul
        className="grid px-2 pt-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                className={cn(
                  "flex w-full max-w-[88px] flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2 transition",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 active:bg-slate-50",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition",
                    active ? "stroke-[2.4]" : "stroke-[1.8]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] tracking-tight",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

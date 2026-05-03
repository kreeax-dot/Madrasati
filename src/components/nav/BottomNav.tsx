"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Wallet,
  MessagesSquare,
  CalendarRange,
  ClipboardList,
  School as SchoolIcon,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const directorItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Élèves", icon: Users },
  { href: "/homework", label: "Devoirs", icon: BookOpen },
  { href: "/payments", label: "Paiements", icon: Wallet },
];

const studentItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/schedule", label: "Horaires", icon: CalendarRange },
  { href: "/homework", label: "Devoirs", icon: BookOpen },
  { href: "/absences", label: "Absences", icon: ClipboardList },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

const parentItems = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/schedule", label: "Horaires", icon: CalendarRange },
  { href: "/payments", label: "Paiements", icon: Wallet },
  { href: "/absences", label: "Absences", icon: ClipboardList },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

const adminItems = [
  { href: "/admin", label: "Écoles", icon: SchoolIcon },
];

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
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-slate-100 bg-white/95 backdrop-blur safe-bottom">
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium transition",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition",
                    active ? "stroke-[2.4]" : "stroke-[1.8]",
                  )}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Wallet, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/students", label: "Élèves", icon: Users },
  { href: "/payments", label: "Paiements", icon: Wallet },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-slate-100 bg-white/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-4">
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

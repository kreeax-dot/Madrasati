import {
  BookOpen,
  CalendarRange,
  ClipboardList,
  MessagesSquare,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type FeatureKey =
  | "messages"
  | "homework"
  | "schedule"
  | "payments"
  | "absences"
  | "canteen";

export const features: Record<
  FeatureKey,
  {
    label: string;
    icon: LucideIcon;
    bg: string;
    bgSoft: string;
    text: string;
    ring: string;
    gradient: string;
    href: string;
  }
> = {
  messages: {
    label: "Messages",
    icon: MessagesSquare,
    bg: "bg-blue-500",
    bgSoft: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100",
    gradient: "from-blue-500 to-blue-700",
    href: "/messages",
  },
  homework: {
    label: "Devoirs",
    icon: BookOpen,
    bg: "bg-purple-500",
    bgSoft: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-100",
    gradient: "from-purple-500 to-purple-700",
    href: "/homework",
  },
  schedule: {
    label: "Emploi du temps",
    icon: CalendarRange,
    bg: "bg-orange-500",
    bgSoft: "bg-orange-50",
    text: "text-orange-600",
    ring: "ring-orange-100",
    gradient: "from-orange-500 to-orange-700",
    href: "/schedule",
  },
  payments: {
    label: "Paiements",
    icon: Wallet,
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
    gradient: "from-emerald-500 to-emerald-700",
    href: "/payments",
  },
  absences: {
    label: "Absences",
    icon: ClipboardList,
    bg: "bg-red-500",
    bgSoft: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-100",
    gradient: "from-red-500 to-red-700",
    href: "/absences",
  },
  canteen: {
    label: "Cantine",
    icon: UtensilsCrossed,
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
    gradient: "from-amber-500 to-amber-700",
    href: "/canteen",
  },
};

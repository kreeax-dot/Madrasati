import {
  BookOpen,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  Images,
  Megaphone,
  MessagesSquare,
  Repeat,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export type FeatureKey =
  | "messages"
  | "homework"
  | "schedule"
  | "payments"
  | "absences"
  | "canteen"
  | "exams"
  | "remedials"
  | "photos"
  | "announcements";

export const features: Record<
  FeatureKey,
  {
    /** French label — kept for legacy callers / fallback. */
    label: string;
    /** Dictionary key to translate via `t(labelKey)`. */
    labelKey: DictionaryKey;
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
    labelKey: "nav.messages",
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
    labelKey: "nav.homework",
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
    labelKey: "nav.schedule",
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
    labelKey: "nav.payments",
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
    labelKey: "nav.absences",
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
    labelKey: "nav.canteen",
    icon: UtensilsCrossed,
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
    gradient: "from-amber-500 to-amber-700",
    href: "/canteen",
  },
  exams: {
    label: "Examens",
    labelKey: "nav.exams",
    icon: GraduationCap,
    bg: "bg-rose-500",
    bgSoft: "bg-rose-50",
    text: "text-rose-600",
    ring: "ring-rose-100",
    gradient: "from-rose-500 to-rose-700",
    href: "/exams",
  },
  remedials: {
    label: "Rattrapages",
    labelKey: "nav.remedials",
    icon: Repeat,
    bg: "bg-indigo-500",
    bgSoft: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-100",
    gradient: "from-indigo-500 to-indigo-700",
    href: "/remedials",
  },
  photos: {
    label: "Photos",
    labelKey: "nav.photos",
    icon: Images,
    bg: "bg-cyan-500",
    bgSoft: "bg-cyan-50",
    text: "text-cyan-600",
    ring: "ring-cyan-100",
    gradient: "from-cyan-500 to-cyan-700",
    href: "/photos",
  },
  announcements: {
    label: "Annonces",
    labelKey: "nav.announcements",
    icon: Megaphone,
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-50",
    text: "text-fuchsia-600",
    ring: "ring-fuchsia-100",
    gradient: "from-fuchsia-500 to-fuchsia-700",
    href: "/announcements",
  },
};

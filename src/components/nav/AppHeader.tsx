import Link from "next/link";
import { School as SchoolIcon } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { fetchNotifications } from "@/lib/notifications";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

export async function AppHeader() {
  const [{ profile, email }, school, notifications] = await Promise.all([
    getSessionProfile(),
    getCurrentSchool(),
    fetchNotifications(),
  ]);

  const subtitle =
    profile.role === "director"
      ? "Direction"
      : profile.role === "student"
        ? "Élève"
        : profile.role === "parent"
          ? "Parent"
          : "Admin";

  return (
    <div className="sticky top-0 z-20 w-full bg-slate-50/85 backdrop-blur safe-top">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-5 py-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <SchoolIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 leading-none">
              {subtitle}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 leading-tight">
              {school?.name ?? "Madrasati"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell items={notifications} />
          <UserMenu fullName={profile.full_name} email={email} role={profile.role} />
        </div>
      </div>
    </div>
  );
}

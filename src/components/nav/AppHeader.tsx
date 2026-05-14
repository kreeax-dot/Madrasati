import Link from "next/link";
import { School as SchoolIcon } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { fetchNotifications } from "@/lib/notifications";
import { APP_BUILD_LABEL } from "@/lib/version";
import { LogoutButton } from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

export async function AppHeader() {
  const [{ profile, userId, email }, school, notifications] = await Promise.all([
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
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-5 py-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-tile">
            <SchoolIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
              {subtitle}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-bold text-slate-900 leading-tight">
              <span className="truncate">{school?.name ?? "Madrasati"}</span>
              <span
                className="shrink-0 rounded-full bg-brand-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-brand-700"
                title={APP_BUILD_LABEL}
              >
                {APP_BUILD_LABEL}
              </span>
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell items={notifications} userId={userId} />
          <UserMenu fullName={profile.full_name} email={email} role={profile.role} />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

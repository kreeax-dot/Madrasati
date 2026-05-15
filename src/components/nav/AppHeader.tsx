import Link from "next/link";
import { headers } from "next/headers";
import { School as SchoolIcon } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { fetchNotifications } from "@/lib/notifications";
import { APP_BUILD_LABEL } from "@/lib/version";
import { st } from "@/lib/i18n/server";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

/**
 * Top app bar shown on every (app)/* page.
 *
 * On the home page (/dashboard) it shows the full identity strip
 * (school logo + school name + version badge). On every other page it
 * collapses to just the back-affording chrome (bell + user + logout) so
 * the school name doesn't repeat on every screen.
 */
export async function AppHeader() {
  const [{ profile, userId, email }, school, notifications] = await Promise.all([
    getSessionProfile(),
    getCurrentSchool(),
    fetchNotifications(),
  ]);

  // Read the current request pathname server-side. Vercel + Next.js expose
  // it via the middleware-injected `x-next-pathname` header (we already
  // proxy through middleware). Fallback to "/" if absent.
  const h = headers();
  const pathname =
    h.get("x-next-pathname") ?? h.get("x-pathname") ?? h.get("referer") ?? "";
  const isDashboard =
    pathname.endsWith("/dashboard") || pathname === "/" || pathname === "";

  const subtitle =
    profile.role === "director"
      ? st("role.director")
      : profile.role === "student"
        ? st("role.student")
        : profile.role === "parent"
          ? st("role.parent")
          : st("role.super_admin");

  return (
    <div className="sticky top-0 z-20 w-full bg-slate-50/85 backdrop-blur safe-top">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-5 py-3">
        {isDashboard ? (
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
        ) : (
          // Non-dashboard pages: minimal identity (school icon only) +
          // breathing room for the actions on the right.
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-tile"
            aria-label="Retour à l'accueil"
          >
            <SchoolIcon className="h-5 w-5" />
          </Link>
        )}

        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <NotificationBell items={notifications} userId={userId} />
          <UserMenu fullName={profile.full_name} email={email} role={profile.role} />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/nav/LogoutButton";
import { APP_BUILD_LABEL } from "@/lib/version";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["super_admin"]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-slate-50 pb-10">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 safe-top">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Super Admin
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 leading-tight">
              <span className="truncate">{profile.full_name}</span>
              <span
                className="shrink-0 rounded-full bg-brand-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-brand-700"
                title={APP_BUILD_LABEL}
              >
                {APP_BUILD_LABEL}
              </span>
            </p>
          </div>
        </Link>
        <LogoutButton />
      </header>
      <main className="px-5 pt-2">{children}</main>
    </div>
  );
}

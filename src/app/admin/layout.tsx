import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

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
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {profile.full_name}
            </p>
          </div>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </header>
      <main className="px-5 pt-2">{children}</main>
    </div>
  );
}

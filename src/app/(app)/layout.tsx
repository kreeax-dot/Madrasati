import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { signOut } from "@/app/actions/auth";
import { BottomNav } from "@/components/nav/BottomNav";
import { AppHeader } from "@/components/nav/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  // super_admin never sees the end-user app — full route isolation.
  if (profile.role === "super_admin") redirect("/admin");

  // Every non-admin role MUST be tied to an active school. Otherwise we
  // render a clean "account not ready" screen rather than broken empty pages.
  if (!profile.school_id) {
    return <NotProvisioned reason="no_school" />;
  }

  const school = await getCurrentSchool();
  if (!school) {
    return <NotProvisioned reason="no_school" />;
  }
  if (!school.is_active) {
    return <NotProvisioned reason="inactive_school" schoolName={school.name} />;
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-slate-50 pb-24">
      <AppHeader />
      <main className="px-5 pt-2 pb-6">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  );
}

function NotProvisioned({
  reason,
  schoolName,
}: {
  reason: "no_school" | "inactive_school";
  schoolName?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">
        Compte non activé
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {reason === "no_school"
          ? "Votre compte n'est pas associé à une école. Contactez le directeur de votre école pour obtenir un accès."
          : `${schoolName ?? "Votre école"} est actuellement désactivée. Contactez l'administration.`}
      </p>
      <form action={signOut} className="mt-8 w-full">
        <button type="submit" className="btn-primary w-full">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}

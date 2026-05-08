import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { BottomNav } from "@/components/nav/BottomNav";
import { AppHeader } from "@/components/nav/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (profile.role === "super_admin") redirect("/admin");

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-slate-50 pb-24">
      <AppHeader />
      <main className="px-5 pt-2 pb-6">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  );
}

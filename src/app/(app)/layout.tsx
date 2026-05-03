import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-slate-50 pb-24">
      <main className="px-5 pt-4 safe-top">{children}</main>
      <BottomNav />
    </div>
  );
}

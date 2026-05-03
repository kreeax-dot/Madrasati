import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export const getSessionProfile = cache(_getSessionProfile);

async function _getSessionProfile(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Utilisateur";
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? "",
        full_name: fullName,
        role: "parent" as UserRole,
      })
      .select("*")
      .single();
    profile = inserted!;
  }

  return { userId: user.id, email: user.email ?? "", profile: profile as Profile };
}

export async function requireRole(allowed: UserRole[]) {
  const { profile, userId, email } = await getSessionProfile();
  if (!allowed.includes(profile.role)) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }
  return { profile, userId, email };
}

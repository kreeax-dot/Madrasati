import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

/**
 * Returns the current user + profile, or redirects to /login.
 *
 * Strict mode: a logged-in user *without* a profile row is treated as a
 * stale/invalid session. We sign them out and bounce to /login with an error
 * code — we never auto-create a profile (that was the source of phantom
 * "parent" accounts and role leakage).
 */
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    // Session exists but no profile → kill the session, force re-login.
    await supabase.auth.signOut();
    redirect("/login?e=no_profile");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
  };
}

/**
 * Server guard: ensures the caller's role is in `allowed`. If not, redirects
 * the user to the home page that matches their actual role. Never silently
 * grants access.
 */
export async function requireRole(allowed: UserRole[]) {
  const { profile, userId, email } = await getSessionProfile();
  if (!allowed.includes(profile.role)) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }
  return { profile, userId, email };
}

/**
 * Server guard: ensures the caller has a school_id (i.e. is provisioned).
 * super_admin is always considered provisioned (they don't belong to a
 * school). Other roles without a school_id are bounced to /login with a
 * `no_school` flag so they see a clear message instead of broken empty pages.
 */
export async function requireProvisioned() {
  const { profile, userId, email } = await getSessionProfile();
  if (profile.role !== "super_admin" && !profile.school_id) {
    redirect("/login?e=no_school");
  }
  return { profile, userId, email };
}

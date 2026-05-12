"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createClient();
  try {
    // `global` revokes the session on the server too — protects against a
    // stolen refresh token continuing to work after sign-out.
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    /* fall through — we still want to wipe local cookies even if the network
       call to Supabase fails, so the user is fully logged out client-side */
  }

  // Belt-and-suspenders: explicitly delete any cookie whose name looks like a
  // Supabase auth cookie. `signOut` should clear them via the SSR helper, but
  // edge-runtime + browser races have left stale cookies behind in the past.
  const store = cookies();
  for (const c of store.getAll()) {
    if (
      c.name.startsWith("sb-") ||
      c.name.includes("supabase") ||
      c.name.includes("auth-token")
    ) {
      store.set({ name: c.name, value: "", maxAge: 0, path: "/" });
    }
  }

  redirect("/login");
}

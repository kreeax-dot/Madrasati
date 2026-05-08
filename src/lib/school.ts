import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { School } from "@/types/database";

export const getCurrentSchool = cache(_getCurrentSchool);

async function _getCurrentSchool(): Promise<School | null> {
  const { profile } = await getSessionProfile();
  if (!profile.school_id) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .maybeSingle<School>();
  return data ?? null;
}

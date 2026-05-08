"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

function mondayOf(input: string): string {
  const d = new Date(input);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-aligned
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function upsertCanteenMenu(formData: FormData) {
  const { profile } = await requireRole(["director"]);
  if (!profile.school_id) throw new Error("Aucune école assignée");
  const supabase = createClient();

  const weekStartRaw = String(formData.get("week_start") ?? "");
  const weekStart = mondayOf(weekStartRaw);
  const dayOfWeek = Number(formData.get("day_of_week") ?? -1);
  const starter = String(formData.get("starter") ?? "").trim() || null;
  const main = String(formData.get("main") ?? "").trim() || null;
  const dessert = String(formData.get("dessert") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error("Jour invalide");

  const { error } = await supabase
    .from("canteen_menus")
    .upsert(
      {
        school_id: profile.school_id,
        week_start: weekStart,
        day_of_week: dayOfWeek,
        starter,
        main,
        dessert,
        notes,
      },
      { onConflict: "school_id,week_start,day_of_week" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/canteen");
}

export async function deleteCanteenMenu(id: string) {
  await requireRole(["director"]);
  const supabase = createClient();
  const { error } = await supabase.from("canteen_menus").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/canteen");
}

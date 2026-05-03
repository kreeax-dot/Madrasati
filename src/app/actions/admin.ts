"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { SchoolFeatures } from "@/types/database";

export async function createSchool(formData: FormData) {
  await requireRole(["super_admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) throw new Error("Nom requis");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("schools")
    .insert({ name, address, phone })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect(`/admin/schools/${data.id}`);
}

export async function updateSchoolFeatures(
  schoolId: string,
  features: SchoolFeatures,
) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();
  const { error } = await admin
    .from("schools")
    .update({ features })
    .eq("id", schoolId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function setSchoolActive(schoolId: string, active: boolean) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();
  const { error } = await admin
    .from("schools")
    .update({ is_active: active })
    .eq("id", schoolId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath("/admin");
}

export async function createDirector(formData: FormData) {
  await requireRole(["super_admin"]);

  const schoolId = String(formData.get("school_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim() || email.split("@")[0];

  if (!schoolId) throw new Error("École requise");
  if (!email) throw new Error("Email requis");
  if (password.length < 6) throw new Error("Mot de passe trop court (min. 6)");

  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "director" },
  });
  if (createErr || !created.user) {
    throw new Error(createErr?.message ?? "Création échouée");
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: created.user.id,
        email,
        full_name: fullName,
        role: "director",
        school_id: schoolId,
      },
      { onConflict: "id" },
    );
  if (profileErr) throw new Error(profileErr.message);

  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function deleteSchool(schoolId: string) {
  await requireRole(["super_admin"]);
  const admin = createAdminClient();
  const { error } = await admin.from("schools").delete().eq("id", schoolId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  redirect("/admin");
}

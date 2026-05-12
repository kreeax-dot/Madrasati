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
  // Always create as active with the full default feature set — never rely on
  // a column default that might not be in sync after partial migrations.
  const { data, error } = await admin
    .from("schools")
    .insert({
      name,
      address,
      phone,
      is_active: true,
      features: {
        payments: true,
        messages: true,
        absences: true,
        schedule: true,
      },
    })
    .select("id")
    .single();
  if (error) {
    if (error.message?.toLowerCase().includes("does not exist")) {
      throw new Error(
        `Schéma incomplet : ${error.message}. Appliquez supabase/migration_v2.sql et migration_v6.sql.`,
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  redirect(`/admin/schools/${data.id}`);
}

export async function updateSchoolFeatures(
  schoolId: string,
  features: SchoolFeatures,
) {
  await requireRole(["super_admin"]);
  if (!schoolId) throw new Error("École requise");
  const admin = createAdminClient();
  const { error } = await admin
    .from("schools")
    .update({ features })
    .eq("id", schoolId);
  if (error) {
    if (error.message?.toLowerCase().includes("does not exist")) {
      throw new Error(
        "Colonne « features » manquante. Appliquez supabase/migration_v2.sql puis migration_v6.sql.",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function setSchoolActive(schoolId: string, active: boolean) {
  await requireRole(["super_admin"]);
  if (!schoolId) throw new Error("École requise");
  const admin = createAdminClient();
  const { error } = await admin
    .from("schools")
    .update({ is_active: active })
    .eq("id", schoolId);
  if (error) {
    if (error.message?.toLowerCase().includes("does not exist")) {
      throw new Error(
        "Colonne « is_active » manquante. Appliquez supabase/migration_v6.sql.",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath("/admin");
}

// ─── ORPHAN DIRECTORS ────────────────────────────────────────────────────────
export async function reassignDirector(profileId: string, schoolId: string) {
  await requireRole(["super_admin"]);
  if (!profileId || !schoolId) throw new Error("Champs requis");
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ school_id: schoolId })
    .eq("id", profileId)
    .eq("role", "director");
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/admin/schools/${schoolId}`);
}

export async function deleteOrphanDirector(profileId: string) {
  await requireRole(["super_admin"]);
  if (!profileId) throw new Error("Profil requis");
  const admin = createAdminClient();

  // Sanity-check: only allow deleting directors with no school assigned.
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!target) throw new Error("Profil introuvable");
  if (target.role !== "director") throw new Error("Seuls les directeurs orphelins peuvent être supprimés ici");
  if (target.school_id) throw new Error("Ce directeur est rattaché à une école — réassignez plutôt");

  const { error: authErr } = await admin.auth.admin.deleteUser(profileId);
  if (authErr) throw new Error(authErr.message);
  // Profile row cascades via auth.users ON DELETE CASCADE.
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
  if (!schoolId) throw new Error("École requise");
  const admin = createAdminClient();

  // Best-effort: purge storage objects under this school's folder in both
  // public buckets so nothing is left dangling. Failures here are non-fatal —
  // the DB cascade is the source of truth.
  for (const bucket of ["avatars", "photos"] as const) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(schoolId, {
        limit: 1000,
      });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${schoolId}/${f.name}`);
        await admin.storage.from(bucket).remove(paths);
      }
    } catch {
      // ignore — DB cascade still removes the rows that referenced them
    }
  }

  // All school-scoped tables have `school_id` FK with ON DELETE CASCADE
  // (schools.sql + migrations v2/v3/v4/v5): students, classes, schedules,
  // payments, messages, homework, absences, canteen_menus, exams, remedials,
  // photos, student_codes. profiles.school_id is ON DELETE SET NULL so
  // directors survive as orphans (visible on /admin to reassign or delete).
  const { error } = await admin.from("schools").delete().eq("id", schoolId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

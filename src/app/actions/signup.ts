"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function redeemCodeAndCreateAccount(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!code) return { ok: false, error: "Code requis" };
  if (!email) return { ok: false, error: "Email requis" };
  if (password.length < 6) return { ok: false, error: "Mot de passe trop court (min. 6)" };

  const admin = createAdminClient();

  const { data: codeRow, error: codeErr } = await admin
    .from("student_codes")
    .select("id, student_id, school_id, used_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (codeErr) return { ok: false, error: codeErr.message };
  if (!codeRow) return { ok: false, error: "Code invalide" };
  if (codeRow.used_at) return { ok: false, error: "Code déjà utilisé" };
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return { ok: false, error: "Code expiré" };
  }

  // Resolve the student's name with a separate query — no embedded FK join.
  const { data: student } = await admin
    .from("students")
    .select("full_name")
    .eq("id", codeRow.student_id)
    .maybeSingle();
  const fullName = (student as any)?.full_name ?? "Élève";

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student" },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Erreur de création" };
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      email,
      full_name: fullName,
      role: "student",
      school_id: codeRow.school_id,
      student_id: codeRow.student_id,
    },
    { onConflict: "id" },
  );
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileErr.message };
  }

  const { error: markErr } = await admin
    .from("student_codes")
    .update({ used_at: new Date().toISOString(), used_by: created.user.id })
    .eq("id", codeRow.id);
  if (markErr) return { ok: false, error: markErr.message };

  return { ok: true };
}

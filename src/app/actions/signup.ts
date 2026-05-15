"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Two-phase student signup with email OTP verification.
 *
 *   PHASE 1 — requestStudentSignup
 *     Validates the student code, creates the auth user with
 *     email_confirm: false (pending), pre-creates the profile linked to
 *     the student, and sends a 6-digit OTP via signInWithOtp.
 *
 *   PHASE 2 — verifyStudentSignupOtp
 *     Verifies the 6-digit OTP. On success the auth user's email is
 *     marked confirmed and a session is created — user is signed in.
 *     The signup code is marked as used.
 *
 * If the user abandons between phases, the auth row stays in a pending
 * (email_confirm: false) state and the code remains usable, so they can
 * retry without an operator clean-up.
 */

export type RequestSignupResult =
  | { ok: true; email: string }
  | { ok: false; error: string; step: string };

export async function requestStudentSignup(
  formData: FormData,
): Promise<RequestSignupResult> {
  let step = "init";
  try {
    step = "parse";
    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!code) return { ok: false, error: "Code requis", step };
    if (!email) return { ok: false, error: "Email requis", step };
    if (password.length < 6) {
      return { ok: false, error: "Mot de passe trop court (min. 6)", step };
    }

    const admin = createAdminClient();

    step = "validate_code";
    const { data: codeRow, error: codeErr } = await admin
      .from("student_codes")
      .select("id, student_id, school_id, used_at, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (codeErr) return { ok: false, error: codeErr.message, step };
    if (!codeRow) return { ok: false, error: "Code invalide", step };
    if (codeRow.used_at) return { ok: false, error: "Code déjà utilisé", step };
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return { ok: false, error: "Code expiré", step };
    }

    step = "resolve_student";
    const { data: student } = await admin
      .from("students")
      .select("full_name")
      .eq("id", codeRow.student_id)
      .maybeSingle();
    const fullName = (student as any)?.full_name ?? "Élève";

    step = "create_or_lookup_user";
    // If an account already exists for this email (e.g. retry after timeout),
    // we don't recreate it. listUsers is paginated; we filter to find ours.
    let userId: string | null = null;
    let createdNow = false;

    try {
      const { data: existing } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const found = existing?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === email,
      );
      if (found) userId = found.id;
    } catch {
      /* listUsers is best-effort; if it fails we fall through to create */
    }

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          role: "student",
          pending_code: code,
        },
      });
      if (createErr || !created?.user) {
        return {
          ok: false,
          error: createErr?.message ?? "Erreur de création du compte",
          step,
        };
      }
      userId = created.user.id;
      createdNow = true;
    } else {
      // Refresh the password so the user can sign in after OTP verification
      // even if they typed a different password this attempt.
      await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: {
          full_name: fullName,
          role: "student",
          pending_code: code,
        },
      });
    }

    step = "upsert_profile";
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId!,
        email,
        full_name: fullName,
        role: "student",
        school_id: codeRow.school_id,
        student_id: codeRow.student_id,
      },
      { onConflict: "id" },
    );
    if (profileErr) {
      // Roll back if we just created the user; otherwise leave the
      // existing user alone.
      if (createdNow) {
        await admin.auth.admin.deleteUser(userId!);
      }
      return { ok: false, error: profileErr.message, step };
    }

    step = "send_otp";
    // We use a SERVER client (not admin) so the OTP email is dispatched
    // through the normal auth flow. shouldCreateUser must be false because
    // we've already created the user above.
    const server = createClient();
    const { error: otpErr } = await server.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    if (otpErr) {
      console.error("[requestStudentSignup] signInWithOtp failed:", otpErr);
      return {
        ok: false,
        error: `Envoi du code échoué : ${otpErr.message}`,
        step,
      };
    }

    return { ok: true, email };
  } catch (err: any) {
    console.error("[requestStudentSignup] UNCAUGHT", {
      step,
      message: err?.message,
      stack: err?.stack,
    });
    return {
      ok: false,
      error: err?.message ?? "Erreur inconnue",
      step,
    };
  }
}

export type VerifySignupResult =
  | { ok: true }
  | { ok: false; error: string; step: string };

export async function verifyStudentSignupOtp(
  formData: FormData,
): Promise<VerifySignupResult> {
  let step = "init";
  try {
    step = "parse";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const token = String(formData.get("token") ?? "").trim();
    if (!email || !token) {
      return { ok: false, error: "Email et code requis", step };
    }

    step = "verify_otp";
    // verifyOtp with type "email" handles both signup confirmation and
    // sign-in OTP flows. On success a session is set on the response,
    // and the user's email is marked confirmed.
    const server = createClient();
    const { error: verifyErr } = await server.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (verifyErr) {
      const msg = verifyErr.message?.toLowerCase() ?? "";
      const userFacing = msg.includes("expired")
        ? "Code expiré. Demandez-en un nouveau."
        : msg.includes("invalid") || msg.includes("not found")
          ? "Code invalide."
          : verifyErr.message;
      return { ok: false, error: userFacing, step };
    }

    step = "mark_code_used";
    // Look up the user we just signed in to find the matching student code
    // and mark it as used. This is best-effort — if it fails we don't
    // un-sign-in the user, but we log loudly so we can audit.
    const {
      data: { user },
    } = await server.auth.getUser();
    if (user) {
      const pendingCode = (user.user_metadata as any)?.pending_code;
      if (pendingCode) {
        const admin = createAdminClient();
        const { error: markErr } = await admin
          .from("student_codes")
          .update({
            used_at: new Date().toISOString(),
            used_by: user.id,
          })
          .eq("code", pendingCode)
          .is("used_at", null);
        if (markErr) {
          console.warn(
            "[verifyStudentSignupOtp] mark code used failed (non-fatal):",
            markErr.message,
          );
        }
      }
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[verifyStudentSignupOtp] UNCAUGHT", {
      step,
      message: err?.message,
      stack: err?.stack,
    });
    return {
      ok: false,
      error: err?.message ?? "Erreur inconnue",
      step,
    };
  }
}

/**
 * Resends the OTP email — used by the "Renvoyer le code" link on the
 * OTP screen.
 */
export async function resendStudentSignupOtp(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const server = createClient();
    const { error } = await server.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Erreur" };
  }
}

/**
 * Legacy single-call signup — kept as a fallback so existing references
 * (and the original UI path before this update is deployed) keep working.
 * It now delegates to the two-phase flow internally.
 */
export async function redeemCodeAndCreateAccount(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const res = await requestStudentSignup(formData);
  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: false,
    error:
      "Veuillez vérifier votre email — un code de vérification a été envoyé.",
  };
}

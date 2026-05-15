"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Password reset via email OTP.
 *
 *   1. requestPasswordResetOtp(email)
 *      → supabase.auth.signInWithOtp({ email, shouldCreateUser: false })
 *      User receives a 6-digit code.
 *
 *   2. verifyPasswordResetOtp(email, token)
 *      → supabase.auth.verifyOtp({ email, token, type: 'email' })
 *      On success a session is set (cookies updated by SSR helper).
 *
 *   3. setNewPasswordAfterReset(newPassword)
 *      → supabase.auth.updateUser({ password })
 *      Caller must already be authenticated (via step 2).
 *
 * All three return structured results — never throw.
 */

export type ResetResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requestPasswordResetOtp(
  email: string,
): Promise<ResetResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Erreur" };
  }
}

export async function verifyPasswordResetOtp(
  email: string,
  token: string,
): Promise<ResetResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      const userFacing = msg.includes("expired")
        ? "Code expiré. Demandez-en un nouveau."
        : msg.includes("invalid") || msg.includes("not found")
          ? "Code invalide."
          : error.message;
      return { ok: false, error: userFacing };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Erreur" };
  }
}

export async function setNewPasswordAfterReset(
  newPassword: string,
): Promise<ResetResult> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "Mot de passe trop court (min. 6)." };
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        error: "Session expirée. Recommencez la procédure.",
      };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Erreur" };
  }
}

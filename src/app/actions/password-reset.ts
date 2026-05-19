"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Password reset using Supabase's DEDICATED recovery flow (NOT the
 * signInWithOtp magic-link flow, which has a much shorter TTL and was
 * causing "Code expired" errors within ~60 seconds).
 *
 * Why this flow:
 *   - `resetPasswordForEmail` sends an email through the dedicated
 *     "Reset Password" template. The associated token is a recovery
 *     token with a longer TTL (default 1 hour on Supabase) — controlled
 *     by Dashboard → Authentication → URL Configuration → OTP Expiry.
 *   - `verifyOtp({ type: 'recovery' })` is the matching verification
 *     call. It validates the recovery token AND establishes a session
 *     (so the subsequent `updateUser({ password })` call is authorised).
 *
 *   1. requestPasswordResetOtp(email)
 *      → supabase.auth.resetPasswordForEmail(email)
 *
 *   2. verifyPasswordResetOtp(email, token)
 *      → supabase.auth.verifyOtp({ email, token, type: 'recovery' })
 *
 *   3. setNewPasswordAfterReset(newPassword)
 *      → supabase.auth.updateUser({ password })
 *
 * Operator-side requirements (one-time, on Supabase Dashboard):
 *   - Authentication → Email Templates → "Reset Password" template:
 *       body should include {{ .Token }} (the 6-digit code).
 *   - Authentication → URL Configuration → OTP Expiry:
 *       set to at least 600 seconds (10 minutes). Default 3600s = 1h.
 */

export type ResetResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requestPasswordResetOtp(
  email: string,
): Promise<ResetResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
    );
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
      type: "recovery",
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      // Map known error patterns to user-friendly French.
      const userFacing = msg.includes("expired")
        ? "Code expiré. Demandez-en un nouveau (le code est valable 1 heure)."
        : msg.includes("invalid") || msg.includes("not found")
          ? "Code invalide."
          : msg.includes("rate")
            ? "Trop de tentatives. Réessayez dans quelques minutes."
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

"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Password reset using the SAME OTP flow as student signup
 * (`signInWithOtp` + `verifyOtp({ type: 'email' })`).
 *
 * Why this flow (and not resetPasswordForEmail):
 *   - resetPasswordForEmail uses a SEPARATE "Reset Password" email
 *     template. If that template still ships the default
 *     {{ .ConfirmationURL }} link instead of {{ .Token }}, users either
 *     receive only a link (no code to type) or paste random URL chars
 *     and hit "Code expired".
 *   - signInWithOtp uses the "Magic Link" template which the operator
 *     already configured for the student signup flow — so the same
 *     6-digit token is delivered, and users see a real code in their
 *     inbox.
 *   - Once `verifyOtp({type:'email'})` succeeds, Supabase establishes
 *     a session. The subsequent `updateUser({ password })` call is
 *     authorised and replaces the password.
 *
 * Steps:
 *   1. requestPasswordResetOtp(email)
 *      → supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
 *
 *   2. verifyPasswordResetOtp(email, token)
 *      → supabase.auth.verifyOtp({ email, token, type: 'email' })
 *
 *   3. setNewPasswordAfterReset(newPassword)
 *      → supabase.auth.updateUser({ password })
 *
 * If a user still hits "Code expired" within seconds:
 *   - Supabase Dashboard → Authentication → URL Configuration → "OTP Expiry"
 *     is the source. Default = 3600 seconds (1 hour). If it's been lowered
 *     to 60 seconds, raise it.
 *   - The verify step now returns the FULL Supabase error message + code
 *     so the operator can see exactly what Supabase complained about.
 */

export type ResetResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      step: string;
      supabaseCode?: string;
      rawMessage?: string;
    };

export async function requestPasswordResetOtp(
  email: string,
): Promise<ResetResult> {
  let step = "init";
  try {
    step = "validate";
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) return { ok: false, error: "Email requis", step };

    step = "supabase";
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error("[requestPasswordResetOtp] signInWithOtp failed", {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
      });
      return {
        ok: false,
        error: error.message,
        step,
        supabaseCode: (error as any).code,
        rawMessage: error.message,
      };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[requestPasswordResetOtp] UNCAUGHT", err);
    return {
      ok: false,
      error: err?.message ?? "Erreur",
      step,
    };
  }
}

export async function verifyPasswordResetOtp(
  email: string,
  token: string,
): Promise<ResetResult> {
  let step = "init";
  try {
    step = "validate";
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedToken = token.trim();
    if (!cleanedEmail || !cleanedToken) {
      return { ok: false, error: "Email et code requis", step };
    }

    step = "verifyOtp";
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: cleanedEmail,
      token: cleanedToken,
      type: "email",
    });
    if (error) {
      console.error("[verifyPasswordResetOtp] verifyOtp failed", {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
        emailLen: cleanedEmail.length,
        tokenLen: cleanedToken.length,
        nowIso: new Date().toISOString(),
      });
      const msg = error.message?.toLowerCase() ?? "";
      const userFacing = msg.includes("expired")
        ? "Code expiré. Demandez-en un nouveau."
        : msg.includes("invalid") || msg.includes("not found")
          ? "Code invalide."
          : msg.includes("rate")
            ? "Trop de tentatives. Réessayez dans quelques minutes."
            : error.message;
      return {
        ok: false,
        error: userFacing,
        step,
        supabaseCode: (error as any).code,
        rawMessage: error.message,
      };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[verifyPasswordResetOtp] UNCAUGHT", err);
    return {
      ok: false,
      error: err?.message ?? "Erreur",
      step,
    };
  }
}

export async function setNewPasswordAfterReset(
  newPassword: string,
): Promise<ResetResult> {
  let step = "init";
  try {
    step = "validate";
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "Mot de passe trop court (min. 6).", step };
    }
    step = "session";
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        error: "Session expirée. Recommencez la procédure.",
        step,
      };
    }
    step = "update";
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("[setNewPasswordAfterReset] updateUser failed", error);
      return { ok: false, error: error.message, step };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[setNewPasswordAfterReset] UNCAUGHT", err);
    return { ok: false, error: err?.message ?? "Erreur", step };
  }
}

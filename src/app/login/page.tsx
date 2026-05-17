"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Loader2,
  LogIn,
  School as SchoolIcon,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  requestStudentSignup,
  verifyStudentSignupOtp,
  resendStudentSignupOtp,
} from "@/app/actions/signup";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  setNewPasswordAfterReset,
} from "@/app/actions/password-reset";

type Mode = "login" | "code" | "forgot";
type SignupStep = "form" | "otp";
type ForgotStep = "email" | "otp" | "password" | "done";

const ERROR_MESSAGES: Record<string, string> = {
  no_profile:
    "Votre compte n'est pas configuré. Contactez le directeur de votre école.",
  no_school:
    "Votre compte n'est associé à aucune école. Contactez votre directeur.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student-code signup is now a 2-step flow: form → OTP.
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [otpToken, setOtpToken] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  // Forgot password 3-step flow.
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");

  // Surface server-side errors that arrived via ?e=…
  useEffect(() => {
    const e = searchParams.get("e");
    if (e && ERROR_MESSAGES[e]) setError(ERROR_MESSAGES[e]);
  }, [searchParams]);

  /**
   * After a successful sign-in, we need to know the user's role to send them
   * to the right home — super_admin → /admin, everyone else → /dashboard.
   * Querying the profile here avoids the brief "/dashboard then redirect"
   * flicker for super_admin.
   */
  async function postLoginRedirect(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("id", userId)
      .maybeSingle();

    if (!data) {
      // Session created but no profile — abnormal. Sign out and surface error.
      await supabase.auth.signOut();
      setError(ERROR_MESSAGES.no_profile);
      return;
    }

    if (data.role === "super_admin") {
      router.replace("/admin");
    } else if (!data.school_id) {
      // Will hit the "Compte non activé" screen in the (app) layout.
      router.replace("/dashboard");
    } else {
      router.replace("/dashboard");
    }
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? "Identifiants invalides");
      return;
    }
    await postLoginRedirect(data.user.id);
    setLoading(false);
  }

  async function handleCodeSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.set("code", code);
    fd.set("email", email);
    fd.set("password", password);
    const result = await requestStudentSignup(fd);
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    // OTP sent — move to the verification step.
    setOtpEmail(result.email);
    setSignupStep("otp");
    setOtpToken("");
    setError(null);
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.set("email", otpEmail);
    fd.set("token", otpToken);
    const result = await verifyStudentSignupOtp(fd);
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    // Email verified — we have a session now via the OTP. Sign in with
    // password too, so future logins use the password the user typed.
    const signin = await supabase.auth.signInWithPassword({
      email: otpEmail,
      password,
    });
    if (signin.error || !signin.data.user) {
      setLoading(false);
      setError(signin.error?.message ?? "Connexion échouée");
      return;
    }
    await postLoginRedirect(signin.data.user.id);
    setLoading(false);
  }

  async function handleResendOtp() {
    if (!otpEmail) return;
    setResending(true);
    setResendOk(false);
    setError(null);
    const res = await resendStudentSignupOtp(otpEmail);
    setResending(false);
    if (res.ok) setResendOk(true);
    else setError(res.error ?? "Erreur");
  }

  function resetSignup() {
    setSignupStep("form");
    setOtpToken("");
    setOtpEmail("");
    setResendOk(false);
    setError(null);
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────────
  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await requestPasswordResetOtp(forgotEmail);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForgotToken("");
    setForgotStep("otp");
  }

  async function handleForgotVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verifyPasswordResetOtp(forgotEmail, forgotToken);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForgotNewPassword("");
    setForgotStep("password");
  }

  async function handleForgotSet(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await setNewPasswordAfterReset(forgotNewPassword);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForgotStep("done");
    // User is already signed in from the OTP verification. Redirect.
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 800);
  }

  function resetForgot() {
    setMode("login");
    setForgotStep("email");
    setForgotEmail("");
    setForgotToken("");
    setForgotNewPassword("");
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-6 pb-8 safe-top safe-bottom">
      <Link
        href="/"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {/* Hero block — matches the dashboard's gradient identity. */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 text-white shadow-tile animate-slide-up">
        <span
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <SchoolIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Madrasati
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenue</h1>
          </div>
        </div>
        <p className="relative mt-3 text-sm leading-relaxed text-white/85">
          Suivez la scolarité de vos enfants, communiquez avec l&apos;école,
          gérez paiements, devoirs et bien plus.
        </p>
        <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          <Sparkles className="h-3 w-3" />
          Tout en un seul endroit
        </div>
      </section>

      {mode !== "forgot" && (
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-soft"
                : "text-slate-500"
            }`}
          >
            <LogIn className="h-4 w-4" /> Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("code");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
              mode === "code"
                ? "bg-white text-slate-900 shadow-soft"
                : "text-slate-500"
            }`}
          >
            <KeyRound className="h-4 w-4" /> Code élève
          </button>
        </div>
      )}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setForgotEmail(email);
              setForgotStep("email");
              setError(null);
            }}
            className="block w-full text-center text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </form>
      ) : mode === "forgot" ? (
        <ForgotPasswordSection
          step={forgotStep}
          email={forgotEmail}
          setEmail={setForgotEmail}
          token={forgotToken}
          setToken={setForgotToken}
          newPassword={forgotNewPassword}
          setNewPassword={setForgotNewPassword}
          loading={loading}
          error={error}
          onRequest={handleForgotRequest}
          onVerify={handleForgotVerify}
          onSet={handleForgotSet}
          onBackToLogin={resetForgot}
        />
      ) : signupStep === "form" ? (
        <form onSubmit={handleCodeSignup} className="mt-6 space-y-4">
          <div>
            <label className="label">Code élève</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input tracking-[0.3em] font-mono uppercase"
              placeholder="ABC1234"
              maxLength={10}
            />
            <p className="mt-1 text-xs text-slate-500">
              Code fourni par votre directeur d&apos;école.
            </p>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="eleve@exemple.com"
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="min. 6 caractères"
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Recevoir le code par email
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Un code à 6 chiffres vous sera envoyé pour vérifier votre email.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
          <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">Vérifiez votre email</p>
            <p className="mt-1 text-xs">
              Nous avons envoyé un code à 6 chiffres à{" "}
              <span className="font-mono">{otpEmail}</span>. Saisissez-le pour
              activer votre compte.
            </p>
            <p className="mt-2 text-[10px] text-brand-800/70">
              Pas de code reçu ? Vérifiez vos spams. Vous recevez un lien au lieu
              d&apos;un code ? Le template email Supabase doit utiliser
              <span className="font-mono"> {"{{ .Token }}"} </span>.
            </p>
          </div>
          <div>
            <label className="label">Code reçu par email</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otpToken}
              onChange={(e) =>
                setOtpToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="input text-center tracking-[0.5em] font-mono text-lg"
              placeholder="123456"
              maxLength={6}
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          {resendOk && !error && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Code renvoyé. Vérifiez votre boîte de réception.
            </div>
          )}
          <button
            type="submit"
            disabled={loading || otpToken.length < 6}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Vérifier et créer le compte
          </button>
          <div className="flex items-center justify-between gap-3 pt-1 text-xs">
            <button
              type="button"
              onClick={resetSignup}
              className="font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Modifier l&apos;email
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="font-medium text-brand-700 underline-offset-2 hover:underline disabled:opacity-60"
            >
              {resending ? "Envoi…" : "Renvoyer le code"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ForgotPasswordSection({
  step,
  email,
  setEmail,
  token,
  setToken,
  newPassword,
  setNewPassword,
  loading,
  error,
  onRequest,
  onVerify,
  onSet,
  onBackToLogin,
}: {
  step: ForgotStep;
  email: string;
  setEmail: (v: string) => void;
  token: string;
  setToken: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  onRequest: (e: React.FormEvent) => void;
  onVerify: (e: React.FormEvent) => void;
  onSet: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
        <p className="font-semibold">Réinitialisation du mot de passe</p>
        <p className="mt-1 text-xs">
          {step === "email" &&
            "Entrez l'email de votre compte. Nous vous enverrons un code à 6 chiffres."}
          {step === "otp" &&
            "Entrez le code à 6 chiffres reçu par email pour confirmer votre identité."}
          {step === "password" &&
            "Choisissez votre nouveau mot de passe."}
          {step === "done" && "Mot de passe modifié. Redirection…"}
        </p>
      </div>

      {step === "email" && (
        <form onSubmit={onRequest} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="vous@exemple.com"
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer le code
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={onVerify} className="space-y-3">
          <div>
            <label className="label">Code reçu</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={token}
              onChange={(e) =>
                setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="input text-center tracking-[0.5em] font-mono text-lg"
              placeholder="123456"
              maxLength={6}
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            type="submit"
            disabled={loading || token.length < 6}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Vérifier
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onSet} className="space-y-3">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="min. 6 caractères"
            />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button
            type="submit"
            disabled={loading || newPassword.length < 6}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Définir le mot de passe
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Mot de passe modifié. Vous êtes connecté.
        </div>
      )}

      <button
        type="button"
        onClick={onBackToLogin}
        className="block w-full text-center text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
      >
        Retour à la connexion
      </button>
    </div>
  );
}

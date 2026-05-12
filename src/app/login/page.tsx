"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { redeemCodeAndCreateAccount } from "@/app/actions/signup";

type Mode = "login" | "code";

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
    const result = await redeemCodeAndCreateAccount(fd);
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? "Erreur");
      return;
    }
    const signin = await supabase.auth.signInWithPassword({ email, password });
    if (signin.error || !signin.data.user) {
      setLoading(false);
      setError(signin.error?.message ?? "Connexion échouée");
      return;
    }
    await postLoginRedirect(signin.data.user.id);
    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-6 pb-8 safe-top safe-bottom">
      <Link
        href="/"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-slate-100 text-slate-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mt-10 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Madrasati</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
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
        </form>
      ) : (
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
            Créer mon compte
          </button>
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

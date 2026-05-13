"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Next.js error boundary for the authenticated app routes.
 *
 * Any server-component throw under (app)/ now renders this instead of the
 * default "Application error: server-side exception (digest …)" screen.
 * The user gets a clean message and a one-tap retry button.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Bubbles into Vercel logs so we can correlate `digest` with a real cause.
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-slate-900">
        Quelque chose s&apos;est mal passé
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Une erreur est survenue lors du chargement de cette page.
        Réessayez — si le problème persiste, déconnectez-vous puis
        reconnectez-vous.
      </p>
      {error.digest && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-1 font-mono text-[10px] text-slate-500">
          ref: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="btn-primary mt-8 w-full"
      >
        <RotateCcw className="h-4 w-4" />
        Réessayer
      </button>
      <a
        href="/dashboard"
        className="mt-3 text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
      >
        Retour à l&apos;accueil
      </a>
    </div>
  );
}

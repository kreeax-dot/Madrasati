import Link from "next/link";
import { GraduationCap, MessagesSquare, Wallet, CalendarRange } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-8 safe-top safe-bottom">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Madrasati</span>
      </div>

      <div className="mt-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          L&apos;école au creux de votre main.
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Suivez les paiements, l&apos;emploi du temps et les messages — simple,
          rapide, gratuit.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <Feature icon={<Wallet className="h-5 w-5" />} label="Paiements" />
        <Feature icon={<MessagesSquare className="h-5 w-5" />} label="Messages" />
        <Feature icon={<CalendarRange className="h-5 w-5" />} label="Emploi du temps" />
        <Feature icon={<GraduationCap className="h-5 w-5" />} label="Élèves" />
      </div>

      <div className="mt-auto pt-10 space-y-3">
        <Link href="/login" className="btn-primary w-full">
          Se connecter
        </Link>
        <p className="text-center text-xs text-slate-500">
          Aucune installation requise — ajoutez à l&apos;écran d&apos;accueil.
        </p>
      </div>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

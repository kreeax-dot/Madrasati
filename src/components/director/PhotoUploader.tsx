"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Plus } from "lucide-react";
import { uploadPhoto } from "@/app/actions/director";

type Cls = { id: string; name: string };
type Student = { id: string; full_name: string };

export function PhotoUploader({
  classes,
  students,
}: {
  classes: Cls[];
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"class" | "individual">("class");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.reset();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("scope", scope);
    startTransition(async () => {
      try {
        await uploadPhoto(fd);
        reset();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        Ajouter une photo
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setScope("class")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            scope === "class"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Photo de classe
        </button>
        <button
          type="button"
          onClick={() => setScope("individual")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            scope === "individual"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Photo individuelle
        </button>
      </div>

      {scope === "class" ? (
        <div>
          <label className="label">Classe</label>
          <select name="class_id" required className="input">
            {classes.length === 0 && <option value="">— Aucune classe —</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="label">Élève</label>
          <select name="student_id" required className="input">
            {students.length === 0 && <option value="">— Aucun élève —</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Image</label>
        <label
          htmlFor="photo-input"
          className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Choisir une image</span>
            </div>
          )}
        </label>
        <input
          id="photo-input"
          ref={fileRef}
          type="file"
          name="photo"
          accept="image/*"
          required
          className="hidden"
          onChange={onPick}
        />
      </div>

      <div>
        <label className="label">Légende</label>
        <input name="caption" className="input" placeholder="Sortie scolaire…" />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="btn-ghost"
        >
          Annuler
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Publier
        </button>
      </div>
    </form>
  );
}

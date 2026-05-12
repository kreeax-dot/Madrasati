"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { initials as initialsOf } from "@/lib/utils";
import { removeStudentAvatar, updateStudentAvatar } from "@/app/actions/director";

export function StudentAvatarEditor({
  studentId,
  fullName,
  avatarUrl,
}: {
  studentId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const preview = URL.createObjectURL(file);
    setOptimistic(preview);

    const fd = new FormData();
    fd.set("student_id", studentId);
    fd.set("avatar", file);
    startTransition(async () => {
      try {
        await updateStudentAvatar(fd);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
        setOptimistic(avatarUrl);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function remove() {
    setError(null);
    setOptimistic(null);
    startTransition(async () => {
      try {
        await removeStudentAvatar(studentId);
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
        setOptimistic(avatarUrl);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pick}
        disabled={pending}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white shadow-soft"
        aria-label="Changer la photo"
      >
        {optimistic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={optimistic} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50 text-lg font-bold text-brand-700">
            {initialsOf(fullName)}
          </div>
        )}
        <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/50 py-0.5 text-[9px] font-medium text-white">
          {pending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Camera className="h-2.5 w-2.5" />}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <div className="min-w-0 flex-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={pending}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            {optimistic ? "Changer" : "Ajouter"} la photo
          </button>
          {optimistic && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
            >
              <Trash2 className="h-3 w-3" />
              Retirer
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

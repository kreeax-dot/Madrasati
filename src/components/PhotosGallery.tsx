"use client";

import { useState, useTransition } from "react";
import { Images, Trash2, X } from "lucide-react";
import { deletePhoto } from "@/app/actions/director";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  class_id: string | null;
  student_id: string | null;
  created_at: string;
  classes?: { name: string } | null;
  students?: { full_name: string } | null;
};

export function PhotosGallery({
  classPhotos,
  individualPhotos,
  canDelete,
}: {
  classPhotos: Photo[];
  individualPhotos: Photo[];
  canDelete: boolean;
}) {
  const [tab, setTab] = useState<"class" | "individual">("class");
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function onDelete(id: string) {
    setDeleted((s) => new Set(s).add(id));
    if (lightbox?.id === id) setLightbox(null);
    startTransition(async () => {
      await deletePhoto(id);
    });
  }

  const cls = classPhotos.filter((p) => !deleted.has(p.id));
  const ind = individualPhotos.filter((p) => !deleted.has(p.id));
  const items = tab === "class" ? cls : ind;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("class")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "class"
              ? "bg-white text-slate-900 shadow-soft"
              : "text-slate-500"
          }`}
        >
          Photos de classe
          <span className="ml-1 text-xs text-slate-400">({cls.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("individual")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "individual"
              ? "bg-white text-slate-900 shadow-soft"
              : "text-slate-500"
          }`}
        >
          Mes photos
          <span className="ml-1 text-xs text-slate-400">({ind.length})</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
          <Images className="h-6 w-6" />
          <p className="text-sm">Aucune photo.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <li key={p.id} className="card overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setLightbox(p)}
                className="block w-full"
                aria-label={p.caption ?? "Photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? ""}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  {p.caption && (
                    <p className="truncate text-xs font-medium text-slate-700">
                      {p.caption}
                    </p>
                  )}
                  <p className="truncate text-[10px] text-slate-400">
                    {tab === "class"
                      ? p.classes?.name ?? "Classe"
                      : p.students?.full_name ?? "Élève"}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.caption ?? ""}
            className="max-h-[80dvh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

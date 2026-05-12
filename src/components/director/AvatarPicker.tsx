"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { initials as initialsOf } from "@/lib/utils";

export function AvatarPicker({
  name,
  fullName = "",
  defaultUrl = null,
  size = 96,
}: {
  name: string;
  fullName?: string;
  defaultUrl?: string | null;
  size?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaultUrl);
  const [cleared, setCleared] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setCleared(false);
  }

  function clear() {
    if (ref.current) ref.current.value = "";
    setPreview(null);
    setCleared(true);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-soft"
        style={{ width: size, height: size }}
        aria-label="Choisir une photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50 text-lg font-bold text-brand-700">
            {fullName ? initialsOf(fullName) : <Camera className="h-6 w-6" />}
          </div>
        )}
        <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/50 py-1 text-[10px] font-medium text-white">
          <ImagePlus className="h-3 w-3" />
          Photo
        </span>
      </button>
      <input
        ref={ref}
        type="file"
        name={name}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      <div className="text-xs text-slate-500 space-y-1">
        <p>JPG / PNG / WebP</p>
        {preview && !cleared && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-red-600"
          >
            <X className="h-3 w-3" />
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}

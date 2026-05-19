"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Megaphone, Plus, Send, X } from "lucide-react";
import { createAnnouncement } from "@/app/actions/director";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export function AnnouncementComposer() {
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await createAnnouncement(fd);
        if (res.ok) {
          setSuccess(true);
          (e.target as HTMLFormElement).reset();
          router.refresh();
          setTimeout(close, 800);
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full"
      >
        <Plus className="h-4 w-4" />
        {t("page.announcements.newCta")}
      </button>

      {open && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-card safe-bottom">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {t("page.announcements.composeTitle")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("page.announcements.composeHint")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="label">
                  {t("page.announcements.fieldTitle")}
                </label>
                <input
                  name="title"
                  required
                  className="input"
                  placeholder={t("page.announcements.titlePlaceholder")}
                  maxLength={120}
                />
              </div>

              <div>
                <label className="label">
                  {t("page.announcements.fieldBody")}
                </label>
                <textarea
                  name="body"
                  required
                  rows={5}
                  className="input resize-none"
                  placeholder={t("page.announcements.bodyPlaceholder")}
                  maxLength={4000}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}
              {success && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {t("page.announcements.published")}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t("page.announcements.publish")}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

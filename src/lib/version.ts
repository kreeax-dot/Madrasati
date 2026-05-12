// Bump APP_VERSION on every feature release. The version badge in the UI
// renders this string + the short git SHA from Vercel so a screenshot is
// enough to know which build is live.
//
//   v7  — delete school, director messaging, payments split, hard logout
//   v6  — school integrity repair (is_active default, orphan directors UI)
//   v5  — exams, rattrapages, photos, student avatars, class delete
//   v4  — app header, notifications, color identity, canteen
//   v3  — student codes, homework, search/filter
//
// Vercel sets VERCEL_GIT_COMMIT_SHA at build time for every deployment. We
// expose it as NEXT_PUBLIC_* via next.config (or fall back if running locally).
export const APP_VERSION = "v7";

export const APP_BUILD_SHA =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export const APP_BUILD_LABEL = `${APP_VERSION} · ${APP_BUILD_SHA}`;

// Bump APP_VERSION on every feature release. The version badge in the UI
// renders this string + the short git SHA from Vercel so a screenshot is
// enough to know which build is live.
//
//   v17 — fix PGRST205 on messages: migration v10 creates the table + RLS
//         + realtime; sendReply action lets student/parent reply to a
//         received message; MessagesInbox renders a Reply box on each
//         received message
//   v16 — full Arabic i18n with RTL (cookie-based locale, server-side `st()`
//         helper, ~150-key dictionary), email OTP signup (2-phase: send →
//         verify), sendMessage rewritten with structured-error contract +
//         search-by-name in the composer
//   v15 — fix root cause: PGRST205 on student_codes. Migration v9 (re)creates
//         the table + RLS; createStudent now rolls back the student row if
//         code generation fails unrecoverably → no orphan students
//   v14 — fix root cause: PGRST204 on students.avatar_url. Migration v8
//         adds the column; createStudent decoupled (phase 1 inserts the
//         row without avatar_url, phase 3 attaches the avatar as a
//         best-effort UPDATE that can never fail student creation)
//   v13 — DEBUG MODE: createStudent never throws, returns {ok,error,step,
//         details}; NewStudentForm surfaces the real Supabase error to the
//         director instead of the opaque "Server Components render" digest;
//         visible AR/FR toggle pinned in the header
//   v12 — admin client safety-net fallback, markAllNotificationsRead clears
//         DB, FR/AR i18n with RTL switch, file inputs accept gallery
//   v11 — student creation hard fix (admin client for ALL writes), notif
//         bell via React portal (escape parent containing-blocks), header
//         identity strip only on /dashboard, all emojis removed
//   v10 — design system applied to ALL pages (TopBar accent+icon), students
//         list uses admin client (no more empty for directors), notif panel
//         re-positioned with direct fixed + dvh fallback, login hero block
//   v9  — UI redesign: notif panel positioning fix, vibrant tile cards
//         with decorative blobs, hero greeting block, floating bottom nav
//   v8  — render-safe queries (FK-join crash fixed), bell stuck fix +
//         per-user lastSeen, /remedials director creator, app error boundary
//   v7  — delete school, director messaging, payments split, hard logout
//   v6  — school integrity repair (is_active default, orphan directors UI)
//   v5  — exams, rattrapages, photos, student avatars, class delete
//   v4  — app header, notifications, color identity, canteen
//   v3  — student codes, homework, search/filter
//
// Vercel sets VERCEL_GIT_COMMIT_SHA at build time for every deployment. We
// expose it as NEXT_PUBLIC_* via next.config (or fall back if running locally).
export const APP_VERSION = "v17";

export const APP_BUILD_SHA =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export const APP_BUILD_LABEL = `${APP_VERSION} · ${APP_BUILD_SHA}`;

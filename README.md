# Madrasati — School Manager (PWA)

Mobile-first PWA for private schools and daycares in Algeria. Built with Next.js 14, Supabase, and Tailwind. Deploys free on Vercel.

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + lucide-react icons
- **Supabase** — Postgres, Auth, RLS
- **PWA** — manifest + service worker (installable, offline cache)

## 1. Run locally

```bash
npm install
cp .env.local.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3000

## 2. Set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com)
2. Project Settings → API → copy `URL` and `anon` key into `.env.local`
3. SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql)
4. SQL Editor → run each migration in order: [`migration_v2.sql`](supabase/migration_v2.sql), [`migration_v3.sql`](supabase/migration_v3.sql), [`migration_v4.sql`](supabase/migration_v4.sql), [`migration_v5.sql`](supabase/migration_v5.sql) (exams, rattrapages, photos, profile pictures, class delete safety, storage buckets), **[`migration_v6.sql`](supabase/migration_v6.sql)** (school integrity repair: ensures `is_active` + `features` defaults, fixes orphan-director FK behavior). Migrations are idempotent — safe to re-run if unsure.
5. Authentication → Users → Invite a user (e.g. `director@demo.com`, set a password)
6. SQL Editor → run [`supabase/seed.sql`](supabase/seed.sql) (creates a demo school + students + payments tied to that user)

> ⚠️ If you upgraded from an earlier version, you **must** run `migration_v5.sql` once before exams / rattrapages / photos / class delete will work. The director UI shows a banner if the migration is missing.

## 3. Test on your phone

- Same Wi-Fi: open `http://<your-pc-ip>:3000` from your phone
- Chrome on Android → menu → "Add to Home Screen" → it installs as an app

## 4. Deploy to Vercel

```bash
# push to GitHub
git remote add origin git@github.com:<you>/madrasati.git
git push -u origin master
```

Then on [vercel.com](https://vercel.com): **New Project** → import the repo → add the same env vars → Deploy.

### Auto-deploy + cache hygiene

- Vercel connects to GitHub and **redeploys on every push to the production branch** (default: `main`). Confirm in *Vercel → Settings → Git → Production Branch*.
- The visible badge in the header (e.g. `v5 · a1b2c3d`) renders `APP_VERSION` from [`src/lib/version.ts`](src/lib/version.ts) plus `VERCEL_GIT_COMMIT_SHA` injected at build time. If the badge SHA matches the latest commit on `main`, the running build is current.
- Required env vars on Vercel (Project → Settings → Environment Variables, **Production + Preview**):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_GIT_COMMIT_SHA` is set automatically by Vercel — do not configure it manually.
- **Bump `APP_VERSION` in `src/lib/version.ts` whenever a release ships** so installed PWAs show the new label.

### Service worker / PWA cache

The service worker uses a deploy-safe strategy: navigation requests (HTML) and Next.js RSC payloads are **network-first**; only content-hashed assets under `/_next/static/*`, `/icons/*`, and `/manifest.json` are cached. On activation, prior-version caches are dropped and clients reload once via `controllerchange` — so a new deploy lands within seconds of opening the PWA, not after multiple manual reloads.

If a user is somehow stuck on an old build:
1. Open the app — the new SW installs within a few seconds and triggers a single reload.
2. As a last-resort manual purge: DevTools → Application → Service Workers → *Unregister* → reload.

## Project structure

```
src/
  app/
    layout.tsx              root + PWA registration
    page.tsx                landing
    login/page.tsx          auth
    (app)/
      layout.tsx            requires auth, renders bottom nav
      dashboard/page.tsx
      students/page.tsx
      payments/page.tsx
      messages/page.tsx
  components/
    nav/BottomNav.tsx
    nav/TopBar.tsx
    PWARegister.tsx
  lib/
    supabase/{client,server,middleware}.ts
    utils.ts
  middleware.ts             session refresh + auth gate
  types/database.ts
public/
  manifest.json
  sw.js
  icons/{icon-192,icon-512}.svg
supabase/
  schema.sql                tables + RLS policies + signup trigger
  seed.sql                  demo data
```

## Roles

- `super_admin` — manages all schools, creates directors
- `director` — full access to their school's data only
- `parent` — sees only their own children
- `student` — sees only their own data

Isolation is enforced at the database via RLS, not in app code.

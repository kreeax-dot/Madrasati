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
4. Authentication → Users → Invite a user (e.g. `director@demo.com`, set a password)
5. SQL Editor → run [`supabase/seed.sql`](supabase/seed.sql) (creates a demo school + students + payments tied to that user)

## 3. Test on your phone

- Same Wi-Fi: open `http://<your-pc-ip>:3000` from your phone
- Chrome on Android → menu → "Add to Home Screen" → it installs as an app

## 4. Deploy to Vercel

```bash
# push to GitHub
git remote add origin git@github.com:<you>/madrasati.git
git push -u origin master
```

Then on [vercel.com](https://vercel.com): **New Project** → import the repo → add the same env vars → Deploy. Done.

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

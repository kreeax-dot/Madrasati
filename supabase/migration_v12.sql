-- Madrasati v12: school-wide announcements. Idempotent.
--
-- A director publishes ONE announcement per row; everyone in the same
-- school (directors, students, parents) can read it. There is no
-- per-recipient row (unlike messages) — that's the whole point of an
-- announcement vs a 1-to-1 message.

create extension if not exists "uuid-ossp";

-- ─── 1. TABLE ────────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── 2. INDEXES ──────────────────────────────────────────────────────────────
create index if not exists idx_announcements_school   on public.announcements(school_id);
create index if not exists idx_announcements_created  on public.announcements(created_at desc);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
alter table public.announcements enable row level security;

-- SELECT: anyone in the same school can read.
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements for select
  using (
    public.is_super_admin()
    or school_id = public.current_school_id()
    or exists (
      select 1 from public.students s
      where s.school_id = announcements.school_id
        and (
          s.parent_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.student_id = s.id
          )
        )
    )
  );

-- WRITE (insert / update / delete): director of the school only.
drop policy if exists "announcements_director_write" on public.announcements;
create policy "announcements_director_write" on public.announcements for all
  using (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  )
  with check (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  );

-- ─── 4. REALTIME PUBLICATION ─────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null; end $$;

-- ─── 5. RELOAD POSTGREST SCHEMA CACHE ────────────────────────────────────────
notify pgrst, 'reload schema';

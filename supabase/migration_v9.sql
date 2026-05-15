-- Madrasati v9: re-create student_codes if missing. Idempotent.
--
-- Symptom this fixes:
--   PGRST205: Could not find the table 'public.student_codes' in the
--   schema cache. Hits at student creation time, after the row itself
--   was already inserted, leaving the new student without a signup code.
--
-- Safe to re-run: every statement uses `if not exists` / `drop ... if exists`.

create extension if not exists "uuid-ossp";

-- ─── 1. TABLE ────────────────────────────────────────────────────────────────
create table if not exists public.student_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  student_id  uuid not null references public.students(id) on delete cascade,
  school_id   uuid not null references public.schools(id) on delete cascade,
  expires_at  timestamptz,
  used_at     timestamptz,
  used_by     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── 2. INDEXES ──────────────────────────────────────────────────────────────
create index if not exists idx_student_codes_code
  on public.student_codes(code) where used_at is null;
create index if not exists idx_student_codes_student
  on public.student_codes(student_id);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
alter table public.student_codes enable row level security;

drop policy if exists "student_codes_director" on public.student_codes;
create policy "student_codes_director" on public.student_codes for all
  using (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  )
  with check (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  );

-- ─── 4. RELOAD POSTGREST SCHEMA CACHE ────────────────────────────────────────
notify pgrst, 'reload schema';

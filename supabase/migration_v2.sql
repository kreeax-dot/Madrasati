-- Madrasati v2 migration. Safe to run multiple times.
-- Run in Supabase SQL Editor.

-- ─── 1. CLEAN UP BROKEN SIGNUP TRIGGER ───────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists handle_new_user() cascade;

-- ─── 2. PROFILES: ALLOW SELF-INSERT ──────────────────────────────────────────
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles for insert
  with check (id = auth.uid());

-- ─── 3. SCHOOLS: features flags + active flag ────────────────────────────────
alter table schools
  add column if not exists features jsonb not null default '{
    "payments": true,
    "messages": true,
    "absences": true,
    "schedule": true
  }'::jsonb;

alter table schools
  add column if not exists is_active boolean not null default true;

-- ─── 4. CLASSES ──────────────────────────────────────────────────────────────
create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  level text,
  created_at timestamptz not null default now()
);
create index if not exists idx_classes_school on classes(school_id);

-- ─── 5. STUDENTS: link to class ──────────────────────────────────────────────
alter table students
  add column if not exists class_id uuid references classes(id) on delete set null;
create index if not exists idx_students_class on students(class_id);

-- ─── 6. SCHEDULES (class-based) ──────────────────────────────────────────────
create table if not exists schedules (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  teacher text,
  room text,
  created_at timestamptz not null default now()
);
create index if not exists idx_schedules_class on schedules(class_id);
create index if not exists idx_schedules_school on schedules(school_id);

-- ─── 7. ABSENCES ─────────────────────────────────────────────────────────────
create table if not exists absences (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  reason text,
  justified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_absences_student on absences(student_id);
create index if not exists idx_absences_school on absences(school_id);

-- ─── 8. RLS ──────────────────────────────────────────────────────────────────
alter table classes   enable row level security;
alter table schedules enable row level security;
alter table absences  enable row level security;

-- classes
drop policy if exists "classes_select" on classes;
create policy "classes_select" on classes for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = classes.id and s.parent_id = auth.uid()
    )
  );

drop policy if exists "classes_director_write" on classes;
create policy "classes_director_write" on classes for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- schedules
drop policy if exists "schedules_select" on schedules;
create policy "schedules_select" on schedules for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = schedules.class_id and s.parent_id = auth.uid()
    )
  );

drop policy if exists "schedules_director_write" on schedules;
create policy "schedules_director_write" on schedules for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- absences
drop policy if exists "absences_select" on absences;
create policy "absences_select" on absences for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.id = absences.student_id and s.parent_id = auth.uid()
    )
  );

drop policy if exists "absences_director_write" on absences;
create policy "absences_director_write" on absences for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 9. SUPER ADMIN BOOTSTRAP ────────────────────────────────────────────────
-- Replace 'your-email@example.com' with your real email, then re-run JUST this
-- block. The user must already exist in Authentication → Users.
-- (Comment out if you've already done this.)
--
-- update public.profiles
--    set role = 'super_admin', school_id = null, full_name = 'Super Admin'
--  where email = 'your-email@example.com';

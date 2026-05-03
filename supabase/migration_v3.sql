-- Madrasati v3 migration. Idempotent.
-- Run in Supabase SQL Editor.

-- ─── 1. STUDENT CODES (one-time signup codes) ────────────────────────────────
create table if not exists student_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  student_id  uuid not null references students(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  expires_at  timestamptz,
  used_at     timestamptz,
  used_by     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_student_codes_code   on student_codes(code) where used_at is null;
create index if not exists idx_student_codes_student on student_codes(student_id);

alter table student_codes enable row level security;

drop policy if exists "student_codes_director" on student_codes;
create policy "student_codes_director" on student_codes for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 2. HOMEWORK (class-based) ───────────────────────────────────────────────
create table if not exists homework (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  subject     text not null,
  title       text not null,
  description text,
  due_date    date not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_homework_class on homework(class_id);
create index if not exists idx_homework_due   on homework(due_date);

alter table homework enable row level security;

-- ─── 3. PROFILES: link to a student record (for student accounts) ────────────
alter table profiles
  add column if not exists student_id uuid references students(id) on delete set null;
create index if not exists idx_profiles_student on profiles(student_id);

-- ─── 4. UPDATED RLS POLICIES (student account aware) ─────────────────────────
-- Students table
drop policy if exists "students_select" on students;
create policy "students_select" on students for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or parent_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.student_id = students.id
    )
  );

-- Classes
drop policy if exists "classes_select" on classes;
create policy "classes_select" on classes for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = classes.id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

-- Schedules
drop policy if exists "schedules_select" on schedules;
create policy "schedules_select" on schedules for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = schedules.class_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

-- Payments
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.id = payments.student_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

-- Absences
drop policy if exists "absences_select" on absences;
create policy "absences_select" on absences for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.id = absences.student_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

-- Homework
drop policy if exists "homework_select" on homework;
create policy "homework_select" on homework for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = homework.class_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

drop policy if exists "homework_director_write" on homework;
create policy "homework_director_write" on homework for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 5. REALTIME PUBLICATION ─────────────────────────────────────────────────
-- Allow client subscriptions on these tables.
do $$
begin
  alter publication supabase_realtime add table homework;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table schedules;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table payments;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table absences;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;

-- Madrasati schema (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('super_admin', 'director', 'parent', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

-- ─── TABLES ──────────────────────────────────────────────────────────────────
create table if not exists schools (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  phone       text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        user_role not null default 'parent',
  school_id   uuid references schools(id) on delete set null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists students (
  id            uuid primary key default uuid_generate_v4(),
  school_id     uuid not null references schools(id) on delete cascade,
  full_name     text not null,
  class_name    text,
  date_of_birth date,
  parent_id     uuid references profiles(id) on delete set null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_students_school on students(school_id);
create index if not exists idx_students_parent on students(parent_id);

create table if not exists payments (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  amount      numeric(12,2) not null,
  status      payment_status not null default 'pending',
  due_date    date not null,
  paid_at     timestamptz,
  description text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_payments_school on payments(school_id);
create index if not exists idx_payments_student on payments(student_id);

create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  school_id    uuid not null references schools(id) on delete cascade,
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid references profiles(id) on delete cascade,
  subject      text not null,
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_messages_school on messages(school_id);
create index if not exists idx_messages_recipient on messages(recipient_id);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
create or replace function current_role_value() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_school_id() returns uuid
language sql stable security definer as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table schools  enable row level security;
alter table profiles enable row level security;
alter table students enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;

-- schools
drop policy if exists "schools_select" on schools;
create policy "schools_select" on schools for select
  using (is_super_admin() or id = current_school_id());

drop policy if exists "schools_admin_write" on schools;
create policy "schools_admin_write" on schools for all
  using (is_super_admin()) with check (is_super_admin());

-- profiles
drop policy if exists "profiles_self_select" on profiles;
create policy "profiles_self_select" on profiles for select
  using (
    id = auth.uid()
    or is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin_insert" on profiles;
create policy "profiles_admin_insert" on profiles for insert
  with check (is_super_admin() or current_role_value() = 'director');

-- students
drop policy if exists "students_select" on students;
create policy "students_select" on students for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or parent_id = auth.uid()
  );

drop policy if exists "students_director_write" on students;
create policy "students_director_write" on students for all
  using (current_role_value() = 'director' and school_id = current_school_id())
  with check (current_role_value() = 'director' and school_id = current_school_id());

-- payments
drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.id = payments.student_id and s.parent_id = auth.uid()
    )
  );

drop policy if exists "payments_director_write" on payments;
create policy "payments_director_write" on payments for all
  using (current_role_value() = 'director' and school_id = current_school_id())
  with check (current_role_value() = 'director' and school_id = current_school_id());

-- messages
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    is_super_admin()
    or sender_id = auth.uid()
    or recipient_id = auth.uid()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and (school_id = current_school_id() or is_super_admin())
  );

drop policy if exists "messages_update_own" on messages;
create policy "messages_update_own" on messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

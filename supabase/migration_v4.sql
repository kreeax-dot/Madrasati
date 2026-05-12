-- Madrasati v4: canteen menus + (re)create RLS helper functions. Idempotent.

-- ─── ENUM (idempotent) ───────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('super_admin', 'director', 'parent', 'student');
exception when duplicate_object then null; end $$;

-- ─── HELPER FUNCTIONS (re-create in case they were dropped) ──────────────────
create or replace function public.current_role_value() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

grant execute on function public.current_role_value() to authenticated, anon;
grant execute on function public.current_school_id() to authenticated, anon;
grant execute on function public.is_super_admin()    to authenticated, anon;

-- ─── CANTEEN MENUS ───────────────────────────────────────────────────────────
create table if not exists canteen_menus (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references schools(id) on delete cascade,
  week_start  date not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starter     text,
  main        text,
  dessert     text,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (school_id, week_start, day_of_week)
);
create index if not exists idx_canteen_school on canteen_menus(school_id);
create index if not exists idx_canteen_week   on canteen_menus(week_start);

alter table canteen_menus enable row level security;

drop policy if exists "canteen_select" on canteen_menus;
create policy "canteen_select" on canteen_menus for select
  using (
    public.is_super_admin()
    or school_id = public.current_school_id()
    or exists (
      select 1 from public.students s
      where s.school_id = canteen_menus.school_id
        and (
          s.parent_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.student_id = s.id
          )
        )
    )
  );

drop policy if exists "canteen_director_write" on canteen_menus;
create policy "canteen_director_write" on canteen_menus for all
  using (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  )
  with check (
    public.is_super_admin()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  );

-- ─── REALTIME ────────────────────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table canteen_menus;
exception when duplicate_object then null; end $$;

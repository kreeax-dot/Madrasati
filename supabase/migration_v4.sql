-- Madrasati v4: canteen menus. Idempotent.

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
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.school_id = canteen_menus.school_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

drop policy if exists "canteen_director_write" on canteen_menus;
create policy "canteen_director_write" on canteen_menus for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- Realtime
do $$
begin
  alter publication supabase_realtime add table canteen_menus;
exception when duplicate_object then null; end $$;

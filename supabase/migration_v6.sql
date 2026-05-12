-- Madrasati v6: school integrity repair. Idempotent.
--
-- Fixes for the "0 schools, 1 director / activation crash" class of bugs:
--   • Guarantees schools.is_active exists with the correct default.
--   • Backfills any NULL is_active to true (so legacy rows are visible/active).
--   • Guarantees the FK profiles.school_id is ON DELETE SET NULL (so directors
--     survive a school delete instead of being silently removed by cascade).
--   • Logs how many orphan directors currently exist — visible in the SQL
--     Editor output so the super admin sees the impact at a glance.

-- ─── 1. SCHOOLS: is_active ──────────────────────────────────────────────────
alter table schools
  add column if not exists is_active boolean;

alter table schools
  alter column is_active set default true;

update schools
   set is_active = true
 where is_active is null;

alter table schools
  alter column is_active set not null;

-- ─── 2. SCHOOLS: features default ───────────────────────────────────────────
alter table schools
  add column if not exists features jsonb;

update schools
   set features = '{"payments": true, "messages": true, "absences": true, "schedule": true}'::jsonb
 where features is null;

alter table schools
  alter column features set default '{"payments": true, "messages": true, "absences": true, "schedule": true}'::jsonb;

alter table schools
  alter column features set not null;

-- ─── 3. PROFILES.school_id: ensure ON DELETE SET NULL ───────────────────────
-- Re-bind the FK if it has a different action (e.g. CASCADE) — keeps directors
-- when their school is deleted instead of orphan-deleting them.
do $$
declare
  fk_name text;
  cur_action char;
begin
  select tc.constraint_name, rc.delete_rule::char
    into fk_name, cur_action
    from information_schema.table_constraints tc
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
   where tc.table_name = 'profiles'
     and tc.constraint_type = 'FOREIGN KEY'
     and rc.unique_constraint_name in (
       select constraint_name from information_schema.table_constraints
        where table_name = 'schools' and constraint_type = 'PRIMARY KEY'
     )
   limit 1;

  if fk_name is not null then
    execute format('alter table profiles drop constraint %I', fk_name);
  end if;

  alter table profiles
    add constraint profiles_school_id_fkey
    foreign key (school_id) references schools(id) on delete set null;
end $$;

-- ─── 4. REPORT: orphan directors (school_id IS NULL) ────────────────────────
do $$
declare
  orphan_count int;
begin
  select count(*) into orphan_count
    from profiles
   where role = 'director' and school_id is null;
  if orphan_count > 0 then
    raise notice
      'WARNING: % orphan director(s) without a school. Reassign or delete them from /admin.',
      orphan_count;
  end if;
end $$;

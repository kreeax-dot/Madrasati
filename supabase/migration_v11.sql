-- Madrasati v11: students.is_active. Idempotent.
--
-- Enables the director to temporarily DISABLE a student (preserves all
-- data but the linked account can't log in) and re-enable later. Used by
-- the new disableStudent / enableStudent server actions in tandem with
-- Supabase Admin API's user ban.

alter table public.students
  add column if not exists is_active boolean not null default true;

create index if not exists idx_students_active on public.students(is_active);

notify pgrst, 'reload schema';

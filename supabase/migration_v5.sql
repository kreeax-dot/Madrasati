-- Madrasati v5: lock down role/profile escalation. Idempotent.
-- Run AFTER v2/v3/v4 in the Supabase SQL Editor.

-- ─── 1. Remove client-side profile insert paths ──────────────────────────────
-- Profile rows are created exclusively via the service-role admin client
-- (signup-by-code, super-admin creating directors). Authenticated end-users
-- must NEVER be able to create profile rows from the browser.
drop policy if exists "profiles_self_insert"  on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;

-- ─── 2. Prevent role / school / student-link escalation on update ────────────
-- profiles_self_update still lets users edit their own row (full_name, phone,
-- avatar_url, …) — but a trigger blocks any change to the security-critical
-- columns unless the caller is super_admin OR the postgres/service role
-- (auth.uid() is NULL when the service role runs SQL).
create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- Service role / postgres direct access: auth.uid() is NULL.
  if auth.uid() is null then
    return new;
  end if;

  select public.is_super_admin() into caller_is_admin;

  if not caller_is_admin and (
       new.role       is distinct from old.role
    or new.school_id  is distinct from old.school_id
    or new.student_id is distinct from old.student_id
  ) then
    raise exception
      'Forbidden: cannot modify role / school_id / student_id'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_profiles_no_escalation on public.profiles;
create trigger tr_profiles_no_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_escalation();

-- ─── 3. Re-affirm profiles_self_update (in case it drifted) ──────────────────
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── 4. (Optional) Clean up legacy phantom parent profiles ───────────────────
-- The previous build auto-created `role='parent', school_id=NULL` profiles
-- on first request for any auth user without a profile. Those rows are
-- meaningless and should be removed. UNCOMMENT to apply.
--
-- delete from public.profiles
--  where role = 'parent'
--    and school_id is null
--    and student_id is null;

-- ─── 5. Sanity grants (no-op if already granted) ─────────────────────────────
grant execute on function public.prevent_profile_escalation() to authenticated, anon, service_role;

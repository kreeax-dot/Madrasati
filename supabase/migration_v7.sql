-- Madrasati v7: exams, remedials (rattrapages), photos (class + individual),
-- storage buckets for avatars and photos. Idempotent.
-- Run AFTER v2/v3/v4/v5/v6.

-- ─── 1. EXAMS (class-based) ──────────────────────────────────────────────────
create table if not exists exams (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  subject     text not null,
  exam_date   date not null,
  description text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_exams_class on exams(class_id);
create index if not exists idx_exams_date  on exams(exam_date);

alter table exams enable row level security;

drop policy if exists "exams_select" on exams;
create policy "exams_select" on exams for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.class_id = exams.class_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

drop policy if exists "exams_director_write" on exams;
create policy "exams_director_write" on exams for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 2. REMEDIAL SESSIONS (RATTRAPAGES) ──────────────────────────────────────
create table if not exists remedials (
  id               uuid primary key default uuid_generate_v4(),
  school_id        uuid not null references schools(id) on delete cascade,
  student_id       uuid not null references students(id) on delete cascade,
  session_date     date not null,
  duration_minutes int not null check (duration_minutes > 0),
  reason           text,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_remedials_student on remedials(student_id);
create index if not exists idx_remedials_date    on remedials(session_date);

alter table remedials enable row level security;

drop policy if exists "remedials_select" on remedials;
create policy "remedials_select" on remedials for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or exists (
      select 1 from students s
      where s.id = remedials.student_id
        and (
          s.parent_id = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
        )
    )
  );

drop policy if exists "remedials_director_write" on remedials;
create policy "remedials_director_write" on remedials for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 3. PHOTOS (class or individual) ─────────────────────────────────────────
create table if not exists photos (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid references classes(id) on delete set null,
  student_id  uuid references students(id) on delete cascade,
  url         text not null,
  caption     text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint photos_target_check check (
    (class_id is not null and student_id is null) or
    (class_id is null and student_id is not null)
  )
);
create index if not exists idx_photos_school  on photos(school_id);
create index if not exists idx_photos_class   on photos(class_id);
create index if not exists idx_photos_student on photos(student_id);

alter table photos enable row level security;

drop policy if exists "photos_select" on photos;
create policy "photos_select" on photos for select
  using (
    is_super_admin()
    or school_id = current_school_id()
    or (
      photos.class_id is not null and exists (
        select 1 from students s
        where s.class_id = photos.class_id
          and (
            s.parent_id = auth.uid()
            or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
          )
      )
    )
    or (
      photos.student_id is not null and exists (
        select 1 from students s
        where s.id = photos.student_id
          and (
            s.parent_id = auth.uid()
            or exists (select 1 from profiles p where p.id = auth.uid() and p.student_id = s.id)
          )
      )
    )
  );

drop policy if exists "photos_director_write" on photos;
create policy "photos_director_write" on photos for all
  using (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  )
  with check (
    is_super_admin()
    or (current_role_value() = 'director' and school_id = current_school_id())
  );

-- ─── 4. STORAGE BUCKETS (public read, server-side writes) ────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Public read for both buckets (objects already public via bucket flag, but be explicit).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read" on storage.objects for select
  using (bucket_id = 'photos');

-- Director writes on storage (insert / update / delete) for both buckets,
-- scoped to the director's school via the first path segment (school_id).
drop policy if exists "avatars_director_insert" on storage.objects;
create policy "avatars_director_insert" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

drop policy if exists "avatars_director_update" on storage.objects;
create policy "avatars_director_update" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

drop policy if exists "avatars_director_delete" on storage.objects;
create policy "avatars_director_delete" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

drop policy if exists "photos_director_insert" on storage.objects;
create policy "photos_director_insert" on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

drop policy if exists "photos_director_update" on storage.objects;
create policy "photos_director_update" on storage.objects for update
  using (
    bucket_id = 'photos'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

drop policy if exists "photos_director_delete" on storage.objects;
create policy "photos_director_delete" on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (
      is_super_admin()
      or (
        current_role_value() = 'director'
        and (storage.foldername(name))[1] = current_school_id()::text
      )
    )
  );

-- ─── 5. REALTIME PUBLICATION ─────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table exams;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table remedials;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table photos;
exception when duplicate_object then null; end $$;

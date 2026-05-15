-- Madrasati v10: (re)create the messages table if missing. Idempotent.
--
-- Symptom this fixes:
--   PGRST205: Could not find the table 'public.messages' in the schema
--   cache. Director "Nouveau message" failed with this error after the
--   `messages` table was never landed in the database.

create extension if not exists "uuid-ossp";

-- ─── 1. TABLE ────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid primary key default uuid_generate_v4(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  subject      text not null,
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── 2. INDEXES ──────────────────────────────────────────────────────────────
create index if not exists idx_messages_school
  on public.messages(school_id);
create index if not exists idx_messages_recipient
  on public.messages(recipient_id);
create index if not exists idx_messages_sender
  on public.messages(sender_id);
create index if not exists idx_messages_created
  on public.messages(created_at desc);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
alter table public.messages enable row level security;

-- SELECT: user can see messages where they are sender OR recipient.
-- Director can additionally see all messages of their school.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (
    public.is_super_admin()
    or sender_id = auth.uid()
    or recipient_id = auth.uid()
    or (public.current_role_value() = 'director' and school_id = public.current_school_id())
  );

-- INSERT: caller must be the sender AND the message must belong to their
-- school (so a director can't insert into another school, and a student
-- can't impersonate someone else).
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (school_id = public.current_school_id() or public.is_super_admin())
  );

-- UPDATE: a recipient can mark their own message as read. Nothing else.
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ─── 4. REALTIME PUBLICATION ─────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ─── 5. RELOAD POSTGREST SCHEMA CACHE ────────────────────────────────────────
notify pgrst, 'reload schema';

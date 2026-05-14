-- Madrasati v8: align students table with the code's expectation that
-- `avatar_url` exists. Idempotent — safe to re-run.
--
-- Symptom this fixes:
--   "Could not find the 'avatar_url' column of 'students' in the schema cache"
--   (PGRST204) when the director tries to create a student.

-- ─── 1. ADD COLUMN IF MISSING ────────────────────────────────────────────────
alter table public.students
  add column if not exists avatar_url text;

-- ─── 2. RELOAD POSTGREST SCHEMA CACHE ────────────────────────────────────────
-- PostgREST caches the schema; after an ALTER TABLE we need to tell it to
-- re-read so the new column becomes visible without restarting the server.
notify pgrst, 'reload schema';

-- Seed data for local testing.
-- Run AFTER schema.sql, AFTER you've created at least one user via Supabase Auth.
-- Replace the email below with the email of a user you've already signed up.

do $$
declare
  v_user_id uuid;
  v_school_id uuid;
  v_student_id uuid;
begin
  select id into v_user_id from auth.users where email = 'director@demo.com' limit 1;
  if v_user_id is null then
    raise notice 'No user found for director@demo.com — sign up first, then re-run.';
    return;
  end if;

  insert into schools (name, address, phone)
  values ('École Démo Alger', '12 rue de la Liberté, Alger', '+213 555 000 000')
  returning id into v_school_id;

  update profiles
     set role = 'director', school_id = v_school_id, full_name = 'Directeur Démo'
   where id = v_user_id;

  insert into students (school_id, full_name, class_name)
  values
    (v_school_id, 'Amina Benali',  'CE1 — A'),
    (v_school_id, 'Yacine Khaled', 'CE2 — B'),
    (v_school_id, 'Nour Hamadi',   'CM1 — A')
  returning id into v_student_id;

  insert into payments (school_id, student_id, amount, status, due_date, description)
  select v_school_id, s.id, 12000, 'pending', current_date + 7, 'Frais mensuels — Mai'
    from students s where s.school_id = v_school_id;

  insert into payments (school_id, student_id, amount, status, due_date, paid_at, description)
  select v_school_id, s.id, 12000, 'paid', current_date - 25, now() - interval '20 days', 'Frais mensuels — Avril'
    from students s where s.school_id = v_school_id;

  insert into messages (school_id, sender_id, subject, body)
  values
    (v_school_id, v_user_id, 'Bienvenue sur Madrasati', 'Votre compte a été configuré avec succès.'),
    (v_school_id, v_user_id, 'Réunion parents-professeurs', 'Prévue ce vendredi à 17h.');
end $$;
